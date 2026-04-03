import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

function getPageWindow(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const show = new Set<number>([
    1, 2,
    Math.max(1, current - 1), current, Math.min(total, current + 1),
    total - 1, total,
  ]);

  const sorted = [...show].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | '...')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('...');
    }
    result.push(sorted[i]);
  }
  return result;
}

export default function Pagination({ currentPage, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageWindow(currentPage, totalPages);

  const base =
    'h-8 min-w-[32px] px-2 flex items-center justify-center text-sm font-medium ' +
    'bg-surface-2 text-text-muted border-r border-border last:border-r-0';

  return (
    <div className="inline-flex items-center rounded-md overflow-hidden border border-border">
      {currentPage <= 1 ? (
        <span className={`${base} opacity-40 cursor-not-allowed select-none`}>«</span>
      ) : (
        <Link href={buildHref(currentPage - 1)} className={`${base} hover:bg-surface-3 transition-colors`}>
          «
        </Link>
      )}

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className={`${base} cursor-default select-none`}>
            …
          </span>
        ) : p === currentPage ? (
          <span key={p} className={`${base} bg-brand-primary text-white pointer-events-none select-none`}>
            {p}
          </span>
        ) : (
          <Link key={p} href={buildHref(p)} className={`${base} hover:bg-surface-3 transition-colors`}>
            {p}
          </Link>
        )
      )}

      {currentPage >= totalPages ? (
        <span className={`${base} opacity-40 cursor-not-allowed select-none`}>»</span>
      ) : (
        <Link href={buildHref(currentPage + 1)} className={`${base} hover:bg-surface-3 transition-colors`}>
          »
        </Link>
      )}
    </div>
  );
}
