# PRUEBA Indexer

An attestation indexer and REST API for the **PRUEBA protocol** (Proof of Recognized Use, Evidence-Based Attestation) on Base.

Watches for EAS `Attested` events on Base mainnet, decodes PRUEBA activity and governance attestations, fetches IPFS metadata, and exposes a read-only JSON API.

---

## Architecture

```
Base mainnet (every 5s)
       │  EAS Attested events
       ▼
  watcher.ts  ──→  IPFS (metadata fetch)
       │
       ▼
  SQLite (better-sqlite3)
       │
       ▼
   api.ts  ──→  REST API (:3300)
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- The PRUEBA schema UIDs registered on [attest.org](https://attest.org) or [EAS](https://base.easscan.org)

### Install

```bash
cd indexer
npm install
```

### Configure

Copy and edit the env file:

```bash
cp .env.example .env
```

Key variables:

| Variable | Default | Description |
|---|---|---|
| `PRUEBA_ACTIVITY_SCHEMA_UID` | _(required)_ | EAS schema UID for activity attestations |
| `PRUEBA_GOVERNANCE_SCHEMA_UID` | _(required)_ | EAS schema UID for governance attestations |
| `BASE_RPC` | `https://mainnet.base.org` | Base RPC endpoint |
| `EAS_CONTRACT` | `0x4200...0021` | EAS contract on Base |
| `DB_PATH` | `./data/prueba.db` | SQLite database path |
| `API_PORT` | `3300` | REST API port |
| `IPFS_GATEWAY` | `https://gateway.pinata.cloud/ipfs/` | IPFS HTTP gateway |
| `START_BLOCK` | `0` | Block to start from (0 = last ~100 blocks) |
| `POLL_INTERVAL_MS` | `5000` | How often to poll Base (ms) |
| `BLOCKS_PER_BATCH` | `500` | Blocks per scan iteration |

### Run

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

---

## REST API

Base URL: `http://localhost:3300`

### `GET /api/health`

Indexer health check.

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "last_block": 29481234,
    "schemas_configured": { "activity": true, "governance": true },
    "uptime_seconds": 42
  }
}
```

---

### `GET /api/communities`

All indexed communities, sorted by total sessions.

```json
{
  "ok": true,
  "data": [
    {
      "entity_id": "sarreya-sport",
      "name": "Sarreya Sport",
      "description": null,
      "created_at": 1712000000,
      "total_sessions": 24,
      "total_decisions": 3,
      "total_participants": 187
    }
  ],
  "total": 1
}
```

---

### `GET /api/communities/:entityId`

Single community by ID.

---

### `GET /api/communities/:entityId/sessions?page=1&limit=20`

Paginated activity attestations for a community.

```json
{
  "ok": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 24,
    "total_pages": 2,
    "has_next": true
  }
}
```

---

### `GET /api/communities/:entityId/decisions?page=1&limit=20`

Paginated governance attestations for a community.

---

### `GET /api/communities/:entityId/stats`

Aggregated stats for a community.

```json
{
  "ok": true,
  "data": {
    "entity_id": "sarreya-sport",
    "name": "Sarreya Sport",
    "total_sessions": 24,
    "total_decisions": 3,
    "total_participants": 187,
    "first_attestation": 1712000000
  }
}
```

---

### `GET /api/attestations/:uid`

Single attestation by EAS UID.

```json
{
  "ok": true,
  "data": {
    "uid": "0xabc...",
    "schema_type": "activity",
    "entity_id": "sarreya-sport",
    "ref_cid": "0x...",
    "timestamp": 1712000000,
    "attested_by": "0x...",
    "tx_hash": "0x...",
    "block_number": 29481234,
    "metadata": {
      "schema": "prueba-activity-v1",
      "activityType": "football",
      "participantCount": 14,
      "sessionDate": "2024-04-01"
    }
  }
}
```

---

## Data Model

### `attestations` table

| Column | Type | Description |
|---|---|---|
| `uid` | TEXT PK | EAS attestation UID |
| `schema_type` | TEXT | `activity` or `governance` |
| `entity_id` | TEXT | Community identifier |
| `ref_cid` | TEXT | IPFS CID (or keccak256 hash) |
| `timestamp` | INTEGER | Unix seconds |
| `attested_by` | TEXT | Ethereum address |
| `tx_hash` | TEXT | Transaction hash |
| `block_number` | INTEGER | Block number |
| `metadata_json` | TEXT | IPFS metadata as JSON string |

### `communities` table

| Column | Type | Description |
|---|---|---|
| `entity_id` | TEXT PK | Community identifier |
| `name` | TEXT | Facility/community name (from IPFS) |
| `description` | TEXT | Location/description (from IPFS) |
| `created_at` | INTEGER | First attestation timestamp |
| `total_sessions` | INTEGER | Total activity attestations |
| `total_decisions` | INTEGER | Total governance attestations |
| `total_participants` | INTEGER | Sum of participantCount across sessions |

---

## Related Issues

- Closes #11 — Attestation indexer
- Closes #12 — REST API for indexed data

---

## License

MIT — part of the PRUEBA protocol open-source stack.
