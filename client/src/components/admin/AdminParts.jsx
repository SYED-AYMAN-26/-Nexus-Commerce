import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { Loader } from '../ui/Feedback';
import { formatMoney } from '../../utils/format';

/**
 * Shared building blocks for the admin console.
 * All charts are dependency-free inline SVG/CSS and render from real API data.
 */

export function AdminPageHeader({ title, description, actions, backTo, backLabel = 'Back' }) {
  return (
    <header className="mb-6">
      {backTo && (
        <Link to={backTo} className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition hover:text-ink-800">
          <Icon name="arrowLeft" className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

const TILE_TONES = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
  neutral: 'bg-ink-100 text-ink-600',
};

export function StatTile({ label, value, hint, delta, icon = 'activity', tone = 'brand', to }) {
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper
      {...(to ? { to } : {})}
      className={`block rounded-2xl border border-ink-200 bg-white p-4 transition sm:p-5 ${to ? 'hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${TILE_TONES[tone] || TILE_TONES.brand}`}>
          <Icon name={icon} className="h-4.5 w-4.5" />
        </span>
      </div>

      <p className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900">{value}</p>

      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta !== undefined && delta !== null && (
          <span className={`inline-flex items-center gap-1 font-semibold ${Number(delta) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            <Icon name={Number(delta) >= 0 ? 'trendingUp' : 'trendingDown'} className="h-3.5 w-3.5" />
            {Number(delta) >= 0 ? '+' : ''}{Number(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-ink-500">{hint}</span>}
      </div>
    </Wrapper>
  );
}

export function ChartCard({ title, description, actions, children, className = '', loading = false, empty = false, emptyMessage = 'No data for this period yet.' }) {
  return (
    <section className={`rounded-2xl border border-ink-200 bg-white p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="mt-4">
        {loading ? (
          <Loader className="py-16" label="Loading chart…" />
        ) : empty ? (
          <p className="rounded-xl border border-dashed border-ink-200 py-14 text-center text-sm text-ink-500">
            {emptyMessage}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/**
 * Area chart: values as a filled line with grid lines and x-axis labels.
 * Rendered with a fixed viewBox stretched to the container; strokes stay 2px.
 */
export function AreaChart({ data = [], xKey = 'label', valueKey = 'revenue', height = 220, formatValue = (value) => value, tone = '#6366f1' }) {
  const gradientId = useId().replace(/:/g, '');
  const values = data.map((row) => Number(row[valueKey]) || 0);
  const max = Math.max(...values, 1);
  const width = 640;
  const padX = 6;
  const padY = 18;
  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;

  const points = values.map((value, index) => [
    padX + index * stepX,
    padY + (height - padY * 2) * (1 - value / max),
  ]);
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1][0].toFixed(1)} ${height - padY} L${points[0][0].toFixed(1)} ${height - padY} Z`;

  // Show at most 6 x-axis labels so they never collide on narrow screens.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-lg font-bold text-ink-900">{formatValue(Math.max(...values))}</p>
        <p className="text-xs text-ink-500">peak</p>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="mt-3 h-52 w-full" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id={`fill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity="0.28" />
            <stop offset="100%" stopColor={tone} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padY + (height - padY * 2) * ratio;
          return (
            <line
              key={ratio}
              x1="0"
              x2={width}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray={ratio === 1 ? undefined : '4 6'}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        <path d={area} fill={`url(#fill-${gradientId})`} />
        <path d={line} fill="none" stroke={tone} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

        {points.map(([x, y], index) => (
          <g key={index}>
            <circle cx={x} cy={y} r="9" fill="transparent">
              <title>{`${data[index][xKey]}: ${formatValue(values[index])}`}</title>
            </circle>
            {index === points.length - 1 && (
              <circle cx={x} cy={y} r="4" fill={tone} stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            )}
          </g>
        ))}
      </svg>

      <div className="mt-2 flex justify-between text-2xs font-medium uppercase tracking-wide text-ink-400">
        {data.map((row, index) =>
          index % labelEvery === 0 || index === data.length - 1 ? (
            <span key={row[xKey] || index}>{row[xKey]}</span>
          ) : null,
        )}
      </div>
    </div>
  );
}

/** Vertical bar chart built from CSS boxes — crisp at any width. */
export function BarChart({ data = [], xKey = 'label', valueKey = 'orders', formatValue = (value) => value, tone = 'bg-brand-500' }) {
  const values = data.map((row) => Number(row[valueKey]) || 0);
  const max = Math.max(...values, 1);
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div>
      <div className="flex h-48 items-end gap-1.5">
        {data.map((row, index) => {
          const value = values[index];
          const percent = Math.max((value / max) * 100, value > 0 ? 4 : 0);
          return (
            <div key={row[xKey] || index} className="group flex h-full flex-1 flex-col justify-end" title={`${row[xKey]}: ${formatValue(value)}`}>
              <span className="mb-1 hidden text-center text-2xs font-semibold text-ink-600 group-hover:block">
                {formatValue(value)}
              </span>
              <span
                className={`w-full rounded-t-md ${tone} transition-all group-hover:opacity-80`}
                style={{ height: `${percent}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5 text-2xs font-medium uppercase tracking-wide text-ink-400">
        {data.map((row, index) => (
          <span key={row[xKey] || index} className="flex-1 text-center">
            {index % labelEvery === 0 ? row[xKey] : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Ranked horizontal bars — used for categories and best sellers. */
export function RankedBars({ items = [], barTone = 'bg-brand-500', formatValue = (value) => value, emptyMessage = 'Nothing sold yet.' }) {
  if (!items.length) {
    return <p className="rounded-xl border border-dashed border-ink-200 py-10 text-center text-sm text-ink-500">{emptyMessage}</p>;
  }

  const max = Math.max(...items.map((item) => Number(item.value) || 0), 1);

  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink-800">{item.label}</span>
            <span className="shrink-0 font-semibold text-ink-900">{formatValue(item.value, item)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full ${barTone} transition-all`}
              style={{ width: `${Math.max(((Number(item.value) || 0) / max) * 100, 2)}%` }}
            />
          </div>
          {item.meta && <p className="mt-1 text-2xs text-ink-500">{item.meta}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Toolbar that hosts search + selects above admin tables. */
export function AdminToolbar({ children, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3.5 sm:p-4 ${className}`}>
      {children}
    </div>
  );
}

/** Small key/value pair used across admin detail pages. */
export function InfoRow({ label, children, icon }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 py-2.5 last:border-0">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-500">
        {icon && <Icon name={icon} className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="text-right text-sm font-medium text-ink-900">{children}</span>
    </div>
  );
}

export function money(value) {
  return formatMoney(value || 0);
}
