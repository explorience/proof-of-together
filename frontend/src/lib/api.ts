/**
 * PRUEBA Dashboard — API client
 * Talks to the indexer REST API.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3300";

// ─── Types ────────────────────────────────────────────────────────────────

export interface Community {
  entity_id: string;
  name: string | null;
  description: string | null;
  created_at: number;
  total_sessions: number;
  total_decisions: number;
  total_participants: number;
}

export interface CommunityStats {
  total_sessions: number;
  total_decisions: number;
  total_participants: number;
  first_attestation: number | null;
  latest_attestation: number | null;
}

export interface Attestation {
  uid: string;
  schema_type: "activity" | "governance";
  entity_id: string;
  ref_cid: string;
  timestamp: number;
  attested_by: string;
  tx_hash: string;
  block_number: number;
  metadata_json: string | null;
}

export interface PaginatedResponse<T> {
  ok: boolean;
  data: T[];
  page: number;
  limit: number;
  total: number;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function getCommunities(): Promise<Community[]> {
  return get<Community[]>("/api/communities");
}

export async function getCommunity(entityId: string): Promise<Community> {
  return get<Community>(`/api/communities/${entityId}`);
}

export async function getCommunityStats(entityId: string): Promise<CommunityStats> {
  return get<CommunityStats>(`/api/communities/${entityId}/stats`);
}

export async function getSessions(
  entityId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Attestation>> {
  const res = await fetch(
    `${BASE}/api/communities/${entityId}/sessions?page=${page}&limit=${limit}`,
    { next: { revalidate: 30 } }
  );
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function getDecisions(
  entityId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Attestation>> {
  const res = await fetch(
    `${BASE}/api/communities/${entityId}/decisions?page=${page}&limit=${limit}`,
    { next: { revalidate: 30 } }
  );
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function getAttestation(uid: string): Promise<Attestation> {
  return get<Attestation>(`/api/attestations/${uid}`);
}
