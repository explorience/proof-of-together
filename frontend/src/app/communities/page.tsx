import { getCommunities } from "@/lib/api";
import { CommunityCard } from "@/components/CommunityCard";

export default async function CommunitiesPage() {
  let communities;
  try {
    communities = await getCommunities();
  } catch {
    communities = null;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Communities</h1>
      <p className="text-muted mb-8">
        Organizations using PRUEBA to record community activities on-chain.
      </p>

      {communities === null ? (
        <div className="border border-[var(--border)] rounded-lg p-8 text-center">
          <p className="text-muted">
            Could not reach the indexer API. Make sure the PRUEBA indexer is
            running and NEXT_PUBLIC_API_URL is set.
          </p>
        </div>
      ) : communities.length === 0 ? (
        <div className="border border-[var(--border)] rounded-lg p-8 text-center">
          <p className="text-muted">
            No communities indexed yet. Attestations will appear here once
            the indexer picks them up from Base.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {communities.map((c) => (
            <CommunityCard key={c.entity_id} community={c} />
          ))}
        </div>
      )}
    </div>
  );
}
