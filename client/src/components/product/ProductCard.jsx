import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, StarIcon } from '../ui/Icon';
import { Badge, DiscountBadge } from '../ui/Badge';
import { formatMoney } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

/**
 * Product tile used across the catalogue, home rails and related products.
 *
 * The card is fully keyboard accessible: the title is the primary link and the
 * wishlist / add-to-cart controls are separate buttons so screen readers and
 * touch users can reach them independently.
 */
export function ProductCard({ product, className = '', compact = false, showQuickAdd = true }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { isWishlisted, toggleWishlist, isAuthenticated } = useAuth();
  const { addItem, mutating } = useCart();
  const [busy, setBusy] = useState(false);

  if (!product) return null;

  const finalPrice = product.finalPrice ?? (product.discountPrice > 0 && product.discountPrice < product.price ? product.discountPrice : product.price);
  const discountPercent = product.discountPrice > 0 && product.discountPrice < product.price
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;
  const image = product.images?.[0] || product.image || '';
  const outOfStock = product.stock !== undefined ? product.stock <= 0 : false;
  const lowStock = !outOfStock && product.stock !== undefined && product.stock <= 10;
  const saved = isWishlisted(product._id);
  const detailPath = `/product/${product.slug || product._id}`;

  const handleWishlist = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      toast.info('Sign in to save products to your wishlist', {
        action: { label: 'Sign in', onClick: () => navigate(`/login?redirect=${encodeURIComponent(detailPath)}`) },
      });
      return;
    }
    try {
      const result = await toggleWishlist(product._id);
      toast.success(result.saved ? `${product.name} saved to your wishlist` : `${product.name} removed from your wishlist`);
    } catch (error) {
      toast.error(error.message || 'Could not update your wishlist');
    }
  };

  const handleAddToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Products with variants must be configured on the detail page
    if (product.variants?.length) {
      navigate(detailPath);
      return;
    }
    if (outOfStock) {
      toast.warning('This product is currently out of stock');
      return;
    }

    setBusy(true);
    await addItem(product, 1, null);
    setBusy(false);
  };

  return (
    <article className={`group relative flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white
                         transition-all duration-300 ease-smooth hover:-translate-y-1 hover:border-ink-300 hover:shadow-card-hover
                         ${className}`}>
      {/* ---------------------------------------------------------- media */}
      <div className="relative aspect-square overflow-hidden bg-ink-50">
        <Link to={detailPath} aria-label={product.name} className="block h-full w-full">
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-smooth group-hover:scale-[1.06]"
          />
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {discountPercent > 0 && <DiscountBadge percentage={discountPercent} />}
          {product.badges?.slice(0, 1).map((badge) => (
            <Badge key={badge} tone="dark" size="sm">{badge}</Badge>
          ))}
          {outOfStock && <Badge tone="danger" size="sm">Out of stock</Badge>}
          {!outOfStock && lowStock && <Badge tone="warning" size="sm">Only {product.stock} left</Badge>}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={saved}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-ink-500 shadow-sm
                     backdrop-blur transition hover:scale-105 hover:text-danger-600"
        >
          <StarIcon
            filled={saved}
            className={`h-4.5 w-4.5 ${saved ? 'text-danger-500' : ''}`}
          />
          <span className="sr-only">{saved ? 'Remove from wishlist' : 'Add to wishlist'}</span>
        </button>

        {showQuickAdd && !outOfStock && !compact && (
          <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 ease-smooth
                          group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={busy || mutating}
              className="btn btn-primary btn-sm w-full shadow-lg"
            >
              <Icon name={product.variants?.length ? 'sliders' : 'cart'} className="h-4 w-4" />
              {product.variants?.length ? 'Choose options' : busy ? 'Adding…' : 'Add to cart'}
            </button>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------- info */}
      <div className={`flex flex-1 flex-col ${compact ? 'p-3.5' : 'p-4'}`}>
        <p className="text-2xs font-semibold uppercase tracking-wide text-brand-600">{product.brand}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-ink-900">
          <Link to={detailPath} className="transition hover:text-brand-700">
            {product.name}
          </Link>
        </h3>

        {!compact && product.rating > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
            <StarIcon filled className="h-3.5 w-3.5 text-warning-500" />
            <span className="font-semibold text-ink-700">{Number(product.rating).toFixed(1)}</span>
            <span>({product.numReviews || 0})</span>
          </div>
        )}

        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight text-ink-900">{formatMoney(finalPrice)}</span>
            {discountPercent > 0 && (
              <span className="text-xs text-ink-400 line-through">{formatMoney(product.price)}</span>
            )}
          </div>
          {product.freeShipping && <p className="mt-1 text-2xs font-medium text-success-600">Free shipping</p>}
        </div>

        {compact && (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={busy || outOfStock || mutating}
            className="btn btn-outline btn-sm mt-3 w-full"
          >
            <Icon name="cart" className="h-4 w-4" />
            {outOfStock ? 'Out of stock' : 'Add'}
          </button>
        )}
      </div>
    </article>
  );
}

/** Responsive product grid with configurable column behaviour. */
export function ProductGrid({ products = [], className = '', columns = 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', compact = false }) {
  return (
    <div className={`grid gap-4 sm:gap-5 ${columns} ${className}`}>
      {products.map((product) => (
        <ProductCard key={product._id} product={product} compact={compact} />
      ))}
    </div>
  );
}

/**
 * Horizontal, scrollable rail for the home page sections.
 * Falls back to a grid on small screens where horizontal scroll is fiddly.
 */
export function ProductRail({ products = [], className = '' }) {
  if (!products.length) return null;
  return (
    <div className={`-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-2
                     sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4 ${className}`}>
      {products.map((product) => (
        <ProductCard key={product._id} product={product} className="w-[15rem] shrink-0 sm:w-auto" />
      ))}
    </div>
  );
}

export default ProductCard;
