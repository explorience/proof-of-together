"use client";

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1 rounded border border-[var(--border)] text-sm disabled:opacity-30 hover:border-[var(--accent)] transition"
      >
        Prev
      </button>
      <span className="text-sm text-muted">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1 rounded border border-[var(--border)] text-sm disabled:opacity-30 hover:border-[var(--accent)] transition"
      >
        Next
      </button>
    </div>
  );
}
