/**
 * PRUEBA Validated Pipeline
 *
 * Wraps the base bot pipeline with role-based confirmation validation.
 * Call these instead of recordSession/recordDecision directly when
 * you want confirmation rules enforced.
 *
 * Issue: #19 (Hats Protocol integration for role-based validation)
 */

import { recordSession, recordDecision } from "./bot-pipeline.js";
import { RoleRegistry, type ValidationResult } from "./roles.js";
import type { ParsedSession, ParsedDecision, PipelineResult } from "./types.js";

/** Extended result that includes validation info */
export interface ValidatedPipelineResult extends PipelineResult {
  /** Validation result from the role registry */
  validation: ValidationResult;
}

/**
 * Record a session with confirmation validation.
 *
 * If confirmations are insufficient, returns success=false with
 * the validation details — no attestation is created.
 */
export async function recordSessionValidated(
  registry: RoleRegistry,
  entityId: string,
  session: ParsedSession
): Promise<ValidatedPipelineResult> {
  const confirmerIds = session.confirmedBy ?? [];
  const validation = registry.validateConfirmations(
    entityId,
    "session",
    confirmerIds
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.message,
      demoMode: false,
      validation,
    };
  }

  const result = await recordSession(entityId, session);
  return { ...result, validation };
}

/**
 * Record a governance decision with confirmation validation.
 *
 * For governance and fund decisions, role-based rules are enforced
 * when the community has opted in.
 */
export async function recordDecisionValidated(
  registry: RoleRegistry,
  entityId: string,
  decision: ParsedDecision,
  attestationType: "governance" | "funds" = "governance"
): Promise<ValidatedPipelineResult> {
  const confirmerIds = decision.confirmedBy ?? [];
  const validation = registry.validateConfirmations(
    entityId,
    attestationType,
    confirmerIds
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.message,
      demoMode: false,
      validation,
    };
  }

  const result = await recordDecision(entityId, decision);
  return { ...result, validation };
}
