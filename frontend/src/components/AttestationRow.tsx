import Link from "next/link";
import type { Attestation } from "@/lib/api";

function truncate(s: string, n = 10): string {
  return s.length > n * 2 + 3 ? s.slice(0, n) + "..." + s.slice(-n) : s;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AttestationRow({ att }: { att: Attestation }) {
  return (
    <Link
      href={`/attestations/${att.uid}`}
      className="flex items-center justify-between border-b border-[var(--border)] py-3 hover:bg-[var(--card)] px-2 rounded transition"
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-mono">{truncate(att.uid, 8)}</span>
        <span className="text-xs text-muted">
          by {truncate(att.attested_by, 6)} · {formatDate(att.timestamp)}
        </span>
      </div>
      <span className="text-xs px-2 py-1 rounded bg-[var(--card)] border border-[var(--border)]">
        {att.schema_type}
      </span>
    </Link>
  );
}
