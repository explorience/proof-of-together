# PRUEBA

**Proof of Recognized Use, Evidence-Based Attestation**

A lightweight protocol for communities to attest that they gathered, decided, and acted — on-chain, via WhatsApp or Telegram.

## What it does

- **Activity attestations** — record that a community session happened (who, what, where, how many)
- **Governance attestations** — record that a community decision was made (what, how, outcome)
- **Social multisig** — require X community confirmations before writing on-chain (consensus without wallets)
- **Multilingual** — Somali, English, Spanish, any language

## Who it's for

Communities in the Global South who do real, valuable work but have no portable proof of it. Funders, DAOs, and grant programmes need evidence. PRUEBA provides it — without requiring wallets, crypto literacy, or English.

## Architecture

```
PRUEBA Protocol (this repo)
├── lib/eas-prueba.ts     — EAS attestation on Base
├── lib/ipfs-prueba.ts    — IPFS metadata upload
├── schemas/              — JSON metadata standards
└── docs/                 — Protocol documentation

Built on:
├── EAS (Ethereum Attestation Service) on Base
└── IPFS (via Pinata)
```

## Pilots

- **Sarreya Sport** — women's football, Hargeisa, Somaliland
- **Hoops Sagrado** — basketball, Guatemala (coming)

## Protocol Name

*Prueba* (Spanish) = proof, evidence, test. PRUEBA = Proof of Recognized Use, Evidence-Based Attestation.

## Status

🚧 Early development — pilot with Sarreya Sport in progress

## Read the PRD

[PRD.md](./PRD.md)
