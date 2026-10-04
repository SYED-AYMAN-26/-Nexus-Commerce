import { Link } from 'react-router-dom';
import { productApi } from '../services';
import { useAsyncData } from '../hooks';
import { Breadcrumbs, SectionHeader } from '../components/ui/Misc';
import { Skeleton, ErrorState } from '../components/ui/Feedback';
import { Icon } from '../components/ui/Icon';

/** Index of every department. */
export default function Categories() {
  const { data, loading, error, refresh } = useAsyncData(() => productApi.categories(), []);
  const categories = data?.categories || [];

  return (
    <div className="container-page py-8 lg:py-12">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Categories' }]} />

      <SectionHeader
        className="mt-4"
        eyebrow="Departments"
        title="Shop by category"
        description="Everything in the store, organised the way you would organise it."
      />

      {error ? (
        <ErrorState className="mt-10" error={error} onRetry={refresh} />
      ) : loading ? (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => (
            <Link
              key={category._id}
              to={`/category/${category.slug}`}
              className="group relative flex animate-fade-in-up overflow-hidden rounded-2xl border border-ink-200 bg-white
                         transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card-hover"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="relative h-40 w-40 shrink-0 overflow-hidden bg-ink-50">
                <img
                  src={category.image}
                  alt={category.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col justify-center p-5">
                <h2 className="text-base font-bold text-ink-900 transition group-hover:text-brand-700">{category.name}</h2>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-500">{category.description}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                  {category.productCount} products
                  <Icon name="arrowRight" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
