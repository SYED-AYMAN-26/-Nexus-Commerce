import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../services';
import { useAsyncData } from '../hooks';
import { Button } from '../components/ui/Button';
import { Icon, StarIcon } from '../components/ui/Icon';
import { Badge, DiscountBadge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Form';
import { Breadcrumbs, QuantityStepper, Tabs } from '../components/ui/Misc';
import { RatingStars } from '../components/ui/Rating';
import { ErrorState, Progress, Skeleton } from '../components/ui/Feedback';
import { ProductGallery } from '../components/product/ProductGallery';
import { VariantSelector } from '../components/product/VariantSelector';
import { ProductGrid } from '../components/product/ProductCard';
import { ProductReviews } from '../components/product/Reviews';
import { formatMoney } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

const DETAIL_TABS = [
  { value: 'description', label: 'Description' },
  { value: 'specifications', label: 'Specifications' },
  { value: 'shipping', label: 'Shipping & returns' },
  { value: 'reviews', label: 'Reviews' },
];

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, isWishlisted, toggleWishlist } = useAuth();
  const { addItem, mutating } = useCart();

  const { data, loading, error, refresh } = useAsyncData(() => productApi.detail(slug), [slug]);

  const [variant, setVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState('description');
  const [buying, setBuying] = useState(false);

  const product = data?.product;

  // Preselect the first in-stock variant whenever the product changes
  useEffect(() => {
    setVariant(null);
    setQuantity(1);
    setTab('description');
    if (product?.variants?.length) {
      const firstAvailable = product.variants.find((v) => v.isActive !== false && v.stock > 0) || product.variants[0];
      setVariant(firstAvailable);
    }
  }, [product]);

  const pricing = useMemo(() => {
    if (!product) return { finalPrice: 0, compareAt: null, discount: 0 };
    const base = product.finalPrice ?? product.price;
    const finalPrice = Math.max(0, base + (variant?.priceDelta || 0));
    const compareAt = product.discountPrice > 0 && product.discountPrice < product.price ? product.price : null;
    const discount = compareAt ? Math.round(((compareAt - finalPrice) / compareAt) * 100) : 0;
    return { finalPrice, compareAt, discount: Math.max(0, discount) };
  }, [product, variant]);

  const maxQty = useMemo(() => {
    if (!product) return 1;
    const stock = variant ? variant.stock : product.stock;
    return Math.max(1, Math.min(stock, 10));
  }, [product, variant]);

  const inStock = variant ? variant.stock > 0 : (product?.stock ?? 0) > 0;
  const saved = product ? isWishlisted(product._id) : false;

  const handleAddToCart = async ({ thenCheckout = false } = {}) => {
    if (!inStock) {
      toast.warning('This product is currently out of stock');
      return;
    }
    if (product.variants?.length && !variant) {
      toast.warning('Please choose an option first');
      return;
    }

    setBuying(thenCheckout);
    const ok = await addItem(product, quantity, variant);
    setBuying(false);
    if (ok && thenCheckout) {
      navigate(isAuthenticated ? '/checkout' : `/login?redirect=${encodeURIComponent('/checkout')}`);
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      toast.info('Sign in to save products to your wishlist', {
        action: { label: 'Sign in', onClick: () => navigate(`/login?redirect=${encodeURIComponent(`/product/${slug}`)}`) },
      });
      return;
    }
    try {
      const result = await toggleWishlist(product._id);
      toast.success(result.saved ? 'Saved to your wishlist' : 'Removed from your wishlist');
    } catch (err) {
      toast.error(err.message);
    }
  };

  /* ------------------------------------------------------------- states */

  if (loading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <div className="container-page py-16">
        <ErrorState
          error={error || { message: 'This product is no longer available.' }}
          onRetry={refresh}
          title={error?.status === 404 ? 'Product not found' : 'We could not load this product'}
        />
      </div>
    );
  }

  const images = [variant?.image, ...(product.images || [])].filter(Boolean);
  const uniqueImages = [...new Set(images)];

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Products', to: '/products' },
          ...(product.category ? [{ label: product.category.name, to: `/category/${product.category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* ------------------------------------------------------- gallery */}
        <ProductGallery
          images={uniqueImages}
          name={product.name}
          badges={product.badges}
          discountPercentage={pricing.discount}
        />

        {/* --------------------------------------------------------- buy box */}
        <div className="lg:pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/products?brand=${encodeURIComponent(product.brand)}`} className="text-xs font-bold uppercase tracking-wide text-brand-600 hover:underline">
              {product.brand}
            </Link>
            {product.category && (
              <>
                <span className="text-ink-300">·</span>
                <Link to={`/category/${product.category.slug}`} className="text-xs font-medium text-ink-500 hover:text-ink-800">
                  {product.category.name}
                </Link>
              </>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-ink-900 sm:text-3xl">{product.name}</h1>

          {product.shortDescription && <p className="mt-3 text-base leading-relaxed text-ink-500">{product.shortDescription}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <RatingStars value={product.rating} size="md" />
              <span className="text-sm font-semibold text-ink-800">{Number(product.rating || 0).toFixed(1)}</span>
              <button
                type="button"
                onClick={() => { setTab('reviews'); document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="text-sm text-ink-500 hover:text-brand-600 hover:underline"
              >
                ({product.numReviews} review{product.numReviews === 1 ? '' : 's'})
              </button>
            </div>
            <span className="h-4 w-px bg-ink-200" />
            <span className="text-sm text-ink-500">
              Sold <span className="font-semibold text-ink-800">{product.sold}</span>
            </span>
            <span className="h-4 w-px bg-ink-200" />
            <span className="font-mono text-xs text-ink-500">SKU {variant?.sku || product.SKU}</span>
          </div>

          {/* Pricing */}
          <div className="mt-6 rounded-2xl border border-ink-200 bg-ink-50/60 p-5">
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-3xl font-extrabold tracking-tight text-ink-900">{formatMoney(pricing.finalPrice)}</span>
              {pricing.compareAt && (
                <>
                  <span className="text-lg text-ink-400 line-through">{formatMoney(pricing.compareAt)}</span>
                  <DiscountBadge percentage={pricing.discount} />
                </>
              )}
            </div>
            <p className="mt-1.5 text-xs text-ink-500">Inclusive of all taxes · GST {Math.round((0.18) * 100)}%</p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {inStock ? (
                <>
                  <Badge tone="success" size="lg" icon="check">In stock</Badge>
                  {(variant ? variant.stock : product.stock) <= 10 && (
                    <span className="text-sm font-medium text-warning-700">
                      Only {variant ? variant.stock : product.stock} left — order soon
                    </span>
                  )}
                </>
              ) : (
                <Badge tone="danger" size="lg">Out of stock</Badge>
              )}
            </div>

            {product.freeShipping && (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-success-700">
                <Icon name="truckFast" className="h-4 w-4" />
                Eligible for free shipping
              </p>
            )}
          </div>

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div className="mt-6">
              <VariantSelector variants={product.variants} value={variant} onChange={setVariant} />
            </div>
          )}

          {/* Quantity + actions */}
          <div className="mt-7">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="label">Quantity</span>
                <QuantityStepper value={quantity} onChange={setQuantity} max={maxQty} disabled={!inStock} />
              </div>
              <p className="pt-6 text-xs text-ink-500">{maxQty} available per order</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                variant="outline"
                disabled={!inStock || mutating}
                onClick={() => handleAddToCart()}
                icon={<Icon name="cart" className="h-5 w-5" />}
              >
                {inStock ? 'Add to cart' : 'Out of stock'}
              </Button>
              <Button
                size="lg"
                disabled={!inStock || mutating}
                loading={buying}
                onClick={() => handleAddToCart({ thenCheckout: true })}
                icon={<Icon name="zap" className="h-5 w-5" />}
              >
                Buy now
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleWishlist}
                icon={
                  <StarIcon filled={saved} className={`h-4 w-4 ${saved ? 'text-danger-500' : ''}`} />
                }
              >
                {saved ? 'Saved to wishlist' : 'Add to wishlist'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const url = window.location.href;
                  if (navigator.share) navigator.share({ title: product.name, url }).catch(() => {});
                  else {
                    navigator.clipboard?.writeText(url);
                    toast.success('Product link copied');
                  }
                }}
                icon={<Icon name="copy" className="h-4 w-4" />}
              >
                Share
              </Button>
            </div>
          </div>

          {/* Stock bar */}
          {(variant ? variant.stock : product.stock) > 0 && (variant ? variant.stock : product.stock) <= 30 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-ink-500">
                <span>Stock level</span>
                <span>{variant ? variant.stock : product.stock} units remaining</span>
              </div>
              <Progress
                value={variant ? variant.stock : product.stock}
                max={30}
                tone={(variant ? variant.stock : product.stock) <= 10 ? 'warning' : 'success'}
              />
            </div>
          )}

          {/* Delivery promises */}
          <ul className="mt-7 space-y-3 rounded-2xl border border-ink-200 p-5">
            {[
              { icon: 'truckFast', title: 'Delivery in 2-4 days', copy: 'Tracked shipping across India' },
              { icon: 'rotate', title: '7-day returns', copy: 'Free pickup on eligible items' },
              { icon: 'shield', title: '2-year warranty', copy: 'Backed by the manufacturer' },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <Icon name={item.icon} className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-600" />
                <div>
                  <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                  <p className="text-xs text-ink-500">{item.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* --------------------------------------------------------------- tabs */}
      <section className="mt-14">
        <Tabs
          tabs={[
            ...DETAIL_TABS.slice(0, 3),
            { ...DETAIL_TABS[3], count: product.numReviews },
          ]}
          value={tab}
          onChange={(next) => {
            setTab(next);
            if (next === 'reviews') setTimeout(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }), 50);
          }}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            {tab === 'description' && (
              <div className="animate-fade-in">
                <h2 className="text-lg font-bold text-ink-900">About this product</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-600">{product.description}</p>

                {product.tags?.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/products?search=${encodeURIComponent(tag)}`}
                        className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'specifications' && (
              <div className="animate-fade-in">
                <h2 className="text-lg font-bold text-ink-900">Specifications</h2>
                {product.specifications?.length ? (
                  <dl className="mt-4 divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200">
                    {product.specifications.map((spec, index) => (
                      <div key={`${spec.key}-${index}`} className={`grid grid-cols-1 gap-1 px-5 py-3.5 sm:grid-cols-3 ${index % 2 === 0 ? 'bg-white' : 'bg-ink-50/60'}`}>
                        <dt className="text-sm font-medium text-ink-500">{spec.key}</dt>
                        <dd className="text-sm text-ink-900 sm:col-span-2">{spec.value}</dd>
                      </div>
                    ))}
                    <div className="grid grid-cols-1 gap-1 bg-white px-5 py-3.5 sm:grid-cols-3">
                      <dt className="text-sm font-medium text-ink-500">SKU</dt>
                      <dd className="font-mono text-sm text-ink-900 sm:col-span-2">{product.SKU}</dd>
                    </div>
                  </dl>
                ) : (
                  <Alert className="mt-4" variant="info">No specifications were provided for this product.</Alert>
                )}
              </div>
            )}

            {tab === 'shipping' && (
              <div className="animate-fade-in space-y-6 text-sm leading-relaxed text-ink-600">
                <div>
                  <h2 className="text-lg font-bold text-ink-900">Shipping</h2>
                  <p className="mt-3">
                    Orders placed before 3pm IST are dispatched the same working day. Standard delivery takes 2-4 days
                    for metro cities and 4-7 days elsewhere. Shipping is free on orders above ₹1,999; below that a flat
                    ₹99 applies.
                  </p>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink-900">Returns & refunds</h2>
                  <p className="mt-3">
                    Not happy? Request a return within 7 days of delivery from your order page. Items must be unused and
                    in original packaging. Refunds are issued to the original payment method within 5-7 working days of
                    the returned item passing inspection.
                  </p>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink-900">Warranty</h2>
                  <p className="mt-3">
                    All electronics carry the manufacturer&apos;s warranty. Keep your invoice (available from the order
                    page) for warranty claims.
                  </p>
                </div>
              </div>
            )}

            {tab === 'reviews' && (
              <ProductReviews
                className="animate-fade-in"
                productId={product._id}
                reviews={data.reviews}
                summary={data.reviewSummary}
                canReview={data.canReview && !data.userReview}
                userReview={data.userReview}
                onReviewAdded={refresh}
              />
            )}
          </div>

          {/* Side summary */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-ink-200 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink-900">At a glance</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  { label: 'Brand', value: product.brand },
                  { label: 'Category', value: product.category?.name },
                  { label: 'Rating', value: `${Number(product.rating || 0).toFixed(1)} / 5` },
                  { label: 'Reviews', value: product.numReviews },
                  { label: 'Sold', value: product.sold },
                  { label: 'Availability', value: inStock ? 'In stock' : 'Out of stock' },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3">
                    <dt className="text-ink-500">{row.label}</dt>
                    <dd className="text-right font-medium text-ink-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {data.recommended?.length > 0 && (
              <div className="rounded-2xl border border-ink-200 p-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-ink-900">More from {product.brand}</h3>
                <div className="mt-4 space-y-3">
                  {data.recommended.slice(0, 3).map((item) => (
                    <Link key={item._id} to={`/product/${item.slug}`} className="group flex items-center gap-3">
                      <img src={item.images?.[0]} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-ink-200 object-cover" loading="lazy" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-ink-800 transition group-hover:text-brand-700">{item.name}</p>
                        <p className="text-sm font-bold text-ink-900">{formatMoney(item.finalPrice)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* ------------------------------------------------------------ related */}
      {data.related?.length > 0 && (
        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">You might also like</h2>
              <p className="mt-1 text-sm text-ink-500">Similar products in {product.category?.name}.</p>
            </div>
            <Button to={`/category/${product.category?.slug}`} variant="outline" size="sm" iconRight={<Icon name="arrowRight" className="h-4 w-4" />}>
              View category
            </Button>
          </div>
          <ProductGrid className="mt-6" products={data.related.slice(0, 4)} columns="grid-cols-2 lg:grid-cols-4" />
        </section>
      )}

      {/* Mobile sticky action bar */}
      {inStock && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 p-3 backdrop-blur safe-bottom lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-ink-500">{product.name}</p>
              <p className="text-base font-bold text-ink-900">{formatMoney(pricing.finalPrice)}</p>
            </div>
            <Button size="md" variant="outline" onClick={() => handleAddToCart()} disabled={mutating}>
              Add to cart
            </Button>
            <Button size="md" onClick={() => handleAddToCart({ thenCheckout: true })} loading={buying}>
              Buy now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- skeleton */

function ProductDetailSkeleton() {
  return (
    <div className="container-page py-10">
      <Skeleton className="h-4 w-64" />
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-20 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
