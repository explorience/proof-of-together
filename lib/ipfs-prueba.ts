/**
 * PRUEBA IPFS Metadata Upload
 * Proof of Recognized Use, Evidence-Based Attestation
 *
 * Thin wrapper around KYH pinToIPFS for PRUEBA metadata schemas.
 * Reuses: /root/workspace/code/celo-kyc-gateway/lib/ipfs.ts
 */

// Copy of pinToIPFS from KYH — identical, just renamed for clarity
const PINATA_API = "https://api.pinata.cloud";

async function pinToIPFS(
  data: Record<string, unknown>,
  name?: string
): Promise<{ cid: string; url: string } | null> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    console.warn("PINATA_JWT not set — skipping IPFS pin, returning null");
    return null;
  }

  const response = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      pinataContent: data,
      pinataMetadata: { name: name || `prueba-${Date.now()}` },
    }),
  });

  if (!response.ok) {
    console.error(`Pinata error ${response.status}: ${await response.text()}`);
    return null;
  }

  const result = await response.json() as { IpfsHash: string };
  return {
    cid: result.IpfsHash,
    url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
  };
}

// ─── Activity Metadata ─────────────────────────────────────────────────────

export interface ActivityMetadata {
  schema: "prueba-activity-v1";
  facilityName?: string;
  facilityLocation?: string;
  activityType: string;       // open string: football, basketball, meeting, etc.
  sessionDate: string;        // ISO8601
  durationMinutes?: number;
  participantCount: number;
  notes?: string;
  evidence?: string[];        // IPFS CIDs for photos etc.
  confirmedBy?: string[];     // Names/IDs of social multisig confirmers
}

export async function uploadActivityMetadata(
  data: Omit<ActivityMetadata, "schema">
): Promise<{ cid: string; url: string } | null> {
  const metadata: ActivityMetadata = {
    schema: "prueba-activity-v1",
    ...data,
  };

  return pinToIPFS(
    metadata as unknown as Record<string, unknown>,
    `prueba-activity-${data.sessionDate}`
  );
}

// ─── Governance Metadata ───────────────────────────────────────────────────

export interface GovernanceMetadata {
  schema: "prueba-governance-v1";
  proposalText: string;
  decisionProcess: string;    // open string: consensus, vote, elder, coordinator, etc.
  outcome: string;            // what was decided
  participantCount: number;
  notes?: string;
  evidence?: string[];
  confirmedBy?: string[];
}

export async function uploadGovernanceMetadata(
  data: Omit<GovernanceMetadata, "schema">
): Promise<{ cid: string; url: string } | null> {
  const metadata: GovernanceMetadata = {
    schema: "prueba-governance-v1",
    ...data,
  };

  return pinToIPFS(
    metadata as unknown as Record<string, unknown>,
    `prueba-governance-${Date.now()}`
  );
}
