"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StatsCard } from "@/components/StatsCard";
import { AttestationRow } from "@/components/AttestationRow";
import { Pagination } from "@/components/Pagination";
import type { Community, Attestation, PaginatedResponse } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3300";

type Tab = "sessions" | "decisions";

export default function CommunityDetailPage() {
  const params = useParams();
  const entityId = params.entityId as string;

  const [community, setCommunity] = useState<Community | null>(null);
  const [tab, setTab] = useState<Tab>("sessions");
  const [data, setData] = useState<PaginatedResponse<Attestation> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/communities/${entityId}`)
      .then((r) => r.json())
      .then((j) => setCommunity(j.data))
      .catch(() => setError("Failed to load community"));
  }, [entityId]);

  useEffect(() => {
    setData(null);
    fetch(`${BASE}/api/communities/${entityId}/${tab}?page=${page}&limit=20`)
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() => setError("Failed to load attestations"));
  }, [entityId, tab, page]);

  if (error) {
    return (
      <div className="border border-red-800 rounded-lg p-8 text-center text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <h1 className="text-3xl font-bold mb-1">
        {community?.name || entityId.slice(0, 16) + "..."}
      </h1>
      {community?.description && (
        <p className="text-muted mb-6">{community.description}</p>
      )}

      {/* Stats */}
      {community && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatsCard label="Sessions" value={community.total_sessions} />
          <StatsCard label="Decisions" value={community.total_decisions} />
          <StatsCard label="Participants" value={community.total_participants} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {(["sessions", "decisions"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t
                ? "border-[var(--accent)] text-white"
                : "border-transparent text-muted hover:text-white"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Attestation list */}
      {data === null ? (
        <p className="text-muted text-center py-8">Loading...</p>
      ) : data.data.length === 0 ? (
        <p className="text-muted text-center py-8">
          No {tab} recorded yet.
        </p>
      ) : (
        <>
          {data.data.map((att) => (
            <AttestationRow key={att.uid} att={att} />
          ))}
          <Pagination
            page={data.page}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
