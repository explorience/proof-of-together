import { getAttestation } from "@/lib/api";
import Link from "next/link";

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default async function AttestationDetailPage({
  params,
}: {
  params: { uid: string };
}) {
  let att;
  try {
    att = await getAttestation(params.uid);
  } catch {
    return (
      <div className="border border-red-800 rounded-lg p-8 text-center text-red-400">
        Attestation not found or indexer unavailable.
      </div>
    );
  }

  const metadata = att.metadata_json ? JSON.parse(att.metadata_json) : null;

  return (
    <div className="max-w-3xl">
      <Link
        href={`/communities/${att.entity_id}`}
        className="text-sm text-muted hover:text-[var(--accent)] transition mb-4 inline-block"
      >
        &larr; Back to community
      </Link>

      <h1 className="text-2xl font-bold mb-6">Attestation</h1>

      <div className="space-y-4">
        <Row label="UID" value={att.uid} mono />
        <Row
          label="Type"
          value={att.schema_type === "activity" ? "Activity Session" : "Governance Decision"}
        />
        <Row label="Community" value={att.entity_id} mono />
        <Row label="Attested by" value={att.attested_by} mono />
        <Row label="Timestamp" value={formatDate(att.timestamp)} />
        <Row label="Block" value={att.block_number.toLocaleString()} />

        {/* External links */}
        <div className="border-t border-[var(--border)] pt-4 space-y-2">
          <ExtLink
            label="BaseScan Transaction"
            href={`https://basescan.org/tx/${att.tx_hash}`}
          />
          <ExtLink
            label="EAS Scan Attestation"
            href={`https://base.easscan.org/attestation/view/${att.uid}`}
          />
          {att.ref_cid && (
            <ExtLink
              label="IPFS Metadata"
              href={`https://gateway.pinata.cloud/ipfs/${att.ref_cid}`}
            />
          )}
        </div>

        {/* Metadata */}
        {metadata && (
          <div className="border-t border-[var(--border)] pt-4">
            <h2 className="font-semibold mb-2">Metadata</h2>
            <pre className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 text-sm overflow-x-auto">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1">
      <span className="text-sm text-muted w-36 shrink-0">{label}</span>
      <span
        className={`text-sm break-all ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function ExtLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-[var(--accent)] hover:underline block"
    >
      {label} &rarr;
    </a>
  );
}
