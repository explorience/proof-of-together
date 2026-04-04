interface StatsCardProps {
  label: string;
  value: number | string;
}

export function StatsCard({ label, value }: StatsCardProps) {
  return (
    <div className="border border-[var(--border)] rounded-lg p-4">
      <p className="text-2xl font-bold text-[var(--accent)]">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
