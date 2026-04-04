# PRUEBA EAS Schemas

## Overview

PRUEBA uses two EAS (Ethereum Attestation Service) schemas on Base to record community activities. Both schemas are registered on the Schema Registry at `0x4200000000000000000000000000000000000020`.

## Activity Schema

Records community sessions, trainings, matches, and gatherings.

```solidity
bytes32 entityId      // Unique community identifier (e.g., keccak256("sarreya-sport"))
bytes32 activityRef   // IPFS CID (as bytes32) containing session metadata
uint64  timestamp     // Unix timestamp of the activity
address attestedBy    // Address of the attesting bot/signer
```

### IPFS Metadata (activityRef)

```json
{
  "type": "session",
  "community": "Sarreya Sport",
  "location": "Sarreya grounds, Hargeisa",
  "date": "2026-04-01",
  "participants": 15,
  "activity": "Football training session",
  "notes": "Youth session, ages 12-16. Focused on passing drills.",
  "reportedBy": "Coach Ahmed"
}
```

## Governance Schema

Records community decisions, votes, and governance actions.

```solidity
bytes32 entityId      // Unique community identifier
bytes32 proposalRef   // IPFS CID (as bytes32) containing decision metadata
uint64  timestamp     // Unix timestamp of the decision
address attestedBy    // Address of the attesting bot/signer
```

### IPFS Metadata (proposalRef)

```json
{
  "type": "decision",
  "community": "Sarreya Sport",
  "proposal": "Purchase new training equipment",
  "outcome": "approved",
  "votes": { "for": 12, "against": 2, "abstain": 1 },
  "date": "2026-04-01",
  "notes": "Community meeting at Sarreya grounds. Budget allocated from community fund."
}
```

## Entity ID Convention

The `entityId` field uses `keccak256` of a human-readable community name:

```typescript
import { keccak256, toUtf8Bytes } from "ethers";

const entityId = keccak256(toUtf8Bytes("sarreya-sport"));
// → 0x...
```

This allows any community to self-identify without a central registry. The indexer derives community profiles from the first attestation seen for each entityId.

## Schema Registration

Use `scripts/register-schemas.ts` to register both schemas on Base:

```bash
# Set environment variables
export PRUEBA_BOT_PRIVATE_KEY=0x...

# Register schemas
npx tsx scripts/register-schemas.ts
```

The script outputs the schema UIDs to use in the indexer and bot configuration.

## Revocability

Both schemas are **non-revocable** by design. Community records should be permanent — if a record is incorrect, a new attestation can be created with corrected metadata, but the original is never deleted. This matches the community value of transparent, complete records.
