# PRUEBA Deployment Guide

## Prerequisites

- Node.js 18+
- A Base RPC endpoint (default: `https://mainnet.base.org`)
- A funded wallet on Base (for schema registration and attestations)
- A Pinata account (for IPFS uploads, optional)

## 1. Schema Registration

First, register the PRUEBA schemas on Base's EAS Schema Registry:

```bash
cd /path/to/prueba-protocol

# Install dependencies
npm install

# Set your private key (needs some ETH on Base for gas)
export PRUEBA_BOT_PRIVATE_KEY=0x...

# Register schemas
npx tsx scripts/register-schemas.ts
```

Save the output schema UIDs — you'll need them for the indexer and bot.

## 2. Indexer + API

```bash
cd indexer
npm install

# Configure environment
cat > .env << EOF
BASE_RPC=https://mainnet.base.org
PRUEBA_ACTIVITY_SCHEMA_UID=0x...     # from step 1
PRUEBA_GOVERNANCE_SCHEMA_UID=0x...   # from step 1
DB_PATH=./data/prueba.db
API_PORT=3300
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
POLL_INTERVAL_MS=5000
EOF

# Start (development)
npx tsx src/index.ts

# Start (production with PM2)
pm2 start "npx tsx src/index.ts" --name prueba-indexer
```

The indexer will:
- Start polling Base from the latest block
- Index any PRUEBA attestations it finds
- Serve the REST API on port 3300

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/communities` | List all indexed communities |
| `GET /api/communities/:entityId` | Community details |
| `GET /api/communities/:entityId/sessions?page=1&limit=20` | Paginated sessions |
| `GET /api/communities/:entityId/decisions?page=1&limit=20` | Paginated decisions |
| `GET /api/communities/:entityId/stats` | Community statistics |
| `GET /api/attestations/:uid` | Single attestation detail |

## 3. Frontend Dashboard

```bash
cd frontend
npm install

# Point to indexer API
export NEXT_PUBLIC_API_URL=http://localhost:3300

# Development
npm run dev     # → http://localhost:3000

# Production build
npm run build
npm start
```

### Production with Caddy

```caddyfile
prueba.yourdomain.com {
    reverse_proxy localhost:3000
}

api.prueba.yourdomain.com {
    reverse_proxy localhost:3300
}
```

## 4. Bot Integration

The Sarreya Bot (separate deployment) connects to the pipeline:

```bash
# In the bot workspace, set environment variables:
export PRUEBA_BOT_PRIVATE_KEY=0x...
export PINATA_JWT=eyJ...
export PRUEBA_ACTIVITY_SCHEMA_UID=0x...
export PRUEBA_GOVERNANCE_SCHEMA_UID=0x...
```

The bot calls `recordSession()` and `recordDecision()` from `lib/bot-pipeline.ts`.

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PRUEBA_BOT_PRIVATE_KEY` | Yes (bot) | — | Private key for signing attestations |
| `PINATA_JWT` | No | — | Pinata JWT for IPFS uploads |
| `BASE_RPC` | No | mainnet.base.org | Base RPC endpoint |
| `PRUEBA_ACTIVITY_SCHEMA_UID` | Yes | — | Activity schema UID from registration |
| `PRUEBA_GOVERNANCE_SCHEMA_UID` | Yes | — | Governance schema UID from registration |
| `DB_PATH` | No | ./data/prueba.db | SQLite database path |
| `API_PORT` | No | 3300 | Indexer API port |
| `NEXT_PUBLIC_API_URL` | No | http://localhost:3300 | Frontend → API URL |
