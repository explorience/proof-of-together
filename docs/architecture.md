# PRUEBA Architecture

## Overview

PRUEBA (Proof of Recognized Use, Evidence-Based Attestation) is an open protocol for community-verified participation records. It uses EAS (Ethereum Attestation Service) on Base for on-chain attestations, IPFS for metadata storage, and a bot-driven pipeline for community data capture.

## System Diagram

```
Community Activity
       │
       ▼
┌──────────────┐     ┌──────────┐     ┌──────────┐
│  Sarreya Bot │────▶│   IPFS   │────▶│   EAS    │
│  (Telegram)  │     │ (Pinata) │     │  (Base)  │
└──────────────┘     └──────────┘     └──────────┘
                                            │
                                            ▼
                                     ┌──────────────┐
                                     │   Indexer     │
                                     │  (SQLite +   │
                                     │   REST API)  │
                                     └──────────────┘
                                            │
                                            ▼
                                     ┌──────────────┐
                                     │  Dashboard   │
                                     │  (Next.js)   │
                                     └──────────────┘
```

## Components

### 1. Bot Pipeline (`lib/`)

The bot pipeline receives structured community data and creates permanent records:

- **Input**: Parsed session or decision data from the Telegram bot
- **Step 1**: Upload metadata to IPFS via Pinata (optional, resilient fallback)
- **Step 2**: Create EAS attestation on Base with reference to IPFS CID
- **Output**: Attestation UID + transaction hash

Two schema types:
- **Activity Schema**: `entityId`, `activityRef`, `timestamp`, `attestedBy`
- **Governance Schema**: `entityId`, `proposalRef`, `timestamp`, `attestedBy`

### 2. Indexer (`indexer/`)

Watches Base for new PRUEBA attestations and maintains a queryable database:

- **Watcher**: Polls Base every 5s, filters EAS `Attested` events for PRUEBA schemas
- **Database**: SQLite with WAL mode — attestations, communities, meta tables
- **API**: Express REST endpoints for querying communities and attestations

### 3. Frontend (`frontend/`)

Next.js 14 dashboard displaying indexed attestations:

- Community directory with stats
- Per-community session and decision history
- Individual attestation detail with links to BaseScan, EAS Scan, and IPFS

### 4. Sarreya Bot (separate repo)

Telegram bot for the Sarreya Sport community in Hargeisa, Somaliland. Captures session reports and governance decisions in natural conversation, then feeds them into the pipeline.

## On-Chain Contracts

| Contract | Address | Chain |
|----------|---------|-------|
| EAS | `0x4200000000000000000000000000000000000021` | Base |
| Schema Registry | `0x4200000000000000000000000000000000000020` | Base |

## Data Flow

1. Community member reports activity to bot (e.g., "We had 15 players today at Sarreya grounds")
2. Bot parses structured data (participants, location, date, activity type)
3. Metadata uploaded to IPFS → returns CID
4. EAS attestation created on Base with CID reference
5. Indexer picks up the attestation event
6. Dashboard displays the record
