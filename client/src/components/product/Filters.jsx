import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Checkbox, Radio } from '../ui/Form';
import { Skeleton } from '../ui/Feedback';
import { RATING_FILTERS, SORT_OPTIONS } from '../../utils/constants';
import { formatMoney } from '../../utils/format';

/**
 * Catalogue filter panel.
 * Controlled: the parent owns `filters` and receives `onChange(next)`.
 *
 * @param {object} filters { category, brand[], minPrice, maxPrice, rating, inStock, sort }
 */
export function FilterSidebar({
  filters,
  onChange,
  facets,
  categories = [],
  loading = false,
  onClear,
  activeCount = 0,
  className = '',
}) {
  const [priceDraft, setPriceDraft] = useState({ min: filters.minPrice || '', max: filters.maxPrice || '' });
  const [expanded, setExpanded] = useState({ category: true, price: true, brand: true, rating: true, availability: true });

  useEffect(() => {
    setPriceDraft({ min: filters.minPrice || '', max: filters.maxPrice || '' });
  }, [filters.minPrice, filters.maxPrice]);

  const toggle = (key) => setExpanded((current) => ({ ...current, [key]: !current[key] }));
  const selectedBrands = filters.brand || [];

  const setBrands = (brands) => onChange({ ...filters, brand: brands, page: 1 });

  const applyPrice = () => {
    onChange({
      ...filters,
      minPrice: priceDraft.min === '' ? undefined : Number(priceDraft.min),
      maxPrice: priceDraft.max === '' ? undefined : Number(priceDraft.max),
      page: 1,
    });
  };

  const priceBounds = facets?.priceRange || { min: 0, max: 100000 };

  return (
    <aside className={`space-y-6 ${className}`} aria-label="Product filters">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-900">
          <Icon name="sliders" className="h-4 w-4" />
          Filters
        </h2>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="text-xs font-semibold text-brand-600 hover:underline">
            Clear all ({activeCount})
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ------------------------------------------------------ category */}
          {categories.length > 0 && (
            <FilterSection title="Category" expanded={expanded.category} onToggle={() => toggle('category')}>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, category: undefined, page: 1 })}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition
                              ${!filters.category ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-600 hover:bg-ink-50'}`}
                >
                  All categories
                </button>
                {categories.map((category) => {
                  const active = filters.category === category.slug;
                  return (
                    <button
                      key={category._id}
                      type="button"
                      onClick={() => onChange({ ...filters, category: active ? undefined : category.slug, page: 1 })}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition
                                  ${active ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-600 hover:bg-ink-50'}`}
                    >
                      <span className="truncate">{category.name}</span>
                      <span className="ml-2 shrink-0 text-xs text-ink-400">{category.productCount ?? ''}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>
          )}

          {/* --------------------------------------------------------- price */}
          <FilterSection title="Price" expanded={expanded.price} onToggle={() => toggle('price')}>
            <p className="mb-3 text-xs text-ink-500">
              Range in store: {formatMoney(priceBounds.min)} – {formatMoney(priceBounds.max)}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="Min"
                value={priceDraft.min}
                onChange={(event) => setPriceDraft((draft) => ({ ...draft, min: event.target.value }))}
                onKeyDown={(event) => event.key === 'Enter' && applyPrice()}
                className="input px-3 py-2 text-sm"
                aria-label="Minimum price"
              />
              <span className="text-ink-400">–</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="Max"
                value={priceDraft.max}
                onChange={(event) => setPriceDraft((draft) => ({ ...draft, max: event.target.value }))}
                onKeyDown={(event) => event.key === 'Enter' && applyPrice()}
                className="input px-3 py-2 text-sm"
                aria-label="Maximum price"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: 'Under ₹1,000', min: undefined, max: 1000 },
                { label: '₹1K – ₹5K', min: 1000, max: 5000 },
                { label: '₹5K – ₹15K', min: 5000, max: 15000 },
                { label: '₹15K+', min: 15000, max: undefined },
              ].map((preset) => {
                const active = filters.minPrice === preset.min && filters.maxPrice === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onChange({ ...filters, minPrice: preset.min, maxPrice: preset.max, page: 1 })}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition
                                ${active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-ink-300'}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <Button size="sm" variant="outline" fullWidth className="mt-3" onClick={applyPrice}>
              Apply price
            </Button>
          </FilterSection>

          {/* --------------------------------------------------------- brand */}
          {facets?.brands?.length > 0 && (
            <FilterSection title="Brand" expanded={expanded.brand} onToggle={() => toggle('brand')}>
              <div className="max-h-56 space-y-1 overflow-y-auto scroll-thin pr-1">
                {facets.brands.map((brand) => {
                  const checked = selectedBrands.includes(brand.name);
                  return (
                    <label
                      key={brand.name}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition hover:bg-ink-50"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={checked}
                          onChange={() =>
                            setBrands(checked ? selectedBrands.filter((b) => b !== brand.name) : [...selectedBrands, brand.name])
                          }
                        />
                        <span className="truncate text-ink-700">{brand.name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-400">{brand.count}</span>
                    </label>
                  );
                })}
              </div>
            </FilterSection>
          )}

          {/* -------------------------------------------------------- rating */}
          <FilterSection title="Customer rating" expanded={expanded.rating} onToggle={() => toggle('rating')}>
            <div className="space-y-1.5">
              {RATING_FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange({ ...filters, rating: filters.rating === option.value ? undefined : option.value, page: 1 })}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition
                              ${filters.rating === option.value ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-600 hover:bg-ink-50'}`}
                >
                  <span className="flex text-warning-500">
                    {Array.from({ length: option.value }).map((_, i) => (
                      <Icon key={i} name="star" className="h-3.5 w-3.5" filled strokeWidth={0} />
                    ))}
                  </span>
                  <span>& above</span>
                </button>
              ))}
            </div>
          </FilterSection>

          {/* -------------------------------------------------- availability */}
          <FilterSection title="Availability" expanded={expanded.availability} onToggle={() => toggle('availability')}>
            <Checkbox
              label="In stock only"
              checked={Boolean(filters.inStock)}
              onChange={(event) => onChange({ ...filters, inStock: event.target.checked || undefined, page: 1 })}
            />
          </FilterSection>
        </>
      )}
    </aside>
  );
}

