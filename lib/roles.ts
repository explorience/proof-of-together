/**
 * PRUEBA Role-Based Validation System
 *
 * Hybrid approach (Option C from issue #19):
 * - Off-chain role registry managed by the bot
 * - Confirmation rules per attestation type
 * - Ready for on-chain Hats Protocol integration in v2
 *
 * Maps to how communities actually organise — doesn't impose structure.
 * Communities can opt-in to role-based rules or keep flat 3-of-N.
 */

// ─── Core Types ────────────────────────────────────────────────────────────

/** Standard community roles. Communities can use any subset. */
export type CommunityRole =
  | "member"
  | "coach"
  | "coordinator"
  | "elder"
  | "treasurer"
  | "player";

/** A member's role assignment within a community */
export interface RoleAssignment {
  /** Internal member identifier (phone number hash, telegram ID, etc.) */
  memberId: string;
  /** Display name */
  memberName: string;
  /** Assigned roles */
  roles: CommunityRole[];
  /** Who assigned this role */
  assignedBy: string;
  /** When the role was assigned (ISO8601) */
  assignedAt: string;
  /** When the role expires (ISO8601), undefined = permanent */
  expiresAt?: string;
}

/** Rule defining what confirmations an attestation type needs */
export interface ConfirmationRule {
  /** Which attestation type this applies to */
  attestationType: "session" | "governance" | "funds" | "membership";
  /** Minimum number of confirmations needed */
  threshold: number;
  /** If set, at least this many must hold one of requiredRoles */
  requiredRoles?: CommunityRole[];
  /** How many of the required roles are needed (default: 1) */
  requiredRoleCount?: number;
  /** If true, any role counts (flat mode) */
  anyRole?: boolean;
  /** Human-readable description */
  description: string;
}

/** A community's complete role configuration */
export interface CommunityRoleConfig {
  /** Community entity ID */
  entityId: string;
  /** Community name */
  communityName: string;
  /** Whether role-based validation is enabled (false = flat 3-of-N) */
  rolesEnabled: boolean;
  /** Default threshold when rolesEnabled is false */
  defaultThreshold: number;
  /** Member role assignments */
  members: RoleAssignment[];
  /** Per-type confirmation rules (only used when rolesEnabled is true) */
  rules: ConfirmationRule[];
  /** On-chain Hats tree ID (set when community migrates to on-chain roles) */
  hatsTreeId?: number;
}

// ─── Default Configurations ────────────────────────────────────────────────

/** Default flat rules (no roles required) */
export const DEFAULT_FLAT_RULES: ConfirmationRule[] = [
  {
    attestationType: "session",
    threshold: 3,
    anyRole: true,
    description: "Any 3 community members can confirm a session",
  },
  {
    attestationType: "governance",
    threshold: 3,
    anyRole: true,
    description: "Any 3 community members can confirm a governance decision",
  },
  {
    attestationType: "funds",
    threshold: 3,
    anyRole: true,
    description: "Any 3 community members can confirm fund allocation",
  },
  {
    attestationType: "membership",
    threshold: 3,
    anyRole: true,
    description: "Any 3 community members can confirm new membership",
  },
];

/** Recommended role-based rules (communities can customise) */
export const RECOMMENDED_ROLE_RULES: ConfirmationRule[] = [
  {
    attestationType: "session",
    threshold: 3,
    anyRole: true,
    description: "Any 3 community members can confirm a session",
  },
  {
    attestationType: "governance",
    threshold: 3,
    requiredRoles: ["coordinator", "elder"],
    requiredRoleCount: 2,
    description:
      "3 confirmations needed, at least 2 from coordinators or elders",
  },
  {
    attestationType: "funds",
    threshold: 3,
    requiredRoles: ["coordinator", "treasurer", "elder"],
    requiredRoleCount: 2,
    description:
      "3 confirmations needed, at least 2 from coordinators, treasurers, or elders",
  },
  {
    attestationType: "membership",
    threshold: 2,
    requiredRoles: ["coach", "coordinator"],
    requiredRoleCount: 1,
    description:
      "2 confirmations needed, at least 1 from a coach or coordinator",
  },
];

