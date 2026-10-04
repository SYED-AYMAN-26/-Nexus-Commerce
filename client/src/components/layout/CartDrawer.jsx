import { Link } from 'react-router-dom';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { EmptyState, Progress } from '../ui/Feedback';
import { QuantityStepper } from '../ui/Misc';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatMoney } from '../../utils/format';

/** Mini cart shown whenever a product is added. */
export function CartDrawer() {
  const { drawerOpen, closeDrawer, items, totals, itemCount, updateQuantity, removeItem, mutating, freeShippingRemaining } = useCart();
  const { isAuthenticated } = useAuth();

  const progress = Math.min(100, (totals.subtotal / (totals.freeShippingThreshold || 1999)) * 100);

  return (
    <Drawer
      open={drawerOpen}
      onClose={closeDrawer}
      title={`Your cart${itemCount ? ` · ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}`}
      footer={
        items.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Subtotal</span>
                <span className="font-semibold text-ink-900">{formatMoney(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-500">Discount</span>
                  <span className="font-semibold text-success-600">-{formatMoney(totals.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Shipping</span>
                <span className="font-semibold text-ink-900">
                  {totals.shipping === 0 ? <span className="text-success-600">FREE</span> : formatMoney(totals.shipping)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Tax (GST {Math.round((totals.taxRate || 0.18) * 100)}%)</span>
                <span className="font-semibold text-ink-900">{formatMoney(totals.tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-ink-200 pt-3 text-base">
                <span className="font-semibold text-ink-900">Total</span>
                <span className="font-bold text-ink-900">{formatMoney(totals.total)}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Button
                to={isAuthenticated ? '/checkout' : '/login?redirect=/checkout'}
                size="lg"
                fullWidth
                onClick={closeDrawer}
                icon={<Icon name="lock" className="h-4 w-4" />}
              >
                Checkout securely
              </Button>
              <Button to="/cart" variant="outline" fullWidth onClick={closeDrawer}>
                View full cart
              </Button>
            </div>
          </div>
        ) : null
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon="cart"
          title="Your cart is empty"
          description="Browse our catalogue and add something you like — it will appear here."
          action={<Button to="/products" onClick={closeDrawer}>Start shopping</Button>}
        />
      ) : (
        <div className="divide-y divide-ink-100">
          {freeShippingRemaining > 0 && (
            <div className="bg-brand-50/60 px-5 py-4">
              <p className="text-sm text-brand-900">
                Add <span className="font-semibold">{formatMoney(freeShippingRemaining)}</span> more to unlock{' '}
                <span className="font-semibold">free shipping</span>
              </p>
              <Progress value={progress} className="mt-2" tone="brand" />
            </div>
          )}

          {items.map((item) => (
            <div key={item._id} className="flex gap-3.5 p-5">
              <Link to={`/product/${item.slug}`} onClick={closeDrawer} className="shrink-0">
                <img src={item.image} alt={item.name} className="h-20 w-20 rounded-xl border border-ink-200 object-cover" loading="lazy" />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-2xs font-semibold uppercase tracking-wide text-brand-600">{item.brand}</p>
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={closeDrawer}
                      className="line-clamp-2 text-sm font-semibold text-ink-900 transition hover:text-brand-700"
                    >
                      {item.name}
                    </Link>
                    {item.variantName && <p className="mt-0.5 text-xs text-ink-500">{item.variantName}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item._id, { silent: true })}
                    disabled={mutating}
                    aria-label={`Remove ${item.name}`}
                    className="shrink-0 rounded-lg p-1.5 text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <QuantityStepper
                    size="sm"
                    value={item.quantity}
                    max={Math.min(item.maxStock || 10, 10)}
                    disabled={mutating}
                    onChange={(quantity) => updateQuantity(item._id, quantity)}
                  />
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink-900">{formatMoney(item.lineTotal ?? item.unitPrice * item.quantity)}</p>
                    {item.quantity > 1 && <p className="text-2xs text-ink-400">{formatMoney(item.unitPrice)} each</p>}
                  </div>
                </div>

                {item.note && <p className="mt-2 text-xs text-warning-600">{item.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

export default CartDrawer;
