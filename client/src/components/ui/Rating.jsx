import { useState } from 'react';
import { StarIcon } from './Icon';
import { compactNumber } from '../../utils/format';

/**
 * Read-only star rating.
 * `showValue` renders the numeric average, `showCount` the review count.
 */
export function RatingStars({ value = 0, size = 'md', showValue = false, showCount = false, count = 0, className = '' }) {
  const sizes = { xs: 'h-3 w-3', sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' };
  const rounded = Math.round(Number(value) * 2) / 2;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label={`Rated ${Number(value).toFixed(1)} out of 5`}>
      <span className="inline-flex items-center gap-0.5 text-warning-500">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            filled={star <= Math.floor(rounded)}
            className={`${sizes[size]} ${star <= Math.ceil(rounded) && star > Math.floor(rounded) ? 'opacity-60' : ''}`}
          />
        ))}
      </span>
      {showValue && <span className="text-xs font-semibold text-ink-700">{Number(value || 0).toFixed(1)}</span>}
      {showCount && <span className="text-xs text-ink-500">({compactNumber(count)})</span>}
    </span>
  );
}

/** Interactive star picker for the review form. */
export function RatingInput({ value, onChange, error, size = 'lg', className = '' }) {
  const [hover, setHover] = useState(0);
  const sizes = { md: 'h-6 w-6', lg: 'h-8 w-8' };
  const active = hover || value;

  const labels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' };

  return (
    <div className={className}>
      <div className="flex items-center gap-2" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange(star)}
            className="rounded-lg p-0.5 text-warning-500 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <StarIcon filled={star <= active} className={sizes[size]} />
          </button>
        ))}
        {active > 0 && <span className="ml-1 text-sm font-medium text-ink-600">{labels[active]}</span>}
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

/**
 * Rating distribution bars used on the product detail page.
 * @param {object} breakdown  { 1: n, 2: n, … 5: n }
 */
export function RatingBreakdown({ breakdown = {}, total = 0, average = 0, className = '' }) {
  return (
    <div className={`flex flex-col gap-6 sm:flex-row sm:items-center ${className}`}>
      <div className="text-center sm:w-40 sm:shrink-0">
        <p className="text-4xl font-bold tracking-tight text-ink-900">{Number(average || 0).toFixed(1)}</p>
        <RatingStars value={average} size="md" className="mt-1.5 justify-center" />
        <p className="mt-1.5 text-xs text-ink-500">{total} review{total === 1 ? '' : 's'}</p>
      </div>

      <div className="flex-1 space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = breakdown?.[star] || 0;
          const percent = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-xs font-medium text-ink-600">{star}★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-warning-400 transition-all duration-700" style={{ width: `${percent}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-500">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RatingStars;