// ─── Role Registry ─────────────────────────────────────────────────────────

/**
 * In-memory role registry. In production, this would be backed by the
 * indexer's SQLite database. Provided here as the canonical interface
 * that both the bot and future on-chain Hats integration will use.
 */
export class RoleRegistry {
  private configs: Map<string, CommunityRoleConfig> = new Map();

  /** Register a new community with default flat rules */
  registerCommunity(
    entityId: string,
    communityName: string,
    options?: { rolesEnabled?: boolean; threshold?: number }
  ): CommunityRoleConfig {
    const config: CommunityRoleConfig = {
      entityId,
      communityName,
      rolesEnabled: options?.rolesEnabled ?? false,
      defaultThreshold: options?.threshold ?? 3,
      members: [],
      rules: options?.rolesEnabled
        ? [...RECOMMENDED_ROLE_RULES]
        : [...DEFAULT_FLAT_RULES],
    };
    this.configs.set(entityId, config);
    return config;
  }

  /** Get a community's role config */
  getCommunity(entityId: string): CommunityRoleConfig | undefined {
    return this.configs.get(entityId);
  }

  /** Assign roles to a member */
  assignRoles(
    entityId: string,
    memberId: string,
    memberName: string,
    roles: CommunityRole[],
    assignedBy: string
  ): RoleAssignment | null {
    const config = this.configs.get(entityId);
    if (!config) return null;

    // Find existing or create new
    let assignment = config.members.find((m) => m.memberId === memberId);
    if (assignment) {
      // Merge roles (don't duplicate)
      const newRoles = new Set([...assignment.roles, ...roles]);
      assignment.roles = [...newRoles];
      assignment.assignedBy = assignedBy;
      assignment.assignedAt = new Date().toISOString();
    } else {
      assignment = {
        memberId,
        memberName,
        roles,
        assignedBy,
        assignedAt: new Date().toISOString(),
      };
      config.members.push(assignment);
    }
    return assignment;
  }

  /** Remove a role from a member */
  removeRole(
    entityId: string,
    memberId: string,
    role: CommunityRole
  ): boolean {
    const config = this.configs.get(entityId);
    if (!config) return false;

    const assignment = config.members.find((m) => m.memberId === memberId);
    if (!assignment) return false;

    assignment.roles = assignment.roles.filter((r) => r !== role);
    return true;
  }

  /** Get a member's roles */
  getMemberRoles(entityId: string, memberId: string): CommunityRole[] {
    const config = this.configs.get(entityId);
    if (!config) return [];

    const assignment = config.members.find((m) => m.memberId === memberId);
    return assignment?.roles ?? [];
  }

  /** Get all members with a specific role */
  getMembersByRole(entityId: string, role: CommunityRole): RoleAssignment[] {
    const config = this.configs.get(entityId);
    if (!config) return [];

    return config.members.filter((m) => m.roles.includes(role));
  }

  /** Update confirmation rules for an attestation type */
  setRule(entityId: string, rule: ConfirmationRule): boolean {
    const config = this.configs.get(entityId);
    if (!config) return false;

    const idx = config.rules.findIndex(
      (r) => r.attestationType === rule.attestationType
    );
    if (idx >= 0) {
      config.rules[idx] = rule;
    } else {
      config.rules.push(rule);
    }
    return true;
  }

  /** Enable/disable role-based validation for a community */
  setRolesEnabled(entityId: string, enabled: boolean): boolean {
    const config = this.configs.get(entityId);
    if (!config) return false;

    config.rolesEnabled = enabled;
    if (enabled && config.rules === DEFAULT_FLAT_RULES) {
      config.rules = [...RECOMMENDED_ROLE_RULES];
    }
    return true;
  }

  // ─── Validation ────────────────────────────────────────────────────────

