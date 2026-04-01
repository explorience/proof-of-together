/**
 * PRUEBA EAS Integration
 * Proof of Recognized Use, Evidence-Based Attestation
 *
 * Adapted from KYH (celo-kyc-gateway/lib/eas.ts) for Base chain.
 *
 * Schemas (register on Base via attest.org):
 *   Schema A - Community Activity:
 *     bytes32 entityId, bytes32 activityRef, uint64 timestamp, address attestedBy
 *
 *   Schema B - Governance Decision:
 *     bytes32 entityId, bytes32 proposalRef, uint64 timestamp, address attestedBy
 */

// Base mainnet EAS contract
export const EAS_CONTRACT_BASE = "0x4200000000000000000000000000000000000021";
export const BASE_RPC = "https://mainnet.base.org";
export const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
export const EAS_CONTRACT_BASE_SEPOLIA = "0x4200000000000000000000000000000000000021";

// Set these after registering schemas
export const ACTIVITY_SCHEMA_UID = process.env.PRUEBA_ACTIVITY_SCHEMA_UID || "";
export const GOVERNANCE_SCHEMA_UID = process.env.PRUEBA_GOVERNANCE_SCHEMA_UID || "";

export interface ActivityAttestation {
  uid: string;
  entityId: string;
  activityRef: string; // IPFS CID
  timestamp: number;
  attestedBy: string;
  transactionHash: string;
  eascanUrl: string;
  demoMode: boolean;
}

export interface GovernanceAttestation {
  uid: string;
  entityId: string;
  proposalRef: string; // IPFS CID
  timestamp: number;
  attestedBy: string;
  transactionHash: string;
  eascanUrl: string;
  demoMode: boolean;
}

function generateDemoUID(): string {
  return "0x" + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

export function isPruebaConfigured(): boolean {
  return !!(
    process.env.PRUEBA_BOT_PRIVATE_KEY &&
    process.env.PRUEBA_ACTIVITY_SCHEMA_UID &&
    process.env.PRUEBA_GOVERNANCE_SCHEMA_UID
  );
}

/**
 * Attest a community activity session on Base.
 */
export async function attestActivity(
  entityId: string,     // Community identifier (e.g. "sarreya-sport")
  activityRef: string,  // IPFS CID of activity metadata JSON
  demoMode: boolean = false
): Promise<ActivityAttestation> {
  const now = Math.floor(Date.now() / 1000);

  if (demoMode || !isPruebaConfigured()) {
    const uid = generateDemoUID();
    return {
      uid,
      entityId,
      activityRef,
      timestamp: now,
      attestedBy: "0xdemo",
      transactionHash: "0xdemo" + Math.random().toString(16).slice(2, 10),
      eascanUrl: `https://base.easscan.org/attestation/view/${uid}`,
      demoMode: true,
    };
  }

  const { EAS, SchemaEncoder } = require("@ethereum-attestation-service/eas-sdk");
  const { ethers } = require("ethers");

  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const signer = new ethers.Wallet(process.env.PRUEBA_BOT_PRIVATE_KEY!, provider);

  const eas = new EAS(EAS_CONTRACT_BASE);
  eas.connect(signer);

  const schemaEncoder = new SchemaEncoder(
    "bytes32 entityId,bytes32 activityRef,uint64 timestamp,address attestedBy"
  );

  // Convert CID string to bytes32 (truncate/pad to 32 bytes)
  const entityIdBytes = ethers.encodeBytes32String(entityId.slice(0, 31));
  // For IPFS CID (longer than 32 bytes), store as keccak256 hash of CID
  const activityRefBytes = ethers.keccak256(ethers.toUtf8Bytes(activityRef));

  const encodedData = schemaEncoder.encodeData([
    { name: "entityId", value: entityIdBytes, type: "bytes32" },
    { name: "activityRef", value: activityRefBytes, type: "bytes32" },
    { name: "timestamp", value: BigInt(now), type: "uint64" },
    { name: "attestedBy", value: signer.address, type: "address" },
  ]);

  const tx = await eas.attest({
    schema: ACTIVITY_SCHEMA_UID,
    data: {
      recipient: ethers.ZeroAddress, // No specific recipient — community attestation
      expirationTime: BigInt(0),     // No expiry
      revocable: true,
      data: encodedData,
    },
  });

  const uid = await tx.wait();
  const txHash = tx.tx?.hash || "unknown";

  return {
    uid,
    entityId,
    activityRef,
    timestamp: now,
    attestedBy: signer.address,
    transactionHash: txHash,
    eascanUrl: `https://base.easscan.org/attestation/view/${uid}`,
    demoMode: false,
  };
}

/**
 * Attest a governance decision on Base.
 */
export async function attestGovernance(
  entityId: string,    // Community identifier
  proposalRef: string, // IPFS CID of governance metadata JSON
  demoMode: boolean = false
): Promise<GovernanceAttestation> {
  const now = Math.floor(Date.now() / 1000);

  if (demoMode || !isPruebaConfigured()) {
    const uid = generateDemoUID();
    return {
      uid,
      entityId,
      proposalRef,
      timestamp: now,
      attestedBy: "0xdemo",
      transactionHash: "0xdemo" + Math.random().toString(16).slice(2, 10),
      eascanUrl: `https://base.easscan.org/attestation/view/${uid}`,
      demoMode: true,
    };
  }

  const { EAS, SchemaEncoder } = require("@ethereum-attestation-service/eas-sdk");
  const { ethers } = require("ethers");

  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const signer = new ethers.Wallet(process.env.PRUEBA_BOT_PRIVATE_KEY!, provider);

  const eas = new EAS(EAS_CONTRACT_BASE);
  eas.connect(signer);

  const schemaEncoder = new SchemaEncoder(
    "bytes32 entityId,bytes32 proposalRef,uint64 timestamp,address attestedBy"
  );

  const entityIdBytes = ethers.encodeBytes32String(entityId.slice(0, 31));
  const proposalRefBytes = ethers.keccak256(ethers.toUtf8Bytes(proposalRef));

  const encodedData = schemaEncoder.encodeData([
    { name: "entityId", value: entityIdBytes, type: "bytes32" },
    { name: "proposalRef", value: proposalRefBytes, type: "bytes32" },
    { name: "timestamp", value: BigInt(now), type: "uint64" },
    { name: "attestedBy", value: signer.address, type: "address" },
  ]);

  const tx = await eas.attest({
    schema: GOVERNANCE_SCHEMA_UID,
    data: {
      recipient: ethers.ZeroAddress,
      expirationTime: BigInt(0),
      revocable: true,
      data: encodedData,
    },
  });

  const uid = await tx.wait();
  const txHash = tx.tx?.hash || "unknown";

  return {
    uid,
    entityId,
    proposalRef,
    timestamp: now,
    attestedBy: signer.address,
    transactionHash: txHash,
    eascanUrl: `https://base.easscan.org/attestation/view/${uid}`,
    demoMode: false,
  };
}
