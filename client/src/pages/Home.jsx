import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { productApi } from '../services';
import { useAsyncData } from '../hooks';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Badge } from '../components/ui/Badge';
import { RatingStars } from '../components/ui/Rating';
import { SectionHeader } from '../components/ui/Misc';
import { ProductRail, ProductGrid } from '../components/product/ProductCard';
import { SkeletonProductGrid, Skeleton, ErrorState } from '../components/ui/Feedback';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { formatMoney } from '../utils/format';

/* -------------------------------------------------------------------- hero */

function Hero({ deals }) {
  const spotlight = deals?.[0];

  return (
    <section className="relative overflow-hidden bg-ink-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.4),transparent_55%),radial-gradient(circle_at_85%_75%,rgba(139,92,246,0.35),transparent_50%)]" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div className="container-page relative grid gap-12 py-14 lg:grid-cols-2 lg:items-center lg:py-24">
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-success-400" />
            New season drop is live
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Shop smarter.
            <br />
            <span className="bg-gradient-to-r from-brand-300 to-brand-100 bg-clip-text text-transparent">Live better.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-300 sm:text-lg">
            Curated electronics, fashion and home essentials with honest pricing, verified reviews and delivery you can
            actually plan around.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button to="/products" size="lg" icon={<Icon name="bag" className="h-5 w-5" />}>
              Shop the collection
            </Button>
            <Button
              to="/products?deals=true"
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
              icon={<Icon name="percent" className="h-5 w-5" />}
            >
              View today&apos;s deals
            </Button>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {[
              { label: 'Products', value: '30+' },
              { label: 'Happy customers', value: '12K+' },
              { label: 'Avg. rating', value: '4.8/5' },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-2xs uppercase tracking-wider text-ink-400">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-bold text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {spotlight && (
          <div className="relative animate-fade-in-up lg:pl-8" style={{ animationDelay: '120ms' }}>
            <div className="absolute -right-6 -top-6 hidden h-32 w-32 rounded-full bg-brand-500/25 blur-3xl lg:block" />
            <Link
              to={`/product/${spotlight.slug}`}
              className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur-lg transition hover:border-white/20"
            >
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src={spotlight.images?.[0]}
                  alt={spotlight.name}
                  className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-80"
                />
                <span className="absolute left-4 top-4 rounded-full bg-danger-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg">
                  {spotlight.discountPercentage}% off today
                </span>
              </div>

              <div className="flex items-end justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-brand-300">{spotlight.brand}</p>
                  <h2 className="mt-1 line-clamp-2 text-lg font-bold text-white">{spotlight.name}</h2>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xl font-bold text-white">{formatMoney(spotlight.finalPrice)}</span>
                    <span className="text-sm text-ink-400 line-through">{formatMoney(spotlight.price)}</span>
                  </div>
                  <div className="mt-2">
                    <RatingStars value={spotlight.rating} size="sm" showValue showCount count={spotlight.numReviews} />
                  </div>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-ink-900 transition group-hover:scale-110">
                  <Icon name="arrowRight" className="h-5 w-5" />
                </span>
              </div>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- value props */

function ValueProps() {
  const items = [
    { icon: 'truckFast', title: 'Free shipping', copy: 'On every order above ₹1,999' },
    { icon: 'shield', title: 'Secure checkout', copy: 'Encrypted payments, no card storage' },
    { icon: 'rotate', title: '7-day returns', copy: 'Changed your mind? Send it back' },
    { icon: 'headphones', title: 'Real support', copy: 'Humans, seven days a week' },
  ];

  return (
    <section className="border-b border-ink-200 bg-white">
      <div className="container-page grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Icon name={item.icon} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">{item.title}</p>
              <p className="text-xs text-ink-500">{item.copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- categories */

function CategoryTiles({ categories }) {
  if (!categories?.length) return null;

  return (
    <section className="container-page section">
      <SectionHeader
        eyebrow="Browse by category"
        title="Find exactly what you need"
        description="Eight curated departments, curated products and counting."
        action={
          <Button to="/categories" variant="outline" size="sm" iconRight={<Icon name="arrowRight" className="h-4 w-4" />}>
            All categories
          </Button>
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.slice(0, 8).map((category) => (
          <Link
            key={category._id}
            to={`/category/${category.slug}`}
            className="group relative overflow-hidden rounded-2xl border border-ink-200 bg-white transition-all duration-300
                       hover:-translate-y-1 hover:border-brand-200 hover:shadow-card-hover"
          >
            <div className="aspect-[4/3] overflow-hidden bg-ink-50">
              <img
                src={category.image}
                alt={category.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/85 to-transparent p-4 pt-10">
              <p className="text-sm font-bold text-white">{category.name}</p>
              <p className="text-2xs text-ink-300">{category.productCount} products</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- deals */

function DealBand({ deals }) {
  if (!deals?.length) return null;

  return (
    <section className="relative overflow-hidden bg-ink-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(239,68,68,0.28),transparent_55%),radial-gradient(circle_at_10%_80%,rgba(99,102,241,0.3),transparent_50%)]" />

      <div className="container-page relative grid gap-10 py-14 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <Badge tone="danger" size="lg" className="bg-danger-600 text-white">
            Flash sale
          </Badge>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            Up to 40% off today&apos;s best sellers
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-300">
            Prices this good do not wait. Grab the deal while stock lasts — the timer resets at midnight.
          </p>
          <CountdownTimer className="mt-7" size="lg" />
          <div className="mt-8">
            <Button to="/products?deals=true" size="lg" iconRight={<Icon name="arrowRight" className="h-5 w-5" />}>
              Shop all deals
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {deals.slice(0, 4).map((product) => (
            <Link
              key={product._id}
              to={`/product/${product.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur transition hover:border-white/20 hover:bg-white/10"
            >
              <img src={product.images?.[0]} alt={product.name} loading="lazy" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold text-white">{product.name}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{formatMoney(product.finalPrice)}</span>
                  <span className="text-xs text-ink-400 line-through">{formatMoney(product.price)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- page */

export default function Home() {
  const { data, loading, error, refresh } = useAsyncData(() => productApi.home(), []);

  const rails = useMemo(
    () => ({
      featured: data?.featured || [],
      newArrivals: data?.newArrivals || [],
      bestSellers: data?.bestSellers || [],
      deals: data?.deals || [],
      categories: data?.categories || [],
    }),
    [data],
  );

  if (error) {
    return (
      <div className="container-page section">
        <ErrorState error={error} onRetry={refresh} title="We could not load the store" />
      </div>
    );
  }

  return (
    <>
      <Hero deals={rails.deals} />
      <ValueProps />

      {loading ? (
        <div className="container-page section space-y-16">
          <div>
            <Skeleton className="h-8 w-64" />
            <SkeletonProductGrid count={4} className="mt-8" />
          </div>
        </div>
      ) : (
        <>
          {rails.featured.length > 0 && (
            <section className="container-page section">
              <SectionHeader
                eyebrow="Handpicked"
                title="Featured this week"
                description="Picks our merchandising team keeps coming back to."
                action={
                  <Button to="/products?sort=popular" variant="outline" size="sm" iconRight={<Icon name="arrowRight" className="h-4 w-4" />}>
                    See more
                  </Button>
                }
              />
              <ProductRail className="mt-8" products={rails.featured.slice(0, 8)} />
            </section>
          )}

          <DealBand deals={rails.deals} />

          <CategoryTiles categories={rails.categories} />

          {rails.newArrivals.length > 0 && (
            <section className="bg-ink-50 py-14 sm:py-16">
              <div className="container-page">
                <SectionHeader
                  eyebrow="Just landed"
                  title="New arrivals"
                  description="Fresh stock added this month across every department."
                  action={
                    <Button to="/products?sort=newest" variant="outline" size="sm" iconRight={<Icon name="arrowRight" className="h-4 w-4" />}>
                      View all new
                    </Button>
                  }
                />
                <ProductGrid className="mt-8" products={rails.newArrivals.slice(0, 8)} />
              </div>
            </section>
          )}

          {rails.bestSellers.length > 0 && (
            <section className="container-page section">
              <SectionHeader
                eyebrow="Customer favourites"
                title="Best sellers"
                description="Ranked by real sales, not by us."
                action={
                  <Button to="/products?sort=popular" variant="outline" size="sm" iconRight={<Icon name="arrowRight" className="h-4 w-4" />}>
                    Shop best sellers
                  </Button>
                }
              />
              <ProductGrid className="mt-8" products={rails.bestSellers.slice(0, 8)} />
            </section>
          )}

          <section className="container-page pb-16">
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-7 text-white lg:col-span-2">
                <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
                <div className="relative">
                  <Badge tone="neutral" size="sm" className="bg-white/20 text-white">
                    Limited time
                  </Badge>
                  <h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Get 10% off your first order</h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-100">
                    Create an account and use code <span className="font-bold text-white">WELCOME10</span> at checkout.
                    Applies to orders over ₹999, up to ₹500 off.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button to="/register" className="bg-white text-brand-700 hover:bg-brand-50">
                      Create free account
                    </Button>
                    <Button to="/products" variant="ghost" className="text-white hover:bg-white/10">
                      Browse products
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-ink-200 bg-white p-7">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-warning-100 text-warning-700">
                  <Icon name="gift" className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink-900">Free shipping week</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  Every order above ₹1,999 ships free with tracked delivery and a 7-day return window — no membership
                  required.
                </p>
                <Link to="/help" className="link mt-4 inline-flex items-center gap-1 text-sm">
                  Delivery details
                  <Icon name="arrowRight" className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
