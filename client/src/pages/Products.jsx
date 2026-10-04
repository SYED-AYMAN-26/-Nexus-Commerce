import { Breadcrumbs } from '../components/ui/Misc';
import { ProductListing } from '../components/product/ProductListing';

/** Full catalogue with search, filters, sorting and pagination. */
export default function Products() {
  return (
    <ProductListing
      eyebrow="Shop all"
      title="All products"
      description="Browse the complete Nexus catalogue. Use the filters to narrow by category, brand, price, rating or availability."
      breadcrumbs={<Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'All products' }]} />}
      emptyTitle="No products match those filters"
      emptyDescription="Try widening your price range or clearing a filter or two."
    />
  );
}
