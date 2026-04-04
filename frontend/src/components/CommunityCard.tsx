import Link from "next/link";
import type { Community } from "@/lib/api";

export function CommunityCard({ community }: { community: Community }) {
  return (
    <Link
      href={`/communities/${community.entity_id}`}
      className="border border-[var(--border)] rounded-lg p-6 hover:border-[var(--accent)] transition block"
    >
      <h3 className="font-semibold text-lg mb-1">
        {community.name || community.entity_id.slice(0, 12) + "..."}
      </h3>
      {community.description && (
        <p className="text-sm text-muted mb-4 line-clamp-2">
          {community.description}
        </p>
      )}
      <div className="flex gap-4 text-sm text-muted">
        <span>
          <strong className="text-white">{community.total_sessions}</strong>{" "}
          sessions
        </span>
        <span>
          <strong className="text-white">{community.total_decisions}</strong>{" "}
          decisions
        </span>
        <span>
          <strong className="text-white">{community.total_participants}</strong>{" "}
          participants
        </span>
      </div>
    </Link>
  );
}
