# PRUEBA Dashboard

Community attestation dashboard for the PRUEBA protocol. Displays indexed EAS attestations from Base.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (dark theme)

## Setup

```bash
cd frontend
npm install

# Point to the indexer API (default: http://localhost:3300)
export NEXT_PUBLIC_API_URL=http://localhost:3300

npm run dev    # → http://localhost:3000
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with protocol overview |
| `/communities` | Grid of indexed communities |
| `/communities/:entityId` | Community detail: stats + sessions/decisions tabs |
| `/attestations/:uid` | Full attestation detail with BaseScan/EAS/IPFS links |

## Deployment

```bash
npm run build   # produces standalone output
npm start       # production server
```

Set `NEXT_PUBLIC_API_URL` to your production indexer URL.
