import { useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/ui/Misc';
import { ProductListing } from '../components/product/ProductListing';

/**
 * Search results page.
 * The query lives in the URL (`/search?q=…`) so results are shareable.
 * The listing engine receives it as a locked filter so the user cannot clear it
 * from the filter chips but can still refine within the results.
 */
export default function SearchResults() {
  const [params] = useSearchParams();
  const query = params.get('q') || params.get('search') || '';

  return (
    <ProductListing
      key={query}
      eyebrow="Search"
      title={query ? `Results for “${query}”` : 'Search products'}
      description={
        query
          ? 'Matching products across names, descriptions, brands and categories. Refine further with the filters.'
          : 'Type a product name, brand or category in the search bar above to get started.'
      }
      lockedSearch={query || null}
      breadcrumbs={<Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Search' }, ...(query ? [{ label: query }] : [])]} />}
      emptyTitle={query ? `No results for “${query}”` : 'Start typing to search'}
      emptyDescription="Check the spelling, try a broader term, or browse a category instead."
    />
  );
}
