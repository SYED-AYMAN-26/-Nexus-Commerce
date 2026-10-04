import { Link } from 'react-router-dom';
import { Icon } from './Icon';

/** Breadcrumb trail - keeps deep pages navigable. */
export function Breadcrumbs({ items = [], className = '' }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar text-sm ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex shrink-0 items-center gap-1.5">
            {item.to && !isLast ? (
              <Link to={item.to} className="text-ink-500 transition hover:text-ink-900">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-ink-900' : 'text-ink-500'}>{item.label}</span>
            )}
            {!isLast && <Icon name="chevronRight" className="h-3.5 w-3.5 text-ink-300" />}
          </span>
        );
      })}
    </nav>
  );
}

/** Section heading with optional action link. */
export function SectionHeader({ eyebrow, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>
        )}
        <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-sm leading-relaxed text-ink-500 sm:text-base">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Quantity stepper with stock-aware maximum. */
export function QuantityStepper({ value, onChange, min = 1, max = 10, size = 'md', disabled = false, className = '' }) {
  const sizes = {
    sm: { btn: 'h-8 w-8', text: 'h-8 w-10 text-sm' },
    md: { btn: 'h-10 w-10', text: 'h-10 w-12 text-sm' },
  }[size] || sizes?.md;

  const clamp = (next) => Math.min(max, Math.max(min, next));

  return (
    <div className={`inline-flex items-center rounded-xl border border-ink-200 bg-white ${className}`}>
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className={`grid ${sizes.btn} place-items-center rounded-l-xl text-ink-600 transition hover:bg-ink-100
                    disabled:opacity-40 disabled:hover:bg-transparent`}
      >
        <Icon name="minus" className="h-4 w-4" />
      </button>
      <span className={`grid ${sizes.text} place-items-center border-x border-ink-200 font-semibold tabular-nums text-ink-900`}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className={`grid ${sizes.btn} place-items-center rounded-r-xl text-ink-600 transition hover:bg-ink-100
                    disabled:opacity-40 disabled:hover:bg-transparent`}
      >
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Labelled stat used on dashboards and order summaries. */
export function StatRow({ label, value, tone = 'default', className = '' }) {
  const tones = {
    default: 'text-ink-900',
    muted: 'text-ink-500',
    success: 'text-success-600',
    danger: 'text-danger-600',
    brand: 'text-brand-600',
  };
  return (
    <div className={`flex items-center justify-between gap-4 text-sm ${className}`}>
      <span className="text-ink-500">{label}</span>
      <span className={`font-semibold tabular-nums ${tones[tone]}`}>{value}</span>
    </div>
  );
}

/** Tabs used by the account section and admin sub-pages. */
export function Tabs({ tabs = [], value, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 overflow-x-auto no-scrollbar border-b border-ink-200 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`relative shrink-0 px-4 py-3 text-sm font-medium transition
                        ${active ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800'}`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-2 rounded-full px-1.5 py-0.5 text-2xs font-semibold ${active ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'}`}>
                {tab.count}
              </span>
            )}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        );
      })}
    </div>
  );
}

/** Responsive-friendly data table wrapper (horizontal scroll on mobile). */
export function DataTable({ columns = [], rows = [], keyField = '_id', emptyState, rowClassName, className = '' }) {
  if (!rows.length && emptyState) return emptyState;

  return (
    <div className={`overflow-hidden rounded-2xl border border-ink-200 bg-white ${className}`}>
      <div className="overflow-x-auto scroll-thin">
        <table className="table min-w-[720px]">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} style={column.width ? { width: column.width } : undefined} className={column.headerClassName}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row[keyField] || index} className={typeof rowClassName === 'function' ? rowClassName(row) : rowClassName}>
                {columns.map((column) => (
                  <td key={column.key} className={column.cellClassName}>
                    {column.render ? column.render(row, index) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Tooltip via CSS (no JS positioning) - good enough for icon buttons. */
export function Tooltip({ label, children, className = '' }) {
  return (
    <span className={`group/tt relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg
                   bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity
                   group-hover/tt:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

/** Copyable text block (order numbers, payment references). */
export function CopyableText({ value, label, onCopy, copied, className = '' }) {
  return (
    <button
      type="button"
      onClick={() => onCopy?.(value)}
      className={`group inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-xs text-ink-600 transition hover:bg-ink-100 ${className}`}
      title={`Copy ${label || value}`}
    >
      <span className="truncate">{value}</span>
      <Icon name={copied ? 'check' : 'copy'} className={`h-3.5 w-3.5 shrink-0 ${copied ? 'text-success-600' : 'text-ink-400 group-hover:text-ink-600'}`} />
    </button>
  );
}

export default Breadcrumbs;