function FilterSection({ title, children, expanded = true, onToggle }) {
  return (
    <div className="border-b border-ink-100 pb-5 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="mb-3 flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-ink-900">{title}</span>
        <Icon name={expanded ? 'chevronUp' : 'chevronDown'} className="h-4 w-4 text-ink-400" />
      </button>
      {expanded && <div className="animate-fade-in">{children}</div>}
    </div>
  );
}

/** Sort dropdown shown above the product grid. */
export function SortSelect({ value = 'newest', onChange, className = '' }) {
  return (
    <label className={`flex items-center gap-2 ${className}`}>
      <span className="hidden text-sm text-ink-500 sm:block">Sort by</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="select w-auto py-2 text-sm" aria-label="Sort products">
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Removable chips summarising the filters currently applied. */
export function ActiveFilterChips({ filters, onChange, categories = [], onClear }) {
  const chips = [];

  if (filters.category) {
    const category = categories.find((c) => c.slug === filters.category);
    chips.push({ key: 'category', label: category?.name || filters.category, clear: () => onChange({ ...filters, category: undefined, page: 1 }) });
  }
  (filters.brand || []).forEach((brand) => {
    chips.push({
      key: `brand-${brand}`,
      label: brand,
      clear: () => onChange({ ...filters, brand: (filters.brand || []).filter((b) => b !== brand), page: 1 }),
    });
  });
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    chips.push({
      key: 'price',
      label: `${filters.minPrice ? formatMoney(filters.minPrice) : 'Any'} – ${filters.maxPrice ? formatMoney(filters.maxPrice) : 'Any'}`,
      clear: () => onChange({ ...filters, minPrice: undefined, maxPrice: undefined, page: 1 }),
    });
  }
  if (filters.rating) {
    chips.push({ key: 'rating', label: `${filters.rating}★ & above`, clear: () => onChange({ ...filters, rating: undefined, page: 1 }) });
  }
  if (filters.inStock) {
    chips.push({ key: 'inStock', label: 'In stock only', clear: () => onChange({ ...filters, inStock: undefined, page: 1 }) });
  }
  if (filters.search) {
    chips.push({ key: 'search', label: `“${filters.search}”`, clear: () => onChange({ ...filters, search: undefined, page: 1 }) });
  }

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span key={chip.key} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white py-1 pl-3 pr-1.5 text-xs font-medium text-ink-700">
          {chip.label}
          <button
            type="button"
            onClick={chip.clear}
            aria-label={`Remove ${chip.label} filter`}
            className="rounded-full p-0.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <Icon name="x" className="h-3 w-3" />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={onClear} className="text-xs font-semibold text-brand-600 hover:underline">
          Clear all
        </button>
      )}
    </div>
  );
}

export default FilterSidebar;
