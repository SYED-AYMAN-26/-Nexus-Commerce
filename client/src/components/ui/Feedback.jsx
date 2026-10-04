import { Icon, Spinner } from './Icon';
import { Button } from './Button';

/** Inline, layout-aware loading indicator. */
export function Loader({ label = 'Loading…', size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-9 w-9' };
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-10 text-ink-500 ${className}`} role="status">
      <Spinner className={`${sizes[size]} text-brand-600`} label={label} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/** Skeleton primitives used while data loads. */
export const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} aria-hidden="true" />;

export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`} aria-hidden="true">
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton key={index} className={`h-3 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

export const SkeletonProductCard = () => (
  <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white" aria-hidden="true">
    <Skeleton className="aspect-square w-full rounded-none" />
    <div className="space-y-3 p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  </div>
);

export const SkeletonProductGrid = ({ count = 8, className = '' }) => (
  <div className={`grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonProductCard key={index} />
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 6, columns = 5 }) => (
  <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white" aria-hidden="true">
    <div className="flex gap-4 border-b border-ink-200 bg-ink-50 px-4 py-3">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} className="h-3 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 border-b border-ink-100 px-4 py-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className={`h-4 flex-1 ${colIndex === 0 ? 'max-w-[28%]' : ''}`} />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Empty state used by cart, wishlist, orders, search results, tables, etc.
 * Always offers a next action so the user is never stuck.
 */
export function EmptyState({
  icon = 'box',
  title,
  description,
  action,
  actionTo,
  actionLabel,
  secondaryAction,
  className = '',
  compact = false,
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-6 py-10' : 'px-6 py-16'} ${className}`}>
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-500">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">{description}</p>}
      {(action || actionTo) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action || <Button to={actionTo}>{actionLabel}</Button>}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

/** Error state for failed page loads - distinct from a 404. */
export function ErrorState({ error, onRetry, title = 'Something went wrong', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-danger-50 text-danger-600">
        <Icon name="alert-triangle" className="h-7 w-7" />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">
        {error?.message || 'We could not load this content right now. Please try again.'}
      </p>
      {onRetry && (
        <Button className="mt-6" variant="outline" icon={<Icon name="refresh" className="h-4 w-4" />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Horizontal progress bar (free shipping nudge, stock levels, order tracker). */
export function Progress({ value = 0, max = 100, className = '', tone = 'brand', showLabel = false }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const tones = {
    brand: 'bg-brand-600',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
  };
  return (
    <div className={className}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-smooth ${tones[tone]}`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && <p className="mt-1.5 text-xs text-ink-500">{Math.round(percent)}%</p>}
    </div>
  );
}

export default EmptyState;
