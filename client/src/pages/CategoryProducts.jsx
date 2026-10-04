import { useParams } from 'react-router-dom';
import { productApi } from '../services';
import { useAsyncData } from '../hooks';
import { Breadcrumbs } from '../components/ui/Misc';
import { ProductListing } from '../components/product/ProductListing';
import { Badge } from '../components/ui/Badge';
import { ErrorState } from '../components/ui/Feedback';

/** Products filtered to a single category, resolved from the URL slug. */
export default function CategoryProducts() {
  const { slug } = useParams();
  const { data, loading, error, refresh } = useAsyncData(() => productApi.category(slug), [slug]);

  if (error?.status === 404) {
    return (
      <div className="container-page py-16">
        <ErrorState
          title="Category not found"
          error={{ message: `We could not find a category called “${slug}”.` }}
          onRetry={refresh}
        />
      </div>
    );
  }

  const category = data?.category;

  return (
    <ProductListing
      key={slug}
      eyebrow="Category"
      title={loading ? 'Loading category…' : category?.name || slug}
      description={category?.description}
      lockedCategory={slug}
      breadcrumbs={
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Categories', to: '/categories' },
            { label: category?.name || slug },
          ]}
        />
      }
      headerExtra={
        category ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand" size="lg">{category.productCount} products</Badge>
            {category.featured && <Badge tone="warning" size="lg">Featured department</Badge>}
          </div>
        ) : null
      }
      emptyTitle={`Nothing in ${category?.name || 'this category'} yet`}
      emptyDescription="New stock is added weekly — check back soon or browse another department."
    />
  );
}
