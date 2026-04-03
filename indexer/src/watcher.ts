/**
 * PRUEBA Indexer — Block Watcher
 *
 * Polls Base mainnet every POLL_INTERVAL_MS, filters EAS `Attested` events
 * for PRUEBA schemas, decodes attestation data, fetches IPFS metadata,
 * and stores everything in SQLite.
 */

import { ethers } from "ethers";
import { config } from "./config.js";
import { saveAttestation, getMeta, setMeta, type Attestation } from "./db.js";

// ─── EAS ABI (minimal — only the Attested event + getAttestation) ─────────

const EAS_ABI = [
  "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schema)",
  "function getAttestation(bytes32 uid) view returns (tuple(bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address recipient, address attester, bool revocable, bytes data))",
];

// Schema ABI for decoding attestation data payloads
const ACTIVITY_SCHEMA = [
  { name: "entityId",    type: "bytes32" },
  { name: "activityRef", type: "bytes32" },
  { name: "timestamp",   type: "uint64"  },
  { name: "attestedBy",  type: "address" },
];

const GOVERNANCE_SCHEMA = [
  { name: "entityId",    type: "bytes32" },
  { name: "proposalRef", type: "bytes32" },
  { name: "timestamp",   type: "uint64"  },
  { name: "attestedBy",  type: "address" },
];

// ─── Watcher state ────────────────────────────────────────────────────────

let running = false;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let provider: ethers.JsonRpcProvider | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Decode bytes32 that was encoded as `encodeBytes32String(str)` back to a string.
 * Falls back to hex if not valid UTF-8.
 */
function decodeBytes32(hex: string): string {
  try {
    return ethers.decodeBytes32String(hex);
  } catch {
    return hex; // Return raw hex if not a valid short string
  }
}

/**
 * Fetch JSON metadata from IPFS via the configured gateway.
 * Returns null on any error so the indexer keeps running.
 */
async function fetchIpfsMetadata(cid: string): Promise<Record<string, unknown> | null> {
  if (!cid || cid === "0x" + "0".repeat(64)) return null; // empty bytes32

  // cid may be a keccak256 hash (not a real CID) — skip fetch in that case
  // Real CIDs start with Qm (CIDv0) or ba (CIDv1)
  if (!cid.startsWith("Qm") && !cid.startsWith("ba") && !cid.startsWith("b")) {
    return null;
  }

  const url = `${config.IPFS_GATEWAY}${cid}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[watcher] IPFS fetch failed for ${cid}: HTTP ${res.status}`);
      return null;
    }
    return await res.json() as Record<string, unknown>;
  } catch (err) {
    console.warn(`[watcher] IPFS fetch error for ${cid}:`, (err as Error).message);
    return null;
  }
}

/**
 * Decode raw `bytes` attestation data for Activity schema.
 * Returns decoded fields or null on error.
 */
function decodeActivityData(data: string): {
  entityId: string;
  activityRef: string;
  timestamp: number;
  attestedBy: string;
} | null {
  try {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const types = ACTIVITY_SCHEMA.map((f) => f.type);
    const decoded = abiCoder.decode(types, data);
    return {
      entityId:    decodeBytes32(decoded[0]),
      activityRef: decoded[1] as string, // bytes32 hash of CID
      timestamp:   Number(decoded[2]),
      attestedBy:  decoded[3] as string,
    };
  } catch (err) {
    console.warn("[watcher] Failed to decode activity data:", (err as Error).message);
    return null;
  }
}

/**
 * Decode raw `bytes` attestation data for Governance schema.
 */
function decodeGovernanceData(data: string): {
  entityId: string;
  proposalRef: string;
  timestamp: number;
  attestedBy: string;
} | null {
  try {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const types = GOVERNANCE_SCHEMA.map((f) => f.type);
    const decoded = abiCoder.decode(types, data);
    return {
      entityId:    decodeBytes32(decoded[0]),
      proposalRef: decoded[1] as string,
      timestamp:   Number(decoded[2]),
      attestedBy:  decoded[3] as string,
    };
  } catch (err) {
    console.warn("[watcher] Failed to decode governance data:", (err as Error).message);
    return null;
  }
}

// ─── Core polling loop ────────────────────────────────────────────────────

