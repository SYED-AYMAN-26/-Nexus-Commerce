import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { EmptyState, ErrorState, SkeletonProductGrid } from '../ui/Feedback';
import { Pagination } from '../ui/Pagination';
import { ProductGrid } from './ProductCard';
import { ActiveFilterChips, FilterSidebar, SortSelect } from './Filters';
import { productApi } from '../../services';
import { useDebounce } from '../../hooks';

/**
 * Shared catalogue engine used by /products, /search and /category/:slug.
 *
 * Filters live in the URL (`?category=electronics&brand=Auralis&page=2`) so any
 * listing state is shareable, bookmarkable and survives a refresh. Query params
 * are always translated to the exact shape the API expects.
 */
const FILTER_KEYS = ['category', 'brand', 'minPrice', 'maxPrice', 'rating', 'inStock', 'search', 'sort', 'page', 'deals'];

export function ProductListing({
  title,
  description,
  breadcrumbs,
  lockedCategory = null,
  lockedSearch = null,
  defaultSort = 'newest',
  pageSize = 12,
  eyebrow,
  emptyTitle = 'No products found',
  emptyDescription = 'Try adjusting your filters or search for something else.',
  headerExtra = null,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [facets, setFacets] = useState(null);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [facetsLoading, setFacetsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  /** URL -> filter object */
  const filters = useMemo(() => {
    const parse = (value) => (value === undefined || value === '' ? undefined : value);
    return {
      category: lockedCategory || parse(searchParams.get('category')),
      search: lockedSearch || parse(searchParams.get('search')),
      brand: searchParams.get('brand') ? searchParams.get('brand').split(',').filter(Boolean) : [],
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      rating: searchParams.get('rating') ? Number(searchParams.get('rating')) : undefined,
      inStock: searchParams.get('inStock') === 'true' ? true : undefined,
      deals: searchParams.get('deals') === 'true' ? true : undefined,
      sort: searchParams.get('sort') || defaultSort,
      page: Number(searchParams.get('page')) || 1,
    };
  }, [searchParams, lockedCategory, lockedSearch, defaultSort]);

  /** filter object -> URL */
  const updateFilters = useCallback(
    (next, { resetPage = true } = {}) => {
      const params = new URLSearchParams(searchParams);
      const target = { ...next };
      if (resetPage) target.page = 1;

      FILTER_KEYS.forEach((key) => {
        if (key === 'category' && lockedCategory) return;
        if (key === 'search' && lockedSearch) return;

        const value = target[key];
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          params.delete(key);
        } else if (key === 'brand') {
          params.set(key, value.join(','));
        } else if (key === 'sort' && value === defaultSort) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      if (params.get('page') === '1') params.delete('page');
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, lockedCategory, lockedSearch, defaultSort],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (lockedSearch) params.set('search', lockedSearch);
    setSearchParams(params, { replace: true });
  }, [setSearchParams, lockedSearch]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count += 1;
    if (filters.brand?.length) count += 1;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
    if (filters.rating) count += 1;
    if (filters.inStock) count += 1;
    if (filters.search) count += 1;
    return count;
  }, [filters]);

  /* --------------------------------------------------------------- fetching */

  useEffect(() => {
    let cancelled = false;
    setFacetsLoading(true);
    productApi
      .facets()
      .then((data) => !cancelled && setFacets(data))
      .catch(() => {})
      .finally(() => !cancelled && setFacetsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = {
      page: filters.page,
      limit: pageSize,
      sort: filters.sort,
    };
    if (filters.category) params.category = filters.category;
    if (filters.search) params.search = filters.search;
    if (filters.brand?.length) params.brand = filters.brand.join(',');
    if (filters.minPrice !== undefined) params.minPrice = filters.minPrice;
    if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
    if (filters.rating) params.rating = filters.rating;
    if (filters.inStock) params.inStock = 'true';
    if (filters.deals) {
      params.minPrice = params.minPrice ?? 1;
      params.sort = params.sort === defaultSort ? 'price-asc' : params.sort;
    }

    productApi
      .list(params)
      .then((data) => {
        if (cancelled) return;
        setProducts(data.products || []);
        setPagination(data.pagination || { page: 1, total: 0, totalPages: 1 });
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [filters, pageSize, defaultSort]);

  const categories = facets?.categories || [];

  const sidebar = (
    <FilterSidebar
      filters={filters}
      onChange={(next) => {
        updateFilters(next);
        setFiltersOpen(false);
      }}
      facets={facets}
      categories={categories}
      loading={facetsLoading}
      onClear={clearFilters}
      activeCount={activeFilterCount}
    />
  );

  return (
    <div className="container-page py-8 lg:py-10">
      {/* ------------------------------------------------------------ header */}
      <header className="mb-8">
        {breadcrumbs}
        {eyebrow && <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>}
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
            {description && <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>}
          </div>
          {headerExtra}
        </div>
      </header>

      <div className="flex gap-8">
        {/* ---------------------------------------------------------- sidebar */}
        <div className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scroll-thin pr-1">{sidebar}</div>
        </div>

        {/* ------------------------------------------------------------ grid */}
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setFiltersOpen(true)}
                icon={<Icon name="filter" className="h-4 w-4" />}
              >
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <p className="text-sm text-ink-500">
                {loading ? (
                  <span className="inline-block h-3.5 w-28 animate-pulse-soft rounded bg-ink-200" />
                ) : (
                  <>
                    <span className="font-semibold text-ink-900">{pagination.total}</span>{' '}
                    {pagination.total === 1 ? 'product' : 'products'}
                  </>
                )}
              </p>
            </div>

            <SortSelect value={filters.sort} onChange={(sort) => updateFilters({ ...filters, sort })} />
          </div>

          {activeFilterCount > 0 && (
            <div className="mb-5">
              <ActiveFilterChips filters={filters} onChange={updateFilters} categories={categories} onClear={clearFilters} />
            </div>
          )}

          {error ? (
            <ErrorState error={error} onRetry={() => updateFilters({ ...filters }, { resetPage: false })} />
          ) : loading ? (
            <SkeletonProductGrid count={pageSize} className="lg:grid-cols-3" />
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50/50">
              <EmptyState
                icon="search"
                title={emptyTitle}
                description={emptyDescription}
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    {activeFilterCount > 0 && (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear all filters
                      </Button>
                    )}
                    <Button to="/products">Browse everything</Button>
                  </div>
                }
              />
            </div>
          ) : (
            <>
              <ProductGrid products={products} columns="grid-cols-2 lg:grid-cols-3" />
              <Pagination
                className="mt-10"
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                showSummary
                onChange={(page) => {
                  updateFilters({ ...filters, page }, { resetPage: false });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} side="left" title="Filters" width="max-w-sm">
        <div className="p-5">{sidebar}</div>
      </Drawer>
    </div>
  );
}

/**
 * Debounced search term sync - used by the search page so typing updates the
 * results without a request per keystroke.
 */
export function useSyncedSearch(value, delay = 400) {
  const debounced = useDebounce(value, delay);
  const [, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (debounced === undefined) return;
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (debounced) next.set('search', debounced);
      else next.delete('search');
      next.delete('page');
      return next;
    }, { replace: true });
  }, [debounced, setSearchParams]);
}

export default ProductListing;
