/**
 * PRUEBA Indexer — SQLite Database Module
 *
 * Tables:
 *   attestations  — raw EAS attestation records
 *   communities   — derived community stats
 *   meta          — key/value store for indexer state (e.g. last_block)
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

// ─── Types ────────────────────────────────────────────────────────────────

export interface Attestation {
  uid: string;
  schema_type: "activity" | "governance";
  entity_id: string;
  ref_cid: string;           // IPFS CID (activityRef / proposalRef)
  timestamp: number;         // unix seconds
  attested_by: string;       // Ethereum address
  tx_hash: string;
  block_number: number;
  metadata_json: string | null; // JSON string fetched from IPFS
}

export interface Community {
  entity_id: string;
  name: string | null;
  description: string | null;
  created_at: number;         // unix seconds of first attestation
  total_sessions: number;
  total_decisions: number;
  total_participants: number;
}

// ─── Database singleton ───────────────────────────────────────────────────

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure data directory exists
  const dbDir = path.dirname(config.DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  _db = new Database(config.DB_PATH);
  _db.pragma("journal_mode = WAL");   // better concurrency
  _db.pragma("foreign_keys = ON");
  _db.pragma("synchronous = NORMAL");

  runMigrations(_db);
  return _db;
}

// ─── Migrations ───────────────────────────────────────────────────────────

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS attestations (
      uid           TEXT PRIMARY KEY,
      schema_type   TEXT NOT NULL CHECK (schema_type IN ('activity', 'governance')),
      entity_id     TEXT NOT NULL,
      ref_cid       TEXT NOT NULL,
      timestamp     INTEGER NOT NULL,
      attested_by   TEXT NOT NULL,
      tx_hash       TEXT NOT NULL,
      block_number  INTEGER NOT NULL,
      metadata_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_attestations_entity_id
      ON attestations(entity_id);
    CREATE INDEX IF NOT EXISTS idx_attestations_schema_type
      ON attestations(schema_type);
    CREATE INDEX IF NOT EXISTS idx_attestations_timestamp
      ON attestations(timestamp);

    CREATE TABLE IF NOT EXISTS communities (
      entity_id          TEXT PRIMARY KEY,
      name               TEXT,
      description        TEXT,
      created_at         INTEGER NOT NULL DEFAULT 0,
      total_sessions     INTEGER NOT NULL DEFAULT 0,
      total_decisions    INTEGER NOT NULL DEFAULT 0,
      total_participants INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ─── Attestation helpers ──────────────────────────────────────────────────

const insertAttestation = (db: Database.Database) =>
  db.prepare<Attestation>(`
    INSERT OR IGNORE INTO attestations
      (uid, schema_type, entity_id, ref_cid, timestamp, attested_by, tx_hash, block_number, metadata_json)
    VALUES
      (@uid, @schema_type, @entity_id, @ref_cid, @timestamp, @attested_by, @tx_hash, @block_number, @metadata_json)
  `);

const upsertCommunity = (db: Database.Database) =>
  db.prepare(`
    INSERT INTO communities (entity_id, name, description, created_at, total_sessions, total_decisions, total_participants)
    VALUES (@entity_id, @name, @description, @created_at, @total_sessions, @total_decisions, @total_participants)
    ON CONFLICT(entity_id) DO UPDATE SET
      name               = COALESCE(excluded.name, name),
      description        = COALESCE(excluded.description, description),
      total_sessions     = total_sessions + excluded.total_sessions,
      total_decisions    = total_decisions + excluded.total_decisions,
      total_participants = total_participants + excluded.total_participants
  `);

/**
 * Persist a new attestation and update community stats atomically.
 */
export function saveAttestation(att: Attestation, meta?: { name?: string; description?: string; participantCount?: number }): void {
  const db = getDb();

  const sessionDelta = att.schema_type === "activity" ? 1 : 0;
  const decisionDelta = att.schema_type === "governance" ? 1 : 0;
  const participantDelta = meta?.participantCount ?? 0;

  const txn = db.transaction(() => {
    insertAttestation(db).run(att);

    upsertCommunity(db).run({
      entity_id: att.entity_id,
      name: meta?.name ?? null,
      description: meta?.description ?? null,
      created_at: att.timestamp,
      total_sessions: sessionDelta,
      total_decisions: decisionDelta,
      total_participants: participantDelta,
    });
  });

  txn();
}

export function getAttestation(uid: string): Attestation | undefined {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db.prepare("SELECT * FROM attestations WHERE uid = ?") as any).get(uid) as Attestation | undefined;
}

export function getAttestationsByEntity(
  entityId: string,
  schemaType: "activity" | "governance",
  limit = 20,
  offset = 0
): Attestation[] {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db.prepare(
    "SELECT * FROM attestations WHERE entity_id = ? AND schema_type = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?"
  ) as any).all(entityId, schemaType, limit, offset) as Attestation[];
}

export function countAttestationsByEntity(entityId: string, schemaType: "activity" | "governance"): number {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (db.prepare(
    "SELECT COUNT(*) as count FROM attestations WHERE entity_id = ? AND schema_type = ?"
  ) as any).get(entityId, schemaType) as { count: number } | undefined;
  return row?.count ?? 0;
}

// ─── Community helpers ────────────────────────────────────────────────────

export function getAllCommunities(): Community[] {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db.prepare("SELECT * FROM communities ORDER BY total_sessions DESC") as any).all() as Community[];
}

export function getCommunity(entityId: string): Community | undefined {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db.prepare("SELECT * FROM communities WHERE entity_id = ?") as any).get(entityId) as Community | undefined;
}

// ─── Meta helpers (last_block tracking) ──────────────────────────────────

export function getMeta(key: string): string | undefined {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (db.prepare("SELECT value FROM meta WHERE key = ?") as any).get(key) as { value: string } | undefined;
  return row?.value;
}

export function setMeta(key: string, value: string): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(key, value);
}
