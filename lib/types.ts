/**
 * PRUEBA Shared Types
 * Proof of Recognized Use, Evidence-Based Attestation
 *
 * Shared interfaces used across the bot integration pipeline.
 */

// ─── Parsed Input Types ────────────────────────────────────────────────────

/**
 * A parsed community activity session, typically extracted from a bot command
 * or structured form submission.
 */
export interface ParsedSession {
  /** Type of activity (e.g. "football", "basketball", "training", "meeting") */
  activityType: string;
  /** ISO8601 date string: "2024-03-15" */
  sessionDate: string;
  /** Duration in minutes (optional) */
  durationMinutes?: number;
  /** Number of participants present */
  participantCount: number;
  /** Name of the facility or venue */
  facilityName?: string;
  /** Location/address of the facility */
  facilityLocation?: string;
  /** Free-text notes or additional context */
  notes?: string;
  /** Names or IDs of social multisig confirmers */
  confirmedBy?: string[];
}

/**
 * A parsed governance decision, typically from a group deliberation or vote.
 */
export interface ParsedDecision {
  /** The proposal or question being decided */
  proposalText: string;
  /** The decision-making process used (e.g. "consensus", "vote", "elder", "coordinator") */
  decisionProcess: string;
  /** What was decided/the outcome */
  outcome: string;
  /** Number of participants in the decision */
  participantCount: number;
  /** Free-text notes or additional context */
  notes?: string;
  /** Names or IDs of social multisig confirmers */
  confirmedBy?: string[];
}

// ─── Pipeline Result ───────────────────────────────────────────────────────

/**
 * The result returned by recordSession() and recordDecision() in the bot pipeline.
 * Contains all links needed to display confirmation to the user.
 */
export interface PipelineResult {
  /** Whether the attestation was successfully created */
  success: boolean;
  /** EAS attestation UID (hex string) */
  uid?: string;
  /** IPFS content identifier */
  cid?: string;
  /** Full IPFS gateway URL to the metadata JSON */
  ipfsUrl?: string;
  /** EAS scan URL to view the attestation */
  eascanUrl?: string;
  /** Error message if success is false */
  error?: string;
  /** True if running without real keys (no-op simulation) */
  demoMode: boolean;
}
