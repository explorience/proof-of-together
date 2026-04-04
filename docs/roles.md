# PRUEBA Role-Based Validation

## Overview

PRUEBA supports optional role-based validation for community attestations. Communities can choose between:

- **Flat mode** (default): Any N community members can confirm a record
- **Role mode**: Different attestation types require specific role holders

This is a hybrid design — roles are managed off-chain by the bot, with an upgrade path to on-chain Hats Protocol for communities that need it.

## How It Works

### Flat Mode (Default)

Every community starts in flat mode. All confirmations are equal:

| Attestation Type | Threshold |
|-----------------|-----------|
| Session | 3 of N |
| Governance | 3 of N |
| Funds | 3 of N |
| Membership | 3 of N |

This is correct for most pilot communities. Simple, no roles to manage.

### Role Mode (Opt-In)

Communities that want differentiated validation can enable role mode. The recommended defaults:

| Attestation Type | Threshold | Role Requirement |
|-----------------|-----------|-----------------|
| Session | 3 of N | Any role |
| Governance | 3 of N | 2 must be coordinator or elder |
| Funds | 3 of N | 2 must be coordinator, treasurer, or elder |
| Membership | 2 of N | 1 must be coach or coordinator |

Communities can customise these rules. The bot command would be something like:

```
/roles enable
/roles assign @ahmed coach
/roles assign @fatima coordinator
/roles rule governance threshold:3 required:coordinator,elder count:2
```

## Available Roles

| Role | Typical Meaning |
|------|----------------|
| `member` | Any community participant |
| `coach` | Leads training sessions |
| `coordinator` | Manages community operations |
| `elder` | Respected community leader |
| `treasurer` | Manages community funds |
| `player` | Active sport participant |

Communities map these to their own structure. The labels are suggestions — what matters is the validation rules.

## Validation Flow

```
User submits session report
        │
        ▼
Bot collects confirmations
        │
        ▼
Registry.validateConfirmations()
        │
        ├── Valid → Pipeline creates attestation
        │
        └── Invalid → Bot tells user what's missing
                       "Need 1 more confirmation from
                        a coordinator or elder"
```

## Hats Protocol Integration (v2)

For communities that need on-chain role accountability (e.g., treasury management), PRUEBA provides a bridge to Hats Protocol:

1. Community registers a Hats tree on Base
2. Roles are minted as hats to delegated addresses
3. Bot checks both off-chain registry and on-chain hat ownership
4. High-stakes roles (treasurer, coordinator) live on-chain; casual roles stay off-chain

This is not implemented in v1. The `HatsProtocolBridge` interface in `lib/roles.ts` defines the v2 contract.

## API Reference

### `RoleRegistry`

```typescript
import { RoleRegistry } from "./lib/roles.js";

const registry = new RoleRegistry();

// Register community (flat by default)
registry.registerCommunity("sarreya", "Sarreya Sport");

// Register with roles enabled
registry.registerCommunity("hoops", "Hoops Sagrado", {
  rolesEnabled: true,
  threshold: 3,
});

// Assign roles
registry.assignRoles("sarreya", "ahmed", "Coach Ahmed", ["coach", "member"], "admin");

// Validate before attesting
const result = registry.validateConfirmations("sarreya", "session", ["ahmed", "fatima", "omar"]);
if (result.valid) {
  await recordSession("sarreya", sessionData);
} else {
  console.log(result.message); // "Need 1 more confirmation from..."
}
```

### `recordSessionValidated` / `recordDecisionValidated`

Convenience wrappers that combine validation + pipeline:

```typescript
import { recordSessionValidated } from "./lib/validated-pipeline.js";

const result = await recordSessionValidated(registry, "sarreya", sessionData);
if (!result.success) {
  // result.validation.message explains what's missing
}
```

## Design Principles

1. **Opt-in complexity**: Simple communities stay simple
2. **Community-mapped roles**: Don't impose structure — map to how they already organise
3. **Wallet-free for members**: Bot manages roles on behalf of phone-number-identified members
4. **Progressive decentralisation**: Start off-chain, move on-chain when it matters
5. **Adele's insight**: Digital role-based voting reduces peer pressure vs hand-raising in person
