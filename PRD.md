# Proof of Together — Protocol PRD

**Status:** Draft v0.1 — for review  
**Date:** 2026-04-01  
**Author:** Heenal Rajani + Tej  

---

## Vision

A lightweight, open protocol for communities to attest that they gathered, decided, and acted — on-chain, without wallets, via tools they already use (WhatsApp, Telegram).

The protocol answers one question: **"Did this happen?"** — and makes the answer verifiable, permanent, and useful for funding.

---

## Problem

Community organisations in the Global South (sports clubs, repair cafes, mutual aid groups) do real, valuable work. They gather. They govern. They decide. But:

- None of it is legible to funders, donors, or DAOs
- There's no portable proof of activity that travels with the community
- Existing tools (POAP, Snapshot, Gitcoin) require wallets, crypto literacy, and English
- Funders ask "how many people used the court?" and the answer is a spreadsheet, if anything

The data exists — it's just trapped in WhatsApp groups and someone's memory.

---

## Solution

**Proof of Together** is a protocol built on EAS (Ethereum Attestation Service) that lets communities attest two things:

1. **We gathered** — a community session happened (activity attestation)
2. **We decided** — a governance decision was made (governance attestation)

A WhatsApp (or Telegram) bot is the primary interface. Community organisers describe what happened in natural language. The bot creates the attestation. No wallet required for the community — the bot holds a delegated signing key.

---

## Use Cases

### Primary (Year 1)
- **Sarreya Sport** (Hargeisa, Somaliland) — women's football club, session tracking + governance
- **Hoops Sagrado** (Guatemala) — basketball court usage data to unlock second court funding
- **Repair Cafe London** — session tracking for grant reporting

### Future
- Any community sports facility worldwide
- Mutual aid networks
- Local DAOs and neighbourhood governance
- Climate/environmental action groups (complements Green Goods)

---

## Protocol Stack

```
Proof of Together (application protocol)
├── Schema A: Community Activity
├── Schema B: Governance Decision
├── Metadata Standard (JSON, off-chain)
├── Resolver Contract (optional validation)
├── Indexer (subgraph or lightweight DB)
├── REST API
├── WhatsApp/Telegram Bot Interface
└── Web Frontend (explorer + attestation UI)
         ↓
EAS (Ethereum Attestation Service)
         ↓
Base (L2, low fees)
```

---

## EAS Schemas

### Schema A: Community Activity
```solidity
bytes32 entityId      // Community identifier (ENS name, address, or custom ID)
bytes32 activityRef   // IPFS CID pointing to activity metadata JSON
uint64  timestamp     // Unix timestamp of session
address attestedBy    // Bot or trusted community member address
```

### Schema B: Governance Decision
```solidity
bytes32 entityId      // Same community identifier
bytes32 proposalRef   // IPFS CID pointing to decision metadata JSON
uint64  timestamp     // Unix timestamp of decision
address attestedBy    // Bot or trusted community member address
```

### Metadata Standard (off-chain JSON)

**Activity metadata (v1):**
```json
{
  "schema": "pot-activity-v1",
  "facilityName": "string",
  "facilityLocation": "string (optional)",
  "activityType": "string (football | basketball | repair | meeting | other)",
  "sessionDate": "ISO8601",
  "durationMinutes": "number",
  "participantCount": "number",
  "notes": "string (optional)",
  "evidence": ["IPFS CID (optional photos/video)"]
}
```

**Governance metadata (v1):**
```json
{
  "schema": "pot-governance-v1",
  "proposalText": "string",
  "outcome": "approved | rejected | deferred",
  "votesFor": "number",
  "votesAgainst": "number",
  "participantCount": "number",
  "notes": "string (optional)"
}
```

---

## WhatsApp Bot Behaviour

### Core interactions

**Recording a session:**
> "We just finished practice. 23 girls, 90 minutes, football at Banadir stadium"

