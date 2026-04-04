#!/usr/bin/env tsx
/**
 * PRUEBA Pipeline Test Script
 *
 * Tests recordSession() and recordDecision() with demo data from Sarreya Sport.
 * Runs in demo mode when PRUEBA_BOT_PRIVATE_KEY is not set (no real txs).
 *
 * Usage:
 *   npm run test-pipeline
 *
 *   # With real credentials:
 *   PRUEBA_BOT_PRIVATE_KEY=0x... PRUEBA_ACTIVITY_SCHEMA_UID=0x... PRUEBA_GOVERNANCE_SCHEMA_UID=0x... npm run test-pipeline
 */

import { recordSession, recordDecision } from "../lib/bot-pipeline.js";
import { isPruebaConfigured } from "../lib/eas-prueba.js";
import type { ParsedSession, ParsedDecision } from "../lib/types.js";

const isConfigured = isPruebaConfigured();

console.log("╔═══════════════════════════════════════════════════════════╗");
console.log("║          PRUEBA Pipeline Test — Sarreya Sport             ║");
console.log("╚═══════════════════════════════════════════════════════════╝");
console.log("");
console.log(`Mode: ${isConfigured ? "🔴 LIVE (real attestations)" : "🟡 DEMO (no real txs)"}`);
if (!isConfigured) {
  console.log("Tip: Set PRUEBA_BOT_PRIVATE_KEY + schema UIDs for live mode");
}
console.log("");

// ─── Test 1: Record a Football Session ────────────────────────────────────

const sarreya = "sarreya-sport";

const footballSession: ParsedSession = {
  activityType: "football",
  sessionDate: "2025-04-03",
  durationMinutes: 90,
  participantCount: 22,
  facilityName: "Sarreya Sports Complex",
  facilityLocation: "Sarreya, Algeria",
  notes: "Weekly youth training session. U18 squad. Good attendance despite rain.",
  confirmedBy: ["Karim B.", "Yasmine A.", "Omar M."],
};

console.log("─── Test 1: Record Activity Session ────────────────────────");
console.log("Entity:", sarreya);
console.log("Activity:", footballSession.activityType);
console.log("Date:", footballSession.sessionDate);
console.log("Participants:", footballSession.participantCount);
console.log("Facility:", footballSession.facilityName);
console.log("Confirmed by:", footballSession.confirmedBy?.join(", "));
console.log("");
console.log("Running recordSession()...");

try {
  const sessionResult = await recordSession(sarreya, footballSession);

  if (sessionResult.success) {
    console.log("✅ Session recorded successfully!");
    console.log("");
    console.log("  Attestation UID:", sessionResult.uid);
    if (sessionResult.cid) {
      console.log("  IPFS CID:       ", sessionResult.cid);
      console.log("  IPFS URL:       ", sessionResult.ipfsUrl);
    } else {
      console.log("  IPFS:            (no PINATA_JWT set — skipped)");
    }
    console.log("  EAS scan:       ", sessionResult.eascanUrl);
    console.log("  Demo mode:      ", sessionResult.demoMode);
  } else {
    console.log("❌ Session recording failed:");
    console.log("  Error:", sessionResult.error);
    if (sessionResult.cid) {
      console.log("  IPFS CID (saved):", sessionResult.cid);
    }
  }
} catch (err) {
  console.error("❌ Unexpected error:", err);
}

console.log("");

// ─── Test 2: Record a Governance Decision ─────────────────────────────────

const governanceDecision: ParsedDecision = {
  proposalText: "Allocate 30% of this season's fundraising to new youth kit for U16 squad",
  decisionProcess: "consensus",
  outcome: "Approved — committee agreed unanimously. Purchase to proceed before April training camp.",
  participantCount: 8,
  notes: "Meeting held after Friday training. All senior committee members present.",
  confirmedBy: ["Karim B.", "Yasmine A.", "Fatima C.", "Hassan D."],
};

console.log("─── Test 2: Record Governance Decision ─────────────────────");
console.log("Entity:", sarreya);
console.log("Proposal:", governanceDecision.proposalText.slice(0, 60) + "...");
console.log("Process:", governanceDecision.decisionProcess);
console.log("Outcome:", governanceDecision.outcome.slice(0, 60) + "...");
console.log("Participants:", governanceDecision.participantCount);
console.log("Confirmed by:", governanceDecision.confirmedBy?.join(", "));
console.log("");
console.log("Running recordDecision()...");

try {
  const decisionResult = await recordDecision(sarreya, governanceDecision);

  if (decisionResult.success) {
    console.log("✅ Decision recorded successfully!");
    console.log("");
    console.log("  Attestation UID:", decisionResult.uid);
    if (decisionResult.cid) {
      console.log("  IPFS CID:       ", decisionResult.cid);
      console.log("  IPFS URL:       ", decisionResult.ipfsUrl);
    } else {
      console.log("  IPFS:            (no PINATA_JWT set — skipped)");
    }
    console.log("  EAS scan:       ", decisionResult.eascanUrl);
    console.log("  Demo mode:      ", decisionResult.demoMode);
  } else {
    console.log("❌ Decision recording failed:");
    console.log("  Error:", decisionResult.error);
    if (decisionResult.cid) {
      console.log("  IPFS CID (saved):", decisionResult.cid);
    }
  }
} catch (err) {
  console.error("❌ Unexpected error:", err);
}

console.log("");
console.log("═══════════════════════════════════════════════════════════");
console.log("Test complete.");
console.log("");
console.log("Next steps:");
console.log("  1. Register schemas:  npm run register-schemas");
console.log("  2. Set env vars:      PRUEBA_BOT_PRIVATE_KEY, schema UIDs, PINATA_JWT");
console.log("  3. Re-run in live mode for real on-chain attestations");
