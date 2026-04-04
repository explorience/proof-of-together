/**
 * PRUEBA Indexer Configuration
 * All settings resolved from environment variables with sensible defaults.
 */

export const config = {
  // Base RPC endpoint
  BASE_RPC: process.env.BASE_RPC || "https://mainnet.base.org",

  // EAS contract on Base mainnet
  EAS_CONTRACT: process.env.EAS_CONTRACT || "0x4200000000000000000000000000000000000021",

  // PRUEBA schema UIDs (set after registering on attest.org / EAS)
  ACTIVITY_SCHEMA_UID: process.env.PRUEBA_ACTIVITY_SCHEMA_UID || "",
  GOVERNANCE_SCHEMA_UID: process.env.PRUEBA_GOVERNANCE_SCHEMA_UID || "",

  // SQLite database path
  DB_PATH: process.env.DB_PATH || "./data/prueba.db",

  // REST API port
  API_PORT: parseInt(process.env.API_PORT || "3300", 10),

  // IPFS gateway for fetching metadata
  IPFS_GATEWAY: process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/",

  // How often to poll Base for new blocks (ms)
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || "5000", 10),

  // How many blocks to scan per poll iteration (avoid RPC limits)
  BLOCKS_PER_BATCH: parseInt(process.env.BLOCKS_PER_BATCH || "500", 10),

  // Block to start indexing from (0 = use last known from DB, or latest)
  START_BLOCK: parseInt(process.env.START_BLOCK || "0", 10),
} as const;

export type Config = typeof config;
