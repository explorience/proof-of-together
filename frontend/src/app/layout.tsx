import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRUEBA Dashboard",
  description:
    "Community attestation dashboard — Proof of Recognized Use, Evidence-Based Attestation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center gap-4">
          <a href="/" className="text-lg font-bold text-[var(--accent)]">
            PRUEBA
          </a>
          <a
            href="/communities"
            className="text-sm text-muted hover:text-white transition"
          >
            Communities
          </a>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
