import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Badge } from '../components/ui/Badge';
import { Alert, Input } from '../components/ui/Form';
import { Breadcrumbs, QuantityStepper, StatRow } from '../components/ui/Misc';
import { ConfirmDialog } from '../components/ui/Modal';
import { EmptyState, Loader, Progress } from '../components/ui/Feedback';
import { ProductGrid } from '../components/product/ProductCard';
import { productApi } from '../services';
import { useAsyncData } from '../hooks';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatMoney } from '../utils/format';

/** Coupon entry with validation feedback from the server. */
function CouponBox() {
  const { coupon, applyCoupon, removeCoupon, isGuest } = useCart();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await applyCoupon(code.trim());
      toast.success(`Coupon ${result.code} applied`);
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (coupon) {
    return (
      <div className={`rounded-xl border p-3.5 ${coupon.valid ? 'border-success-100 bg-success-50' : 'border-danger-100 bg-danger-50'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Icon name={coupon.valid ? 'ticket' : 'alert-circle'} className={`mt-0.5 h-4 w-4 ${coupon.valid ? 'text-success-600' : 'text-danger-600'}`} />
            <div>
              <p className={`text-sm font-semibold ${coupon.valid ? 'text-success-700' : 'text-danger-700'}`}>
                {coupon.valid ? `Coupon ${coupon.code} applied` : `${coupon.code} is not valid`}
              </p>
              <p className="text-xs text-ink-600">
                {coupon.valid ? coupon.description || `You save ${formatMoney(coupon.discount)}` : coupon.error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={removeCoupon}
            className="shrink-0 rounded-lg p-1 text-ink-400 transition hover:bg-white hover:text-danger-600"
            aria-label="Remove coupon"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Coupon code"
          aria-label="Coupon code"
          error={error}
          disabled={isGuest}
          containerClassName="flex-1"
          icon={<Icon name="ticket" className="h-4 w-4" />}
        />
        <Button type="submit" variant="outline" loading={busy} disabled={isGuest} className="shrink-0 self-start">
          Apply
        </Button>
      </div>
      {isGuest && <p className="hint">Sign in to apply a coupon code.</p>}
    </form>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { items, unavailableItems, totals, itemCount, updateQuantity, removeItem, clearCart, mutating, loading, isGuest, freeShippingRemaining } = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);

  // "You might also like" rail - only fetched once the cart has content
  const { data: suggestions } = useAsyncData(
    () => productApi.list({ sort: 'popular', limit: 4 }),
    [items.length > 0],
    { immediate: items.length > 0 },
  );

  if (loading) return <Loader className="py-32" label="Loading your cart…" />;

  return (
    <div className="container-page py-8 lg:py-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shopping cart' }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Shopping cart</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {itemCount > 0
              ? `${itemCount} item${itemCount === 1 ? '' : 's'} in your cart`
              : 'Your cart is currently empty'}
            {isGuest && itemCount > 0 && ' · saved on this device'}
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} icon={<Icon name="trash" className="h-4 w-4" />}>
            Clear cart
          </Button>
        )}
      </div>

      {isGuest && itemCount > 0 && (
        <Alert
          className="mt-5"
          variant="info"
          title="Your cart is saved on this device"
          actions={
            <>
              <Button size="sm" to="/login?redirect=/cart">Sign in</Button>
              <Button size="sm" variant="outline" to="/register?redirect=/cart">Create account</Button>
            </>
          }
        >
          Sign in to sync your cart across devices and check out faster.
        </Alert>
      )}

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink-300 bg-ink-50/40">
          <EmptyState
            icon="cart"
            title="Your cart is empty"
            description="Looks like you have not added anything yet. Explore our best sellers to get started."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button to="/products" icon={<Icon name="bag" className="h-4 w-4" />}>Start shopping</Button>
                <Button to="/products?sort=popular" variant="outline">See best sellers</Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* -------------------------------------------------------- items */}
          <div className="min-w-0">
            {freeShippingRemaining > 0 && (
              <div className="mb-5 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
                <div className="flex items-center gap-2.5">
                  <Icon name="truckFast" className="h-4.5 w-4.5 text-brand-600" />
                  <p className="text-sm text-brand-900">
                    Add <span className="font-bold">{formatMoney(freeShippingRemaining)}</span> more for free shipping
                  </p>
                </div>
                <Progress className="mt-2.5" value={totals.subtotal} max={totals.freeShippingThreshold} />
              </div>
            )}

            {unavailableItems.length > 0 && (
              <Alert className="mb-5" variant="warning" title={`${unavailableItems.length} item(s) are no longer available`}>
                <ul className="mt-1 space-y-1">
                  {unavailableItems.map((item) => (
                    <li key={item._id} className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs">{item.name} — {item.reason}</span>
                      <button type="button" onClick={() => removeItem(item._id)} className="shrink-0 text-xs font-semibold underline">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200 bg-white">
              {items.map((item) => (
                <div key={item._id} className="flex gap-4 p-4 sm:p-5">
                  <Link to={`/product/${item.slug}`} className="shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-24 w-24 rounded-xl border border-ink-200 object-cover sm:h-28 sm:w-28"
                      loading="lazy"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-2xs font-semibold uppercase tracking-wide text-brand-600">{item.brand}</p>
                        <Link to={`/product/${item.slug}`} className="line-clamp-2 text-sm font-semibold text-ink-900 transition hover:text-brand-700 sm:text-base">
                          {item.name}
                        </Link>
                        {item.variantName && (
                          <p className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
                            <Icon name="sliders" className="h-3 w-3" />
                            {item.variantName}
                          </p>
                        )}
                        {item.sku && <p className="mt-1 font-mono text-2xs text-ink-400">SKU {item.sku}</p>}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPendingRemove(item)}
                        disabled={mutating}
                        aria-label={`Remove ${item.name} from cart`}
                        className="shrink-0 rounded-lg p-2 text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        max={Math.min(item.maxStock || 10, 10)}
                        disabled={mutating}
                        onChange={(quantity) => updateQuantity(item._id, quantity)}
                      />

                      <div className="text-right">
                        <p className="text-base font-bold text-ink-900">{formatMoney(item.lineTotal ?? item.unitPrice * item.quantity)}</p>
                        <p className="text-xs text-ink-500">
                          {formatMoney(item.unitPrice)} each
                          {item.compareAtPrice && (
                            <span className="ml-1.5 text-ink-400 line-through">{formatMoney(item.compareAtPrice)}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {item.note && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-warning-700">
                        <Icon name="alert-circle" className="h-3.5 w-3.5" />
                        {item.note}
                      </p>
                    )}
                    {item.maxStock <= 5 && item.maxStock > 0 && (
                      <p className="mt-2 text-xs font-medium text-warning-700">Only {item.maxStock} left in stock</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Button to="/products" variant="ghost" size="sm" icon={<Icon name="arrowLeft" className="h-4 w-4" />}>
                Continue shopping
              </Button>
              <Badge tone="success" size="md" icon="shield">Secure checkout</Badge>
            </div>
          </div>

          {/* ------------------------------------------------------ summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold text-ink-900">Order summary</h2>

              <div className="mt-5 space-y-3">
                <StatRow label={`Subtotal (${itemCount} item${itemCount === 1 ? '' : 's'})`} value={formatMoney(totals.subtotal)} />
                {totals.discount > 0 && (
                  <StatRow label="Discount" value={`-${formatMoney(totals.discount)}`} tone="success" />
                )}
                {totals.couponDiscount > 0 && (
                  <StatRow label={`Coupon (${items.length ? '' : ''}${totals.couponCode || ''})`.trim() || 'Coupon'} value={`-${formatMoney(totals.couponDiscount)}`} tone="success" />
                )}
                <StatRow
                  label="Shipping"
                  value={totals.shipping === 0 ? 'FREE' : formatMoney(totals.shipping)}
                  tone={totals.shipping === 0 ? 'success' : 'default'}
                />
                <StatRow label={`Tax (GST ${Math.round((totals.taxRate || 0.18) * 100)}%)`} value={formatMoney(totals.tax)} />
                <div className="border-t border-ink-200 pt-3">
                  <StatRow label="Grand total" value={formatMoney(totals.total)} className="text-lg" />
                </div>
              </div>

              {totals.discount > 0 && (
                <p className="mt-3 rounded-xl bg-success-50 px-3 py-2 text-xs font-medium text-success-700">
                  You are saving {formatMoney(totals.discount)} on this order
                </p>
              )}

              <Button
                size="lg"
                fullWidth
                className="mt-5"
                disabled={mutating}
                onClick={() => navigate(isAuthenticated ? '/checkout' : '/login?redirect=/checkout')}
                icon={<Icon name="lock" className="h-4 w-4" />}
              >
                {isAuthenticated ? 'Proceed to checkout' : 'Sign in to checkout'}
              </Button>

              <div className="mt-5 border-t border-ink-100 pt-5">
                <h3 className="mb-3 text-sm font-semibold text-ink-900">Have a coupon?</h3>
                <CouponBox />
              </div>

              <ul className="mt-5 space-y-2 border-t border-ink-100 pt-5 text-xs text-ink-500">
                <li className="flex items-center gap-2">
                  <Icon name="check" className="h-3.5 w-3.5 text-success-600" />
                  Prices verified on the server at checkout
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="h-3.5 w-3.5 text-success-600" />
                  Stock is reserved when payment is confirmed
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="h-3.5 w-3.5 text-success-600" />
                  Free 7-day returns on eligible items
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {/* Recommendations */}
      {suggestions?.products?.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-bold tracking-tight text-ink-900">You might also like</h2>
          <ProductGrid className="mt-6" products={suggestions.products} columns="grid-cols-2 lg:grid-cols-4" />
        </section>
      )}

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={async () => {
          await clearCart();
          setConfirmClear(false);
        }}
        title="Clear your cart?"
        message="This removes every item from your cart. This action cannot be undone."
        confirmLabel="Yes, clear cart"
      />

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        onClose={() => setPendingRemove(null)}
        onConfirm={async () => {
          await removeItem(pendingRemove._id);
          setPendingRemove(null);
        }}
        title="Remove this item?"
        message={pendingRemove ? `“${pendingRemove.name}” will be removed from your cart.` : ''}
        confirmLabel="Remove item"
      />
    </div>
  );
}
