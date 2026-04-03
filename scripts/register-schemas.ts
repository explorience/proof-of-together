#!/usr/bin/env tsx
/**
 * PRUEBA Schema Registration CLI
 *
 * Registers the PRUEBA activity and governance schemas on Base.
 *
 * Usage:
 *   # Base mainnet (default)
 *   PRUEBA_BOT_PRIVATE_KEY=0x... npm run register-schemas
 *
 *   # Base Sepolia testnet
 *   PRUEBA_BOT_PRIVATE_KEY=0x... BASE_RPC=https://sepolia.base.org npm run register-schemas
 *
 * After running, copy the UIDs into your .env:
 *   PRUEBA_ACTIVITY_SCHEMA_UID=0x...
 *   PRUEBA_GOVERNANCE_SCHEMA_UID=0x...
 */

import { registerSchemas } from "../lib/schema-register.js";

const privateKey = process.env.PRUEBA_BOT_PRIVATE_KEY;
const rpc = process.env.BASE_RPC;

if (!privateKey) {
  console.error("[prueba] Error: PRUEBA_BOT_PRIVATE_KEY env var is required");
  console.error("[prueba] Usage: PRUEBA_BOT_PRIVATE_KEY=0x... npm run register-schemas");
  process.exit(1);
}

console.log("[prueba] Starting PRUEBA schema registration...");
console.log("[prueba] Network:", rpc?.includes("sepolia") ? "Base Sepolia (testnet)" : "Base Mainnet");
console.log("");

try {
  const result = await registerSchemas(privateKey, rpc);

  console.log("\n[prueba] ✅ Registration successful!");
  console.log(`[prueba] Network: Base ${result.network}`);
  console.log(`[prueba] Activity Schema UID:   ${result.activitySchema.uid}`);
  console.log(`[prueba] Governance Schema UID: ${result.governanceSchema.uid}`);

  const explorerBase = result.network === "sepolia"
    ? "https://sepolia.basescan.org/tx"
    : "https://basescan.org/tx";

  if (result.activitySchema.transactionHash !== "unknown") {
    console.log(`[prueba] Activity tx:   ${explorerBase}/${result.activitySchema.transactionHash}`);
  }
  if (result.governanceSchema.transactionHash !== "unknown") {
    console.log(`[prueba] Governance tx: ${explorerBase}/${result.governanceSchema.transactionHash}`);
  }

  process.exit(0);
} catch (err) {
  console.error("[prueba] ❌ Registration failed:", err);
  process.exit(1);
}
