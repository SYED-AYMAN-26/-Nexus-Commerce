import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Spinner } from '../ui/Icon';
import { productApi } from '../../services';
import { useDebounce, useClickOutside } from '../../hooks';
import { formatMoney } from '../../utils/format';

const RECENT_KEY = 'nexus.recentSearches';

const readRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 5);
  } catch {
    return [];
  }
};

/**
 * Header search with live suggestions.
 * Arrow keys move through results, Enter opens the highlighted item or runs a
 * full search, Escape closes the panel.
 */
export function SearchBar({ variant = 'desktop', onNavigate, autoFocus = false, className = '' }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ products: [], suggestions: [] });
  const [recent, setRecent] = useState(readRecent);
  const [highlight, setHighlight] = useState(-1);
  const debounced = useDebounce(term, 280);
  const wrapperRef = useClickOutside(() => setOpen(false), { enabled: open });

  useEffect(() => {
    let cancelled = false;
    const query = debounced.trim();

    if (query.length < 2) {
      setResults({ products: [], suggestions: [] });
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    productApi
      .suggest(query, 5)
      .then((data) => {
        if (!cancelled) setResults({ products: data.products || [], suggestions: data.suggestions || [] });
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const rememberSearch = (value) => {
    const next = [value, ...readRecent().filter((item) => item !== value)].slice(0, 5);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setRecent(next);
  };

  const goToSearch = (value = term) => {
    const query = value.trim();
    if (!query) return;
    rememberSearch(query);
    setOpen(false);
    setTerm(query);
    onNavigate?.();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const goToProduct = (slug) => {
    rememberSearch(term.trim());
    setOpen(false);
    onNavigate?.();
    navigate(`/product/${slug}`);
  };

  const flatResults = results.products;

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => Math.min(index + 1, flatResults.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (highlight >= 0 && flatResults[highlight]) goToProduct(flatResults[highlight].slug);
      else goToSearch();
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const showPanel = open && (term.trim().length >= 2 || recent.length > 0);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          goToSearch();
        }}
        role="search"
        className="relative"
      >
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          value={term}
          autoFocus={autoFocus}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for products, brands and categories…"
          aria-label="Search products"
          aria-expanded={showPanel}
          role="combobox"
          aria-controls="search-suggestions"
          className="w-full rounded-xl border border-ink-200 bg-ink-50/70 py-2.5 pl-10 pr-24 text-sm text-ink-900
                     placeholder:text-ink-400 transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 focus:outline-none"
        />
        {term ? (
          <button
            type="button"
            onClick={() => { setTerm(''); setResults({ products: [], suggestions: [] }); }}
            aria-label="Clear search"
            className="absolute right-[4.5rem] top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 transition hover:bg-ink-200/60 hover:text-ink-700"
          >
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button type="submit" className="btn btn-primary btn-sm absolute right-1.5 top-1/2 -translate-y-1/2 px-3">
          Search
        </button>
      </form>

      {showPanel && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] animate-fade-in-up overflow-y-auto scroll-thin
                     rounded-2xl border border-ink-200 bg-white p-2 shadow-popover"
        >
          {loading && (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-ink-500">
              <Spinner className="h-4 w-4 text-brand-600" label="Searching" />
              Searching…
            </div>
          )}

          {!loading && term.trim().length < 2 && recent.length > 0 && (
            <div className="p-1">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-2xs font-semibold uppercase tracking-wide text-ink-400">Recent searches</span>
                <button
                  type="button"
                  onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}
                  className="text-2xs font-semibold text-brand-600 hover:underline"
                >
                  Clear
                </button>
              </div>
              {recent.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => goToSearch(item)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-600 transition hover:bg-ink-50"
                >
                  <Icon name="clock" className="h-4 w-4 text-ink-400" />
                  {item}
                </button>
              ))}
            </div>
          )}

          {!loading && term.trim().length >= 2 && flatResults.length === 0 && results.suggestions.length === 0 && (
            <div className="px-3 py-6 text-center">
              <Icon name="search" className="mx-auto h-6 w-6 text-ink-300" />
              <p className="mt-2 text-sm font-medium text-ink-700">No matches for “{term}”</p>
              <p className="mt-1 text-xs text-ink-500">Try a different keyword, brand or category.</p>
            </div>
          )}

          {!loading && results.suggestions.length > 0 && (
            <div className="border-b border-ink-100 p-1 pb-2">
              <span className="block px-2.5 py-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-400">Suggestions</span>
              {results.suggestions.slice(0, 4).map((suggestion) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                    navigate(suggestion.href);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-600 transition hover:bg-ink-50"
                >
                  <Icon name={suggestion.type === 'category' ? 'grid' : suggestion.type === 'brand' ? 'tag' : 'search'} className="h-4 w-4 text-ink-400" />
                  <span className="truncate">{suggestion.label}</span>
                  <span className="ml-auto shrink-0 text-2xs uppercase text-ink-400">{suggestion.type}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && flatResults.length > 0 && (
            <div className="p-1">
              <span className="block px-2.5 py-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-400">Products</span>
              {flatResults.map((product, index) => (
                <button
                  key={product._id}
                  type="button"
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => goToProduct(product.slug)}
                  className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${highlight === index ? 'bg-brand-50' : 'hover:bg-ink-50'}`}
                >
                  <img src={product.images?.[0]} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" loading="lazy" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-900">{product.name}</span>
                    <span className="block truncate text-xs text-ink-500">{product.brand}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-ink-900">{formatMoney(product.finalPrice)}</span>
                </button>
              ))}
            </div>
          )}

          {term.trim().length >= 2 && (
            <button
              type="button"
              onClick={() => goToSearch()}
              className="mt-1 flex w-full items-center justify-between rounded-xl bg-ink-50 px-3 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              See all results for “{term}”
              <Icon name="arrowRight" className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
