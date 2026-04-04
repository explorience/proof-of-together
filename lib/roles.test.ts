/**
 * PRUEBA Role-Based Validation Tests
 *
 * Run with: npx tsx lib/roles.test.ts
 */

import {
  RoleRegistry,
  DEFAULT_FLAT_RULES,
  RECOMMENDED_ROLE_RULES,
  type CommunityRole,
} from "./roles.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

const registry = new RoleRegistry();

// ─── Community Registration ──────────────────────────────────────────────

console.log("\n--- Community Registration ---");

const sarreya = registry.registerCommunity("sarreya", "Sarreya Sport");
assert(sarreya.entityId === "sarreya", "registers with entity ID");
assert(sarreya.rolesEnabled === false, "defaults to flat mode");
assert(sarreya.defaultThreshold === 3, "default threshold is 3");
assert(sarreya.rules.length === 4, "has 4 default flat rules");

const hoops = registry.registerCommunity("hoops", "Hoops Sagrado", {
  rolesEnabled: true,
  threshold: 2,
});
assert(hoops.rolesEnabled === true, "can enable roles on registration");
assert(hoops.defaultThreshold === 2, "custom threshold");
assert(
  hoops.rules.length === RECOMMENDED_ROLE_RULES.length,
  "uses recommended rules when roles enabled"
);

// ─── Role Assignment ─────────────────────────────────────────────────────

console.log("\n--- Role Assignment ---");

registry.assignRoles("sarreya", "ahmed", "Coach Ahmed", ["coach", "member"], "admin");
registry.assignRoles("sarreya", "fatima", "Fatima", ["coordinator", "member"], "admin");
registry.assignRoles("sarreya", "omar", "Omar", ["member"], "admin");
registry.assignRoles("sarreya", "hawa", "Hawa", ["elder", "member"], "admin");
registry.assignRoles("sarreya", "ali", "Ali", ["member"], "admin");

const ahmedRoles = registry.getMemberRoles("sarreya", "ahmed");
assert(ahmedRoles.includes("coach"), "Ahmed has coach role");
assert(ahmedRoles.includes("member"), "Ahmed has member role");

const coaches = registry.getMembersByRole("sarreya", "coach");
assert(coaches.length === 1, "1 coach in community");
assert(coaches[0].memberName === "Coach Ahmed", "coach is Ahmed");

// Add another role
registry.assignRoles("sarreya", "ahmed", "Coach Ahmed", ["coordinator"], "admin");
const updatedRoles = registry.getMemberRoles("sarreya", "ahmed");
assert(updatedRoles.includes("coordinator"), "Ahmed now also coordinator");
assert(updatedRoles.includes("coach"), "Ahmed still has coach");

// Remove role
registry.removeRole("sarreya", "ahmed", "coordinator");
const afterRemove = registry.getMemberRoles("sarreya", "ahmed");
assert(!afterRemove.includes("coordinator"), "coordinator removed");
assert(afterRemove.includes("coach"), "coach still there");

// ─── Flat Mode Validation ────────────────────────────────────────────────

console.log("\n--- Flat Mode Validation (Sarreya) ---");

const flat1 = registry.validateConfirmations("sarreya", "session", ["ahmed", "fatima"]);
assert(!flat1.valid, "2 of 3 not enough");
assert(flat1.needed === 1, "needs 1 more");

const flat2 = registry.validateConfirmations("sarreya", "session", ["ahmed", "fatima", "omar"]);
assert(flat2.valid, "3 of 3 sufficient");

const flat3 = registry.validateConfirmations("sarreya", "funds", ["ahmed", "fatima", "omar", "hawa"]);
assert(flat3.valid, "4 of 3 also works");

// ─── Role-Based Validation ───────────────────────────────────────────────

console.log("\n--- Role-Based Validation (Hoops Sagrado) ---");

// Set up hoops members
registry.assignRoles("hoops", "maria", "Maria", ["coordinator", "member"], "admin");
registry.assignRoles("hoops", "carlos", "Carlos", ["elder", "member"], "admin");
registry.assignRoles("hoops", "lucia", "Lucia", ["coach", "member"], "admin");
registry.assignRoles("hoops", "diego", "Diego", ["member"], "admin");
registry.assignRoles("hoops", "ana", "Ana", ["treasurer", "member"], "admin");

// Session: any 3 members (flat rule even in role mode)
const role1 = registry.validateConfirmations("hoops", "session", ["maria", "diego", "ana"]);
assert(role1.valid, "session: any 3 members works");

// Governance: needs 2 coordinators/elders out of 3
const role2 = registry.validateConfirmations("hoops", "governance", ["maria", "carlos", "diego"]);
assert(role2.valid, "governance: 2 coord/elder + 1 member works");

const role3 = registry.validateConfirmations("hoops", "governance", ["lucia", "diego", "ana"]);
assert(!role3.valid, "governance: no coordinators/elders fails");
assert(role3.neededRoleCount !== undefined && role3.neededRoleCount > 0, "tells how many role holders needed");

const role4 = registry.validateConfirmations("hoops", "governance", ["maria", "diego", "ana"]);
assert(!role4.valid, "governance: only 1 coordinator not enough");

// Funds: needs 2 from coordinator/treasurer/elder
const role5 = registry.validateConfirmations("hoops", "funds", ["ana", "maria", "diego"]);
assert(role5.valid, "funds: treasurer + coordinator + member works");

const role6 = registry.validateConfirmations("hoops", "funds", ["diego", "lucia", "ana"]);
assert(!role6.valid, "funds: only 1 treasurer without coordinator fails");

// Membership: 2 confirmations, 1 from coach/coordinator
const role7 = registry.validateConfirmations("hoops", "membership", ["lucia", "diego"]);
assert(role7.valid, "membership: coach + member works");

const role8 = registry.validateConfirmations("hoops", "membership", ["diego", "ana"]);
assert(!role8.valid, "membership: no coach/coordinator fails");

// ─── Unknown Community ───────────────────────────────────────────────────

console.log("\n--- Unknown Community Fallback ---");

const unknown1 = registry.validateConfirmations("unknown-org", "session", ["a", "b"]);
assert(!unknown1.valid, "unknown community: 2 not enough (default 3)");

const unknown2 = registry.validateConfirmations("unknown-org", "session", ["a", "b", "c"]);
assert(unknown2.valid, "unknown community: 3 sufficient");

// ─── Enable/Disable Roles ────────────────────────────────────────────────

console.log("\n--- Toggle Roles ---");

registry.setRolesEnabled("sarreya", true);
const sarConfig = registry.getCommunity("sarreya");
assert(sarConfig!.rolesEnabled === true, "roles enabled for Sarreya");

registry.setRolesEnabled("sarreya", false);
const sarConfig2 = registry.getCommunity("sarreya");
assert(sarConfig2!.rolesEnabled === false, "roles disabled again");

// ─── Summary ─────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"═".repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
