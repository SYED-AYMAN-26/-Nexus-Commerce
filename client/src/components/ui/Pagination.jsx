import { Icon } from './Icon';

/** Compact page number list with ellipses for long ranges. */
function pageRange(current, total, siblingCount = 1) {
  const totalNumbers = siblingCount * 2 + 5;
  if (total <= totalNumbers) return Array.from({ length: total }, (_, i) => i + 1);

  const left = Math.max(2, current - siblingCount);
  const right = Math.min(total - 1, current + siblingCount);

  const pages = [1];
  if (left > 2) pages.push('…');
  for (let page = left; page <= right; page += 1) pages.push(page);
  if (right < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

export function Pagination({ page = 1, totalPages = 1, onChange, className = '', showSummary = false, total = 0, limit = 12 }) {
  if (totalPages <= 1 && !showSummary) return null;

  const pages = pageRange(page, totalPages);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className={`flex flex-col items-center gap-4 sm:flex-row sm:justify-between ${className}`} aria-label="Pagination">
      {showSummary && (
        <p className="text-sm text-ink-500">
          Showing <span className="font-semibold text-ink-800">{from}</span>–<span className="font-semibold text-ink-800">{to}</span> of{' '}
          <span className="font-semibold text-ink-800">{total}</span> results
        </p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            className="btn btn-outline btn-sm px-2.5 disabled:opacity-40"
            aria-label="Previous page"
          >
            <Icon name="chevronLeft" className="h-4 w-4" />
          </button>

          {pages.map((entry, index) =>
            entry === '…' ? (
              <span key={`gap-${index}`} className="px-1.5 text-sm text-ink-400">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onChange(entry)}
                aria-current={entry === page ? 'page' : undefined}
                className={`min-w-[2.25rem] rounded-lg px-2.5 py-2 text-sm font-semibold transition
                            ${entry === page ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-600 hover:bg-ink-100'}`}
              >
                {entry}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            className="btn btn-outline btn-sm px-2.5 disabled:opacity-40"
            aria-label="Next page"
          >
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>
      )}
    </nav>
  );
}

export default Pagination;
