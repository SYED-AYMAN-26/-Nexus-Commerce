import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../../services';
import { Breadcrumbs, CopyableText, StatRow } from '../../components/ui/Misc';
import { AccountNav } from '../../components/common/AccountNav';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/ui/Badge';
import { Alert, Textarea } from '../../components/ui/Form';
import { ConfirmDialog } from '../../components/ui/Modal';
import { EmptyState, ErrorState, Loader } from '../../components/ui/Feedback';
import { formatDateTime, formatMoney } from '../../utils/format';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useCopyToClipboard } from '../../hooks';
import { useNavigate } from 'react-router-dom';
import { ORDER_STATUS } from '../../utils/constants';

const STAGES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

/** Visual progress tracker: Order placed → Confirmed → Processing → Shipped → Delivered. */
function OrderTracker({ order }) {
  const currentIndex = STAGES.indexOf(order.orderStatus);
  const cancelled = order.orderStatus === 'cancelled';

  if (cancelled) {
    return (
      <div className="rounded-2xl border border-danger-200 bg-danger-50 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger-100 text-danger-600">
            <Icon name="x" className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-danger-700">This order was cancelled</p>
            <p className="mt-0.5 text-sm text-danger-600/90">
              {order.cancelReason || 'Cancelled'} · {formatDateTime(order.cancelledAt)}
              {order.paymentStatus === 'refunded' && ` · Refund of ${formatMoney(order.refundAmount || order.total)} issued`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Order progress</h2>
        <OrderStatusBadge status={order.orderStatus} size="sm" />
      </div>

      {/* Desktop: horizontal stepper */}
      <ol className="mt-7 hidden items-start gap-2 sm:flex">
        {STAGES.map((stage, index) => {
          const done = index <= currentIndex;
          const active = index === currentIndex;
          const history = order.statusHistory?.find((entry) => entry.status === stage);

          return (
            <li key={stage} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span className={`h-0.5 flex-1 ${index === 0 ? 'bg-transparent' : index <= currentIndex ? 'bg-brand-500' : 'bg-ink-200'}`} />
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition
                              ${done ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-400'}
                              ${active ? 'ring-4 ring-brand-500/20' : ''}`}
                >
                  {index < currentIndex || order.orderStatus === 'delivered' ? (
                    <Icon name="check" className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    <Icon name={['receipt', 'checkCircle', 'package', 'truck', 'home'][index]} className="h-4 w-4" />
                  )}
                </span>
                <span className={`h-0.5 flex-1 ${index === STAGES.length - 1 ? 'bg-transparent' : index < currentIndex ? 'bg-brand-500' : 'bg-ink-200'}`} />
              </div>
              <p className={`mt-3 text-xs font-semibold ${done ? 'text-ink-900' : 'text-ink-400'}`}>{ORDER_STATUS[stage].label}</p>
              <p className="mt-0.5 text-2xs text-ink-400">{history ? formatDateTime(history.changedAt) : 'Pending'}</p>
            </li>
          );
        })}
      </ol>

      {/* Mobile: vertical stepper */}
      <ol className="mt-6 space-y-4 sm:hidden">
        {STAGES.map((stage, index) => {
          const done = index <= currentIndex;
          const history = order.statusHistory?.find((entry) => entry.status === stage);
          return (
            <li key={stage} className="flex gap-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-500'}`}>
                {done ? <Icon name="check" className="h-4 w-4" strokeWidth={3} /> : <span className="text-xs font-bold">{index + 1}</span>}
              </span>
              <div>
                <p className={`text-sm font-semibold ${done ? 'text-ink-900' : 'text-ink-400'}`}>{ORDER_STATUS[stage].label}</p>
                <p className="text-xs text-ink-500">{history ? formatDateTime(history.changedAt) : ORDER_STATUS[stage].description}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {order.orderStatus === 'shipped' && (
        <Alert className="mt-6" variant="info" title="Your parcel is on the way">
          Expected delivery within 2-4 working days. You will receive an SMS when the courier is out for delivery.
        </Alert>
      )}
    </div>
  );
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh: refreshCart } = useCart();
  const { copied, copy } = useCopyToClipboard();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderApi.detail(orderId);
      setOrder(data.order);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const cancelOrder = async () => {
    setCancelling(true);
    try {
      const data = await orderApi.cancel(orderId, cancelReason || undefined);
      setOrder(data.order);
      setCancelOpen(false);
      toast.success('Order cancelled. Refunds are issued to the original payment method.');
      await refreshCart();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const reorder = async () => {
    setReordering(true);
    try {
      const result = await orderApi.reorder(orderId);
      await refreshCart();
      toast.success(result.message || 'Items added to your cart');
      navigate('/cart');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReordering(false);
    }
  };

  if (loading) return <Loader className="py-32" label="Loading order…" />;

  if (error?.status === 404) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon="orders"
          title="Order not found"
          description="That order does not exist or does not belong to your account."
          actionTo="/account/orders"
          actionLabel="Back to my orders"
        />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-page py-16">
        <ErrorState error={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="container-page py-8 lg:py-10">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'My account', to: '/account' },
          { label: 'Orders', to: '/account/orders' },
          { label: order.orderNumber },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Order {order.orderNumber}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-sm text-ink-500">Placed {formatDateTime(order.createdAt)}</span>
            <span className="hidden h-4 w-px bg-ink-200 sm:block" />
            <CopyableText
              value={order.transactionId || order.paymentIntentId}
              label="transaction reference"
              onCopy={(value) => { copy(value); toast.success('Reference copied'); }}
              copied={copied}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.orderStatus} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <AccountNav />

        <div className="min-w-0 space-y-6">
          <OrderTracker order={order} />

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            {/* Items */}
            <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
              <header className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">
                  Items ({order.itemCount})
                </h2>
                {order.items.some((item) => !item.reviewed) && order.orderStatus === 'delivered' && (
                  <span className="text-xs font-medium text-brand-600">Review your purchases</span>
                )}
              </header>

              <ul className="divide-y divide-ink-100">
                {order.items.map((item) => (
                  <li key={item._id} className="flex gap-4 px-5 py-4">
                    <Link to={`/product/${item.slug}`} className="shrink-0">
                      <img src={item.image} alt={item.name} className="h-20 w-20 rounded-xl border border-ink-200 object-cover" loading="lazy" />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link to={`/product/${item.slug}`} className="line-clamp-2 text-sm font-semibold text-ink-900 transition hover:text-brand-700">
                        {item.name}
                      </Link>
                      {item.variantName && <p className="mt-0.5 text-xs text-ink-500">{item.variantName}</p>}
                      <p className="mt-1 font-mono text-2xs text-ink-400">SKU {item.sku}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                        <span>Qty {item.quantity}</span>
                        <span>·</span>
                        <span>{formatMoney(item.unitPrice)} each</span>
                        {item.compareAtPrice && (
                          <span className="text-ink-400 line-through">{formatMoney(item.compareAtPrice)}</span>
                        )}
                      </div>

                      {order.orderStatus === 'delivered' && (
                        <Link
                          to={`/product/${item.slug}#reviews`}
                          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
                        >
                          <Icon name="star" className="h-3.5 w-3.5" />
                          {item.reviewed ? 'Review submitted' : 'Write a review'}
                        </Link>
                      )}
                    </div>

                    <p className="shrink-0 text-sm font-bold text-ink-900">{formatMoney(item.lineTotal)}</p>
                  </li>
                ))}
              </ul>
            </section>

            {/* Payment + shipping */}
            <div className="space-y-6">
              <section className="rounded-2xl border border-ink-200 bg-white p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Payment summary</h2>
                <div className="mt-4 space-y-2.5">
                  <StatRow label="Subtotal" value={formatMoney(order.subtotal)} />
                  {order.discount > 0 && <StatRow label="Discount" value={`-${formatMoney(order.discount)}`} tone="success" />}
                  {order.couponCode && <StatRow label={`Coupon ${order.couponCode}`} value={`-${formatMoney(order.couponDiscount)}`} tone="success" />}
                  <StatRow label="Shipping" value={order.shipping === 0 ? 'FREE' : formatMoney(order.shipping)} tone={order.shipping === 0 ? 'success' : 'default'} />
                  <StatRow label={`Tax (GST ${Math.round((order.taxRate || 0.18) * 100)}%)`} value={formatMoney(order.tax)} />
                  <div className="border-t border-ink-200 pt-3">
                    <StatRow label="Total" value={formatMoney(order.total)} className="text-base" />
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-xs text-ink-500">
                  <p className="flex items-center justify-between gap-3">
                    <span>Method</span>
                    <span className="font-medium capitalize text-ink-800">{order.paymentMethod}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span>Provider</span>
                    <span className="font-medium capitalize text-ink-800">{order.paymentProvider}</span>
                  </p>
                  {order.paidAt && (
                    <p className="flex items-center justify-between gap-3">
                      <span>Paid on</span>
                      <span className="font-medium text-ink-800">{formatDateTime(order.paidAt)}</span>
                    </p>
                  )}
                  {order.refundedAt && (
                    <p className="flex items-center justify-between gap-3">
                      <span>Refunded on</span>
                      <span className="font-medium text-success-700">{formatDateTime(order.refundedAt)}</span>
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-ink-200 bg-white p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Shipping address</h2>
                <div className="mt-3 text-sm leading-relaxed text-ink-600">
                  <p className="font-semibold text-ink-900">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-ink-500">
                    <Icon name="phone" className="h-3.5 w-3.5" />
                    {order.shippingAddress.phone}
                  </p>
                </div>
                {order.notes && (
                  <p className="mt-4 rounded-xl bg-ink-50 p-3 text-xs text-ink-600">
                    <span className="font-semibold">Notes:</span> {order.notes}
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-ink-200 bg-white p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Actions</h2>
                <div className="mt-4 space-y-2.5">
                  <Button
                    fullWidth
                    variant="outline"
                    href={orderApi.invoiceUrl(order._id)}
                    icon={<Icon name="receipt" className="h-4 w-4" />}
                  >
                    Download invoice
                  </Button>
                  <Button
                    fullWidth
                    variant="outline"
                    loading={reordering}
                    onClick={reorder}
                    icon={<Icon name="refresh" className="h-4 w-4" />}
                  >
                    Buy these items again
                  </Button>
                  {order.canCancel && (
                    <Button
                      fullWidth
                      variant="danger"
                      onClick={() => setCancelOpen(true)}
                      icon={<Icon name="x" className="h-4 w-4" />}
                    >
                      Cancel order
                    </Button>
                  )}
                </div>

                {!order.canCancel && order.orderStatus !== 'cancelled' && (
                  <p className="mt-3 text-xs text-ink-500">
                    This order can no longer be cancelled online. Contact support if you need help.
                  </p>
                )}
              </section>
            </div>
          </div>

          {/* Status history */}
          <section className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Activity</h2>
            <ol className="mt-4 space-y-4">
              {[...(order.statusHistory || [])].reverse().map((entry, index) => (
                <li key={`${entry.status}-${index}`} className="flex gap-3.5">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${index === 0 ? 'bg-brand-500 ring-4 ring-brand-500/15' : 'bg-ink-300'}`} />
                  <div>
                    <p className="text-sm font-medium text-ink-900">{ORDER_STATUS[entry.status]?.label || entry.status}</p>
                    {entry.note && <p className="text-xs text-ink-500">{entry.note}</p>}
                    <p className="mt-0.5 text-2xs text-ink-400">{formatDateTime(entry.changedAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancelOrder}
        loading={cancelling}
        title="Cancel this order?"
        confirmLabel="Yes, cancel order"
        cancelLabel="Keep order"
      >
        <div className="space-y-4">
          <Alert variant="warning" title="Stock will be released">
            {order.paymentStatus === 'paid'
              ? `A refund of ${formatMoney(order.total)} will be issued to your original payment method within 5-7 working days.`
              : 'No payment has been captured for this order.'}
          </Alert>
          <Textarea
            label="Reason (optional)"
            rows={3}
            maxLength={300}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Ordered by mistake, found a better price, delivery too slow…"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
