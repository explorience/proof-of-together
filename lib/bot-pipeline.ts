/**
 * PRUEBA Bot Integration Pipeline
 * Proof of Recognized Use, Evidence-Based Attestation
 *
 * Main pipeline connecting bot commands → IPFS metadata upload → EAS attestation.
 * Used by Telegram/Discord bots and any other integration layer.
 *
 * Issues: #8 (activity recording), #9 (governance recording)
 */

import { uploadActivityMetadata, uploadGovernanceMetadata } from "./ipfs-prueba.js";
import { attestActivity, attestGovernance, isPruebaConfigured } from "./eas-prueba.js";
import type { ParsedSession, ParsedDecision, PipelineResult } from "./types.js";

// ─── Session Recording Pipeline ────────────────────────────────────────────

/**
 * Record a community activity session on-chain.
 *
 * Flow:
 *   1. Upload activity metadata JSON to IPFS via Pinata
 *   2. Attest on Base via EAS with the IPFS CID as reference
 *   3. Return all links for bot response
 *
 * Resilience:
 *   - If IPFS upload fails → still attest with empty ref (CID = "")
 *   - If EAS attestation fails → return error result
 *
 * @param entityId  Community identifier (e.g. "sarreya-sport")
 * @param session   Parsed session data from bot command
 */
export async function recordSession(
  entityId: string,
  session: ParsedSession
): Promise<PipelineResult> {
  const demoMode = !isPruebaConfigured();

  // Step 1: Upload metadata to IPFS
  let cid: string | undefined;
  let ipfsUrl: string | undefined;

  try {
    const ipfsResult = await uploadActivityMetadata({
      facilityName: session.facilityName,
      facilityLocation: session.facilityLocation,
      activityType: session.activityType,
      sessionDate: session.sessionDate,
      durationMinutes: session.durationMinutes,
      participantCount: session.participantCount,
      notes: session.notes,
      confirmedBy: session.confirmedBy,
    });

    if (ipfsResult) {
      cid = ipfsResult.cid;
      ipfsUrl = ipfsResult.url;
      console.log(`[prueba] Activity metadata pinned: ${cid}`);
    } else {
      console.warn("[prueba] IPFS upload returned null — attesting with empty ref");
    }
  } catch (err) {
    console.warn("[prueba] IPFS upload failed — attesting with empty ref:", err);
  }

  // Step 2: Attest on Base via EAS
  // Use the CID as the activityRef, or empty string if IPFS failed
  const activityRef = cid ?? "";

  try {
    const attestation = await attestActivity(entityId, activityRef, demoMode);

    return {
      success: true,
      uid: attestation.uid,
      cid,
      ipfsUrl,
      eascanUrl: attestation.eascanUrl,
      demoMode: attestation.demoMode,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[prueba] EAS attestation failed:", errorMsg);

    return {
      success: false,
      cid,
      ipfsUrl,
      error: `EAS attestation failed: ${errorMsg}`,
      demoMode,
    };
  }
}

// ─── Decision Recording Pipeline ───────────────────────────────────────────

/**
 * Record a governance decision on-chain.
 *
 * Flow:
 *   1. Upload governance metadata JSON to IPFS via Pinata
 *   2. Attest on Base via EAS with the IPFS CID as reference
 *   3. Return all links for bot response
 *
 * Resilience:
 *   - If IPFS upload fails → still attest with empty ref (CID = "")
 *   - If EAS attestation fails → return error result
 *
 * @param entityId  Community identifier (e.g. "sarreya-sport")
 * @param decision  Parsed decision data from bot command
 */
export async function recordDecision(
  entityId: string,
  decision: ParsedDecision
): Promise<PipelineResult> {
  const demoMode = !isPruebaConfigured();

  // Step 1: Upload metadata to IPFS
  let cid: string | undefined;
  let ipfsUrl: string | undefined;

  try {
    const ipfsResult = await uploadGovernanceMetadata({
      proposalText: decision.proposalText,
      decisionProcess: decision.decisionProcess,
      outcome: decision.outcome,
      participantCount: decision.participantCount,
      notes: decision.notes,
      confirmedBy: decision.confirmedBy,
    });

    if (ipfsResult) {
      cid = ipfsResult.cid;
      ipfsUrl = ipfsResult.url;
      console.log(`[prueba] Governance metadata pinned: ${cid}`);
    } else {
      console.warn("[prueba] IPFS upload returned null — attesting with empty ref");
    }
  } catch (err) {
    console.warn("[prueba] IPFS upload failed — attesting with empty ref:", err);
  }

  // Step 2: Attest on Base via EAS
  const proposalRef = cid ?? "";

  try {
    const attestation = await attestGovernance(entityId, proposalRef, demoMode);

    return {
      success: true,
      uid: attestation.uid,
      cid,
      ipfsUrl,
      eascanUrl: attestation.eascanUrl,
      demoMode: attestation.demoMode,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[prueba] EAS governance attestation failed:", errorMsg);

    return {
      success: false,
      cid,
      ipfsUrl,
      error: `EAS attestation failed: ${errorMsg}`,
      demoMode,
    };
  }
}