Bot responds:
> "Got it ✓ Session recorded: 23 participants, 90 min football at Banadir stadium. Attested on Base. [link]"

**Recording a decision:**
> "We voted to move Saturday practice to 3pm. 8 yes, 2 no."

Bot responds:
> "Decision recorded ✓ Proposal: move Saturday practice to 3pm. Result: Approved 8-2. Attested on Base. [link]"

**Querying history:**
> "How many sessions did we have this month?"

Bot responds with summary from indexer.

### Trust model
- Bot holds a delegated signing key (no wallet needed for community members)
- Community admin registers their community once (via web frontend or CLI)
- Bot attests on behalf of the community
- Future: multi-sig attestation requiring 2+ community members

---

## Components

### 1. EAS Schemas
- Register Schema A and Schema B on EAS (Base mainnet)
- Document schema UIDs publicly

### 2. Metadata Standard
- JSON schema definitions for activity-v1 and governance-v1
- Published to IPFS + GitHub
- Versioned (v1, v2...)

### 3. Smart Contracts
- Resolver contract (validates minimum metadata requirements)
- Optional: community registry contract (maps entityId to community profile)

### 4. Indexer
- Listens for new attestations matching Protocol schemas
- Stores enriched data (fetches and parses IPFS metadata)
- Exposes query API

### 5. REST API
- `GET /communities/:entityId/sessions` — list activity attestations
- `GET /communities/:entityId/decisions` — list governance attestations  
- `GET /communities/:entityId/stats` — aggregate stats
- `POST /attest/activity` — create activity attestation (authenticated)
- `POST /attest/decision` — create governance attestation (authenticated)

### 6. WhatsApp/Telegram Bot
- OpenClaw-based agent
- Natural language → structured attestation
- Confirmation messages with on-chain links
- Query interface for history

### 7. Web Frontend
- Community explorer (browse all attesting communities)
- Community profile page (sessions, decisions, stats)
- Simple attestation UI (for orgs that don't use the bot)
- Embeddable widget for community websites

### 8. Docs
- Protocol overview
- Schema reference
- API reference
- Integration guide (how to run your own bot)
- Community onboarding guide (non-technical)

---

## Pilot Plan

### Phase 1: sarreya-bot (April 2026)
- Deploy bot on OpenClaw infra (Telegram first, WhatsApp when number sorted)
- Register EAS schemas on Base
- Manual attestation flow (bot → IPFS → EAS)
- Demo at AIFS call

### Phase 2: Indexer + API (May 2026)
- Basic indexer watching for protocol attestations
- Simple API
- Community stats page for Sarreya Sport

### Phase 3: Hoops Sagrado (June 2026)
- Onboard Hoops Sagrado Guatemala
- Spanish language bot support
- Funding report generated from attestation data

### Phase 4: Protocol open source + docs (Q3 2026)
- Full docs published
- GitHub repo public
- Outreach to other communities

---

## Success Metrics

- Sarreya Sport: 10+ attested sessions by end of April
- Hoops Sagrado: court usage data used in funding application
- Protocol: 3+ communities attesting by Q3 2026
- Stretch: attestation data used in a Gitcoin round or retroPGF application

---

## Open Questions

1. **Name** — "Proof of Together" or something else? (POT is also awkward as acronym)
2. **Chain** — Base is default. Should we support multiple chains?
3. **Bot identity** — Does the bot have its own ENS / on-chain identity?
4. **Privacy** — Should participant counts be on-chain or metadata-only?
5. **Governance of the protocol** — Who controls schema upgrades?
6. **Resolver contract** — necessary for v1 or overkill?
7. **NEAR/IronClaw** — does this live on Base or NEAR? Both?

---

## Related Projects

- EAS: https://attest.org
- Hypercerts: https://hypercerts.org
- Green Goods: regenerative action attestations
- POAP: event attendance
- Gitcoin Passport: identity attestations
- IronClaw (NEAR): agent infrastructure for sarreya-bot

---

*This is a living document. Update as we learn.*