async function poll(): Promise<void> {
  if (!running) return;

  try {
    if (!provider) {
      provider = new ethers.JsonRpcProvider(config.BASE_RPC);
    }

    const activitySchema   = config.ACTIVITY_SCHEMA_UID;
    const governanceSchema = config.GOVERNANCE_SCHEMA_UID;

    if (!activitySchema && !governanceSchema) {
      console.warn("[watcher] No schema UIDs configured — nothing to index. Set PRUEBA_ACTIVITY_SCHEMA_UID and/or PRUEBA_GOVERNANCE_SCHEMA_UID.");
      scheduleNext();
      return;
    }

    const latestBlock = Number(await provider.getBlockNumber());

    // Determine start block
    const savedBlock = getMeta("last_block");
    let fromBlock = savedBlock
      ? parseInt(savedBlock, 10) + 1
      : config.START_BLOCK > 0
        ? config.START_BLOCK
        : latestBlock - 100; // default: last ~100 blocks on first run

    if (fromBlock > latestBlock) {
      scheduleNext();
      return;
    }

    // Cap batch size to avoid RPC limits
    const toBlock = Math.min(fromBlock + config.BLOCKS_PER_BATCH - 1, latestBlock);

    console.log(`[watcher] Scanning blocks ${fromBlock}–${toBlock} (latest: ${latestBlock})`);

    const eas = new ethers.Contract(config.EAS_CONTRACT, EAS_ABI, provider);

    // Build schema filter — watch for both schemas in one query if possible
    const schemasToWatch = [activitySchema, governanceSchema].filter(Boolean);

    for (const schemaUid of schemasToWatch) {
      if (!schemaUid) continue;

      const schemaType = schemaUid === activitySchema ? "activity" : "governance";

      // Filter: Attested(recipient, attester, uid, schema=schemaUid)
      const filter = eas.filters.Attested(null, null, null, schemaUid);

      let events: ethers.EventLog[];
      try {
        const raw = await eas.queryFilter(filter, fromBlock, toBlock);
        events = raw as ethers.EventLog[];
      } catch (err) {
        console.error(`[watcher] queryFilter error for ${schemaType}:`, (err as Error).message);
        continue;
      }

      console.log(`[watcher] Found ${events.length} ${schemaType} event(s)`);

      for (const event of events) {
        try {
          await processEvent(event, schemaType, eas);
        } catch (err) {
          console.error(`[watcher] Error processing event ${event.transactionHash}:`, err);
        }
      }
    }

    // Advance the stored last_block pointer
    setMeta("last_block", String(toBlock));
  } catch (err) {
    console.error("[watcher] Poll error:", err);
    // Reset provider on network errors so it reconnects
    provider = null;
  }

  scheduleNext();
}

async function processEvent(
  event: ethers.EventLog,
  schemaType: "activity" | "governance",
  eas: ethers.Contract
): Promise<void> {
  // uid is the 3rd indexed topic (args[2])
  const uid: string = event.args?.[2];
  if (!uid) {
    console.warn("[watcher] Event missing uid:", event);
    return;
  }

  // Fetch full attestation to get data payload
  type EasAttestation = {
    uid: string;
    schema: string;
    time: bigint;
    expirationTime: bigint;
    revocationTime: bigint;
    refUID: string;
    recipient: string;
    attester: string;
    revocable: boolean;
    data: string;
  };

  const att: EasAttestation = await eas.getAttestation(uid);

  // Skip revoked attestations
  if (att.revocationTime > 0n) {
    console.log(`[watcher] Skipping revoked attestation ${uid}`);
    return;
  }

  let entityId: string;
  let refCid: string;
  let timestamp: number;
  let attestedBy: string;
  let ipfsMeta: Record<string, unknown> | null = null;

  if (schemaType === "activity") {
    const decoded = decodeActivityData(att.data);
    if (!decoded) return;
    entityId   = decoded.entityId;
    refCid     = decoded.activityRef;
    timestamp  = decoded.timestamp;
    attestedBy = decoded.attestedBy;
  } else {
    const decoded = decodeGovernanceData(att.data);
    if (!decoded) return;
    entityId   = decoded.entityId;
    refCid     = decoded.proposalRef;
    timestamp  = decoded.timestamp;
    attestedBy = decoded.attestedBy;
  }

  // Attempt to fetch IPFS metadata (best-effort)
  ipfsMeta = await fetchIpfsMetadata(refCid);

  const record: Attestation = {
    uid,
    schema_type: schemaType,
    entity_id:   entityId,
    ref_cid:     refCid,
    timestamp,
    attested_by: attestedBy,
    tx_hash:     event.transactionHash,
    block_number: event.blockNumber,
    metadata_json: ipfsMeta ? JSON.stringify(ipfsMeta) : null,
  };

  // Extract community metadata from IPFS if available
  let communityMeta: { name?: string; description?: string; participantCount?: number } | undefined;
  if (ipfsMeta) {
    communityMeta = {
      name:             ipfsMeta.facilityName as string | undefined,
      description:      ipfsMeta.facilityLocation as string | undefined,
      participantCount: ipfsMeta.participantCount as number | undefined,
    };
  }

  saveAttestation(record, communityMeta);
  console.log(`[watcher] Saved ${schemaType} attestation ${uid} (entity: ${entityId})`);
}

function scheduleNext(): void {
  if (!running) return;
  pollTimer = setTimeout(poll, config.POLL_INTERVAL_MS);
}

// ─── Public API ───────────────────────────────────────────────────────────

export function startWatcher(): void {
  if (running) return;
  running = true;
  console.log(`[watcher] Starting — polling every ${config.POLL_INTERVAL_MS}ms`);
  // Kick off immediately
  void poll();
}

export function stopWatcher(): void {
  running = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  if (provider) {
    provider.destroy();
    provider = null;
  }
  console.log("[watcher] Stopped.");
}