  /**
   * Validate whether a set of confirmers meets the requirements for an
   * attestation type. This is the core function the bot calls before
   * creating an attestation.
   */
  validateConfirmations(
    entityId: string,
    attestationType: "session" | "governance" | "funds" | "membership",
    confirmerIds: string[]
  ): ValidationResult {
    const config = this.configs.get(entityId);

    // Unknown community — fall back to flat 3-of-N
    if (!config) {
      return confirmerIds.length >= 3
        ? { valid: true, message: "Sufficient confirmations (default 3-of-N)" }
        : {
            valid: false,
            message: `Need 3 confirmations, got ${confirmerIds.length}`,
            needed: 3 - confirmerIds.length,
          };
    }

    // Flat mode — just check threshold
    if (!config.rolesEnabled) {
      const threshold = config.defaultThreshold;
      return confirmerIds.length >= threshold
        ? {
            valid: true,
            message: `Sufficient confirmations (${confirmerIds.length}/${threshold})`,
          }
        : {
            valid: false,
            message: `Need ${threshold} confirmations, got ${confirmerIds.length}`,
            needed: threshold - confirmerIds.length,
          };
    }

    // Role-based mode
    const rule = config.rules.find(
      (r) => r.attestationType === attestationType
    );
    if (!rule) {
      // No rule for this type — use default threshold
      return confirmerIds.length >= config.defaultThreshold
        ? { valid: true, message: "No specific rule, default threshold met" }
        : {
            valid: false,
            message: `Need ${config.defaultThreshold} confirmations`,
            needed: config.defaultThreshold - confirmerIds.length,
          };
    }

    // Check total threshold
    if (confirmerIds.length < rule.threshold) {
      return {
        valid: false,
        message: `Need ${rule.threshold} confirmations, got ${confirmerIds.length}`,
        needed: rule.threshold - confirmerIds.length,
      };
    }

    // If anyRole, we're done
    if (rule.anyRole) {
      return {
        valid: true,
        message: `Sufficient confirmations (${confirmerIds.length}/${rule.threshold})`,
      };
    }

    // Check required roles
    if (rule.requiredRoles && rule.requiredRoleCount) {
      const roleConfirmers = confirmerIds.filter((id) => {
        const roles = this.getMemberRoles(entityId, id);
        return roles.some((r) => rule.requiredRoles!.includes(r));
      });

      if (roleConfirmers.length < rule.requiredRoleCount) {
        return {
          valid: false,
          message: `Need ${rule.requiredRoleCount} confirmations from ${rule.requiredRoles.join("/")} roles, got ${roleConfirmers.length}`,
          neededRoles: rule.requiredRoles,
          neededRoleCount: rule.requiredRoleCount - roleConfirmers.length,
        };
      }
    }

    return {
      valid: true,
      message: `All confirmation requirements met (${rule.description})`,
    };
  }
}

/** Result of a confirmation validation check */
export interface ValidationResult {
  /** Whether the confirmations are sufficient */
  valid: boolean;
  /** Human-readable explanation */
  message: string;
  /** How many more total confirmations are needed */
  needed?: number;
  /** Which roles are still needed */
  neededRoles?: CommunityRole[];
  /** How many more role-specific confirmations are needed */
  neededRoleCount?: number;
}

// ─── Hats Protocol Bridge (v2 placeholder) ─────────────────────────────────

/**
 * Interface for future on-chain Hats Protocol integration.
 * When a community migrates to on-chain roles, this adapter
 * syncs the off-chain registry with on-chain state.
 *
 * Not implemented yet — this defines the contract for v2.
 */
export interface HatsProtocolBridge {
  /** Create a Hats tree for a community */
  createTree(
    entityId: string,
    adminAddress: string
  ): Promise<{ treeId: number; topHatId: bigint }>;

  /** Create a role hat under the community tree */
  createRoleHat(
    treeId: number,
    role: CommunityRole,
    details: string
  ): Promise<{ hatId: bigint }>;

  /** Mint a hat (assign role) to an address */
  mintHat(hatId: bigint, wearer: string): Promise<{ txHash: string }>;

  /** Check if an address wears a hat */
  isWearer(hatId: bigint, wearer: string): Promise<boolean>;

  /** Sync off-chain registry to on-chain Hats state */
  syncToChain(config: CommunityRoleConfig): Promise<{
    synced: number;
    failed: number;
    txHashes: string[];
  }>;
}
