import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../services';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Badge } from '../components/ui/Badge';
import { StatRow } from '../components/ui/Misc';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/ui/Badge';
import { ErrorState, Loader } from '../components/ui/Feedback';
import { formatDateTime, formatMoney } from '../utils/format';
import { useCopyToClipboard } from '../hooks';
import { useToast } from '../context/ToastContext';

/** Confirmation page shown immediately after a successful payment. */
export default function OrderSuccess() {
  const { orderId } = useParams();
  const toast = useToast();
  const { copied, copy } = useCopyToClipboard();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    orderApi
      .detail(orderId)
      .then((data) => !cancelled && setOrder(data.order))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) return <Loader className="py-32" label="Loading your order…" />;
  if (error || !order) {
    return (
      <div className="container-page py-16">
        <ErrorState error={error} title="We could not load that order" onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const eta = new Date(new Date(order.createdAt).getTime() + 4 * 24 * 60 * 60 * 1000);

  return (
    <div className="container-page py-10 lg:py-14">
      <div className="mx-auto max-w-3xl">
        {/* ------------------------------------------------------- header */}
        <div className="text-center">
          <span className="mx-auto grid h-20 w-20 animate-scale-in place-items-center rounded-full bg-success-100 text-success-600">
            <Icon name="checkCircle" className="h-11 w-11" strokeWidth={1.5} />
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink-900">Thank you for your order!</h1>
          <p className="mt-3 text-base text-ink-500">
            Your payment was verified and your order is confirmed. We have emailed a receipt to your inbox.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-3.5 py-2 font-mono text-sm font-semibold text-ink-800">
              {order.orderNumber}
              <button
                type="button"
                onClick={() => { copy(order.orderNumber); toast.success('Order number copied'); }}
                aria-label="Copy order number"
                className="rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              >
                <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" />
              </button>
            </span>
            <PaymentStatusBadge status={order.paymentStatus} />
            <OrderStatusBadge status={order.orderStatus} />
          </div>
        </div>

        {/* -------------------------------------------------------- details */}
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            { icon: 'truckFast', label: 'Estimated delivery', value: eta.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) },
            { icon: 'creditCard', label: 'Paid with', value: `${order.paymentMethod} · ${formatMoney(order.total)}` },
            { icon: 'box', label: 'Items', value: `${order.items.reduce((sum, i) => sum + i.quantity, 0)} unit(s)` },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-ink-200 p-4 text-center">
              <Icon name={item.icon} className="mx-auto h-5 w-5 text-brand-600" />
              <p className="mt-2.5 text-2xs font-semibold uppercase tracking-wide text-ink-400">{item.label}</p>
              <p className="mt-1 text-sm font-semibold capitalize text-ink-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-ink-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Order details</h2>
            <span className="text-xs text-ink-500">Placed {formatDateTime(order.createdAt)}</span>
          </div>

          <ul className="divide-y divide-ink-100">
            {order.items.map((item) => (
              <li key={item._id} className="flex items-center gap-4 px-5 py-4">
                <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-ink-200 object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${item.slug}`} className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-700">
                    {item.name}
                  </Link>
                  {item.variantName && <p className="text-xs text-ink-500">{item.variantName}</p>}
                  <p className="mt-0.5 text-xs text-ink-500">Qty {item.quantity} × {formatMoney(item.unitPrice)}</p>
                </div>
                <p className="shrink-0 text-sm font-bold text-ink-900">{formatMoney(item.lineTotal)}</p>
              </li>
            ))}
          </ul>

          <div className="space-y-2.5 border-t border-ink-100 bg-ink-50/60 px-5 py-5">
            <StatRow label="Subtotal" value={formatMoney(order.subtotal)} />
            {order.discount > 0 && <StatRow label="Discount" value={`-${formatMoney(order.discount)}`} tone="success" />}
            <StatRow label="Shipping" value={order.shipping === 0 ? 'FREE' : formatMoney(order.shipping)} tone={order.shipping === 0 ? 'success' : 'default'} />
            <StatRow label={`Tax (GST ${Math.round((order.taxRate || 0.18) * 100)}%)`} value={formatMoney(order.tax)} />
            <div className="border-t border-ink-200 pt-3">
              <StatRow label="Total paid" value={formatMoney(order.total)} className="text-base" />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------ shipping */}
        <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Shipping to</h2>
          <div className="mt-3 text-sm leading-relaxed text-ink-600">
            <p className="font-semibold text-ink-900">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
            <p>{order.shippingAddress.country}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-ink-500">
              <Icon name="phone" className="h-3.5 w-3.5" />
              {order.shippingAddress.phone}
            </p>
          </div>
        </div>

        {/* --------------------------------------------------------- next */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button to={`/account/orders/${order._id}`} size="lg" icon={<Icon name="truckFast" className="h-4 w-4" />}>
            Track your order
          </Button>
          <Button to="/products" size="lg" variant="outline">
            Continue shopping
          </Button>
          <Button href={orderApi.invoiceUrl(order._id)} size="lg" variant="ghost" icon={<Icon name="receipt" className="h-4 w-4" />}>
            Download invoice
          </Button>
        </div>

        <div className="mt-10 rounded-2xl bg-ink-50 p-5 text-center">
          <p className="text-sm text-ink-600">
            Need to change something? You can cancel this order from the{' '}
            <Link to="/account/orders" className="link">orders page</Link> while it is still being processed.
          </p>
        </div>
      </div>
    </div>
  );
}
