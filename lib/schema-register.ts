/**
 * PRUEBA EAS Schema Registration
 * Proof of Recognized Use, Evidence-Based Attestation
 *
 * Registers the two PRUEBA schemas on Base via the EAS SchemaRegistry.
 *
 * Schema Registry on Base (mainnet + Sepolia):
 *   0x4200000000000000000000000000000000000020
 *
 * Schemas:
 *   Activity:   "bytes32 entityId,bytes32 activityRef,uint64 timestamp,address attestedBy"
 *   Governance: "bytes32 entityId,bytes32 proposalRef,uint64 timestamp,address attestedBy"
 *
 * After registration, set the returned UIDs as env vars:
 *   PRUEBA_ACTIVITY_SCHEMA_UID=0x...
 *   PRUEBA_GOVERNANCE_SCHEMA_UID=0x...
 */

import { BASE_RPC, BASE_SEPOLIA_RPC } from "./eas-prueba.js";

export const SCHEMA_REGISTRY_BASE = "0x4200000000000000000000000000000000000020";

export const ACTIVITY_SCHEMA_STRING =
  "bytes32 entityId,bytes32 activityRef,uint64 timestamp,address attestedBy";

export const GOVERNANCE_SCHEMA_STRING =
  "bytes32 entityId,bytes32 proposalRef,uint64 timestamp,address attestedBy";

export interface RegisteredSchema {
  uid: string;
  schema: string;
  transactionHash: string;
}

export interface RegisterSchemasResult {
  activitySchema: RegisteredSchema;
  governanceSchema: RegisteredSchema;
  network: "mainnet" | "sepolia";
}

/**
 * Register both PRUEBA schemas on Base.
 *
 * @param privateKey  Hex private key of the registering wallet
 * @param rpc         Optional RPC URL override (defaults to Base mainnet)
 * @returns           UIDs for both registered schemas
 */
export async function registerSchemas(
  privateKey: string,
  rpc?: string
): Promise<RegisterSchemasResult> {
  const { SchemaRegistry } = await import("@ethereum-attestation-service/eas-sdk");
  const { ethers } = await import("ethers");

  const resolvedRpc = rpc || BASE_RPC;
  const network = resolvedRpc.includes("sepolia") ? "sepolia" : "mainnet";

  console.log(`[prueba] Connecting to Base ${network} at ${resolvedRpc}`);

  const provider = new ethers.JsonRpcProvider(resolvedRpc);
  const signer = new ethers.Wallet(privateKey, provider);

  console.log(`[prueba] Registering schemas from wallet: ${signer.address}`);

  const registry = new SchemaRegistry(SCHEMA_REGISTRY_BASE);
  registry.connect(signer);

  // ── Register Activity Schema ──────────────────────────────────────────────
  console.log(`[prueba] Registering activity schema: "${ACTIVITY_SCHEMA_STRING}"`);

  const activityTx = await registry.register({
    schema: ACTIVITY_SCHEMA_STRING,
    resolverAddress: ethers.ZeroAddress, // No resolver
    revocable: true,
  });

  const activityUid = await activityTx.wait();
  const activityTxHash = activityTx.tx?.hash || "unknown";

  console.log(`[prueba] ✓ Activity schema UID: ${activityUid}`);
  console.log(`[prueba]   Tx: ${activityTxHash}`);

  // ── Register Governance Schema ────────────────────────────────────────────
  console.log(`[prueba] Registering governance schema: "${GOVERNANCE_SCHEMA_STRING}"`);

  const govTx = await registry.register({
    schema: GOVERNANCE_SCHEMA_STRING,
    resolverAddress: ethers.ZeroAddress,
    revocable: true,
  });

  const govUid = await govTx.wait();
  const govTxHash = govTx.tx?.hash || "unknown";

  console.log(`[prueba] ✓ Governance schema UID: ${govUid}`);
  console.log(`[prueba]   Tx: ${govTxHash}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n[prueba] ════════════════════════════════════════");
  console.log("[prueba] Schema registration complete. Add to .env:");
  console.log(`[prueba]   PRUEBA_ACTIVITY_SCHEMA_UID=${activityUid}`);
  console.log(`[prueba]   PRUEBA_GOVERNANCE_SCHEMA_UID=${govUid}`);
  console.log("[prueba] ════════════════════════════════════════\n");

  return {
    activitySchema: {
      uid: activityUid,
      schema: ACTIVITY_SCHEMA_STRING,
      transactionHash: activityTxHash,
    },
    governanceSchema: {
      uid: govUid,
      schema: GOVERNANCE_SCHEMA_STRING,
      transactionHash: govTxHash,
    },
    network,
  };
}
