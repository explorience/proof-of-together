/**
 * PRUEBA Indexer — Entry Point
 *
 * Starts the block watcher and REST API together.
 * Handles graceful shutdown on SIGINT/SIGTERM.
 */

import { startWatcher, stopWatcher } from "./watcher.js";
import { startApi } from "./api.js";
import { getDb } from "./db.js";
import { config } from "./config.js";

// ─── Startup ──────────────────────────────────────────────────────────────

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(" PRUEBA Indexer");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  Base RPC:        ${config.BASE_RPC}`);
console.log(`  EAS Contract:    ${config.EAS_CONTRACT}`);
console.log(`  Activity Schema: ${config.ACTIVITY_SCHEMA_UID || "(not set)"}`);
console.log(`  Governance Schema: ${config.GOVERNANCE_SCHEMA_UID || "(not set)"}`);
console.log(`  DB Path:         ${config.DB_PATH}`);
console.log(`  API Port:        ${config.API_PORT}`);
console.log(`  Poll Interval:   ${config.POLL_INTERVAL_MS}ms`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Initialise DB (runs migrations)
const db = getDb();
console.log("[main] Database ready.");

// Start the REST API
const api = startApi();

// Start the block watcher
startWatcher();

// ─── Graceful shutdown ────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[main] Received ${signal} — shutting down gracefully…`);

  // 1. Stop polling new blocks
  stopWatcher();

  // 2. Stop accepting new HTTP requests
  try {
    await api.close();
    console.log("[main] API server closed.");
  } catch (err) {
    console.error("[main] Error closing API server:", err);
  }

  // 3. Close DB connection cleanly
  try {
    db.close();
    console.log("[main] Database closed.");
  } catch (err) {
    console.error("[main] Error closing database:", err);
  }

  console.log("[main] Goodbye.");
  process.exit(0);
}

process.on("SIGINT",  () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

// Handle uncaught errors without crashing
process.on("unhandledRejection", (reason) => {
  console.error("[main] Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[main] Uncaught exception:", err);
});
