import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8">
      <div className="space-y-4">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-[var(--accent)]">PRUEBA</span>
        </h1>
        <p className="text-xl text-muted max-w-2xl">
          Proof of Recognized Use, Evidence-Based Attestation
        </p>
        <p className="text-muted max-w-xl leading-relaxed">
          An open protocol for community-verified participation records.
          Communities attest to real activities — sessions, decisions,
          governance — creating permanent, verifiable records on Base.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/communities"
          className="bg-[var(--accent)] text-black font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition"
        >
          Explore Communities
        </Link>
        <a
          href="https://github.com/explorience/prueba-protocol"
          target="_blank"
          rel="noopener"
          className="border border-[var(--border)] px-6 py-3 rounded-lg hover:border-[var(--accent)] transition"
        >
          GitHub
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 w-full max-w-3xl">
        <div className="border border-[var(--border)] rounded-lg p-6 text-left">
          <h3 className="font-semibold mb-2">Community-First</h3>
          <p className="text-sm text-muted">
            Built with and for grassroots sport organizations. No jargon,
            no gatekeeping.
          </p>
        </div>
        <div className="border border-[var(--border)] rounded-lg p-6 text-left">
          <h3 className="font-semibold mb-2">Verifiable Records</h3>
          <p className="text-sm text-muted">
            EAS attestations on Base. IPFS-backed metadata. Permanent,
            tamper-proof.
          </p>
        </div>
        <div className="border border-[var(--border)] rounded-lg p-6 text-left">
          <h3 className="font-semibold mb-2">Open Protocol</h3>
          <p className="text-sm text-muted">
            Forkable, composable, free. Any community can use PRUEBA to
            build their own record.
          </p>
        </div>
      </div>
    </div>
  );
}
