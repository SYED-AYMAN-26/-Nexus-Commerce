import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../services';
import { AdminPageHeader, InfoRow } from '../../components/admin/AdminParts';
import { Badge, OrderStatusBadge, PaymentStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Alert, Input, Select, Textarea } from '../../components/ui/Form';
import { ConfirmDialog } from '../../components/ui/Modal';
import { EmptyState, ErrorState, Loader } from '../../components/ui/Feedback';
import { CopyableText } from '../../components/ui/Misc';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../utils/constants';
import { formatDateTime, formatMoney, initials } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { useCopyToClipboard } from '../../hooks';

export default function AdminOrderDetail() {
  const { orderId } = useParams();
  const toast = useToast();
  const { copied, copy } = useCopyToClipboard();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusForm, setStatusForm] = useState({ orderStatus: '', note: '', restoreStock: false });
  const [savingStatus, setSavingStatus] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refunding, setRefunding] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.order(orderId);
      setOrder(data.order);
      setStatusForm((current) => ({ ...current, orderStatus: data.order.orderStatus }));
      setPaymentStatus(data.order.paymentStatus);
      setRefundAmount(String(data.order.total));
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

  const saveStatus = async () => {
    setSavingStatus(true);
    try {
      const data = await adminApi.updateOrderStatus(orderId, {
        orderStatus: statusForm.orderStatus,
        note: statusForm.note || undefined,
        restoreStock: statusForm.orderStatus === 'cancelled' ? statusForm.restoreStock : undefined,
      });
      setOrder(data.order);
      setStatusForm((current) => ({ ...current, note: '' }));
      toast.success(data.message || 'Order status updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const savePaymentStatus = async () => {
    setSavingPayment(true);
    try {
      const data = await adminApi.updatePaymentStatus(orderId, { paymentStatus });
      setOrder(data.order);
      toast.success(data.message || 'Payment status updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  const submitRefund = async () => {
    setRefunding(true);
    try {
      const data = await adminApi.refundOrder(orderId, Number(refundAmount) || undefined);
      setOrder(data.order);
      setRefundOpen(false);
      toast.success(data.message || 'Refund processed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRefunding(false);
    }
  };

  const submitCancel = async () => {
    setCancelling(true);
    try {
      const data = await adminApi.cancelOrder(orderId, cancelReason || undefined);
      setOrder(data.order);
      setCancelOpen(false);
      toast.success(data.message || 'Order cancelled');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Loader className="py-28" label="Loading order…" />;

  if (error?.status === 404) {
    return (
      <EmptyState
        icon="orders"
        title="Order not found"
        description="That order number does not exist."
        actionTo="/admin/orders"
        actionLabel="Back to orders"
      />
    );
  }

  if (error || !order) return <ErrorState error={error} onRetry={load} />;

  const customer = order.user || {};
  const canRefund = order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled';
  const terminals = ['delivered', 'cancelled'];

  return (
    <>
      <AdminPageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed ${formatDateTime(order.createdAt)} · ${order.itemCount} item(s) · ${order.paymentMethod.toUpperCase()} via ${order.paymentProvider}`}
        backTo="/admin/orders"
        backLabel="All orders"
        actions={
          <>
            <Button variant="outline" href={`/api/orders/${order._id}/invoice`} icon={<Icon name="receipt" className="h-4 w-4" />}>
              Invoice
            </Button>
            <Button variant="outline" onClick={() => copy(order.orderNumber)} icon={<Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" />}>
              Copy number
            </Button>
            {canRefund && (
              <Button variant="danger" onClick={() => setRefundOpen(true)} icon={<Icon name="undo" className="h-4 w-4" />}>
                Refund
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Left column */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-ink-200 bg-white">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Items</h2>
              <div className="flex items-center gap-2">
                <OrderStatusBadge status={order.orderStatus} size="sm" />
                <PaymentStatusBadge status={order.paymentStatus} size="sm" />
              </div>
            </header>

            <div className="overflow-x-auto scroll-thin">
              <table className="table min-w-[640px]">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Unit</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <img src={item.image} alt={item.name} className="h-11 w-11 rounded-lg border border-ink-200 object-cover" loading="lazy" />
                          <div className="min-w-0">
                            <Link to={`/product/${item.slug}`} className="line-clamp-1 text-sm font-medium text-ink-900 hover:text-brand-700">
                              {item.name}
                            </Link>
                            {item.variantName && <p className="text-2xs text-ink-500">{item.variantName}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-ink-600">{item.sku}</td>
                      <td className="text-center text-sm font-semibold text-ink-800">{item.quantity}</td>
                      <td className="text-right text-sm text-ink-700">{formatMoney(item.unitPrice)}</td>
                      <td className="text-right text-sm font-semibold text-ink-900">{formatMoney(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-6 border-t border-ink-100 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <InfoRow label="Subtotal">{formatMoney(order.subtotal)}</InfoRow>
                {order.discount > 0 && <InfoRow label="Item discount">-{formatMoney(order.discount)}</InfoRow>}
                {order.couponCode && <InfoRow label={`Coupon ${order.couponCode}`}>-{formatMoney(order.couponDiscount)}</InfoRow>}
                <InfoRow label="Shipping">{order.shipping === 0 ? 'FREE' : formatMoney(order.shipping)}</InfoRow>
              </div>
              <div className="space-y-1.5">
                <InfoRow label={`Tax (GST ${Math.round((order.taxRate || 0.18) * 100)}%)`}>{formatMoney(order.tax)}</InfoRow>
                <InfoRow label="Grand total">
                  <span className="text-base font-bold">{formatMoney(order.total)}</span>
                </InfoRow>
                <InfoRow label="Currency">{order.currency}</InfoRow>
              </div>
            </div>
          </section>

          {/* Status workflow */}
          <section className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Fulfilment workflow</h2>
            <p className="mt-1 text-xs text-ink-500">
              Move the order through the pipeline. Customers see the change immediately in My orders.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(ORDER_STATUS).map(([value, meta]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusForm((current) => ({ ...current, orderStatus: value }))}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition
                              ${statusForm.orderStatus === value
                                ? 'border-brand-600 bg-brand-50 text-brand-700'
                                : 'border-ink-200 text-ink-600 hover:border-ink-300'}`}
                >
                  {meta.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr]">
              <Textarea
                label="Internal note (optional)"
                rows={2}
                maxLength={300}
                value={statusForm.note}
                onChange={(event) => setStatusForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Handed to BlueDart, AWB 123456789"
              />
              <div className="flex flex-col justify-end gap-3">
                {statusForm.orderStatus === 'cancelled' && (
                  <label className="flex items-start gap-2.5 rounded-xl border border-ink-200 p-3 text-xs text-ink-600">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600"
                      checked={statusForm.restoreStock}
                      onChange={(event) => setStatusForm((current) => ({ ...current, restoreStock: event.target.checked }))}
                    />
                    Restore reserved stock to inventory
                  </label>
                )}
                <Button
                  onClick={saveStatus}
                  loading={savingStatus}
                  disabled={statusForm.orderStatus === order.orderStatus && !statusForm.note}
                  icon={<Icon name="check" className="h-4 w-4" />}
                >
                  Update status
                </Button>
              </div>
            </div>

            {terminals.includes(order.orderStatus) && (
              <Alert className="mt-4" variant="info" title="Terminal state">
                This order is {ORDER_STATUS[order.orderStatus].label.toLowerCase()} — no further customer-facing status
                changes are expected.
              </Alert>
            )}
          </section>

          {/* History */}
          <section className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Audit trail</h2>
            <ol className="mt-4 space-y-4">
              {[...(order.statusHistory || [])].reverse().map((entry, index) => (
                <li key={`${entry.status}-${index}`} className="flex gap-3.5">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${index === 0 ? 'bg-brand-500 ring-4 ring-brand-500/15' : 'bg-ink-300'}`} />
                  <div>
                    <p className="text-sm font-medium text-ink-900">{ORDER_STATUS[entry.status]?.label || entry.status}</p>
                    {entry.note && <p className="text-xs text-ink-500">{entry.note}</p>}
                    <p className="mt-0.5 text-2xs text-ink-400">
                      {formatDateTime(entry.changedAt)}
                      {entry.changedBy ? ' · staff update' : ' · system'}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Payment</h2>

            <div className="mt-3 space-y-1">
              <InfoRow label="Status"><PaymentStatusBadge status={order.paymentStatus} size="sm" /></InfoRow>
              <InfoRow label="Method">{order.paymentMethod}</InfoRow>
              <InfoRow label="Provider">{order.paymentProvider}</InfoRow>
              <InfoRow label="Intent">
                <CopyableText
                  value={order.paymentIntentId || '—'}
                  label="payment intent"
                  copied={copied}
                  onCopy={(value) => { copy(value); toast.success('Payment intent copied'); }}
                />
              </InfoRow>
              {order.transactionId && (
                <InfoRow label="Transaction">
                  <CopyableText
                    value={order.transactionId}
                    label="transaction"
                    copied={copied}
                    onCopy={(value) => { copy(value); toast.success('Transaction id copied'); }}
                  />
                </InfoRow>
              )}
              {order.paidAt && <InfoRow label="Paid at">{formatDateTime(order.paidAt)}</InfoRow>}
              {order.refundedAt && <InfoRow label="Refunded">{formatMoney(order.refundAmount || order.total)} on {formatDateTime(order.refundedAt)}</InfoRow>}
            </div>

            <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
              <Select
                label="Override payment status"
                value={paymentStatus}
                onChange={(event) => setPaymentStatus(event.target.value)}
                options={Object.entries(PAYMENT_STATUS).map(([value, meta]) => ({ value, label: meta.label }))}
              />
              <Button
                variant="outline"
                fullWidth
                loading={savingPayment}
                disabled={paymentStatus === order.paymentStatus}
                onClick={savePaymentStatus}
              >
                Save payment status
              </Button>
              <p className="text-2xs text-ink-500">
                Use this only for manual reconciliation (e.g. bank transfer received). Customer-facing payment
                confirmation still comes from the gateway.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Customer</h2>

            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                {initials(customer.name || order.shippingAddress.fullName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{customer.name || order.shippingAddress.fullName}</p>
                <p className="truncate text-xs text-ink-500">{customer.email || order.shippingAddress.phone}</p>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <InfoRow label="Account">
                {customer._id ? (
                  <Link to="/admin/users" className="link text-xs font-semibold">View in customers</Link>
                ) : (
                  <Badge tone="neutral" size="sm">Guest checkout</Badge>
                )}
              </InfoRow>
              {customer.phone && <InfoRow label="Phone">{customer.phone}</InfoRow>}
            </div>

            <h3 className="mt-5 text-xs font-bold uppercase tracking-wide text-ink-500">Shipping address</h3>
            <address className="mt-2 text-sm not-italic leading-relaxed text-ink-700">
              <p className="font-semibold text-ink-900">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
              <p>{order.shippingAddress.country}</p>
              <p className="mt-1 flex items-center gap-1.5 text-ink-500">
                <Icon name="phone" className="h-3.5 w-3.5" />
                {order.shippingAddress.phone}
              </p>
            </address>
          </section>

          <section className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Danger zone</h2>
            <p className="mt-1 text-xs text-ink-500">
              Cancelling releases reserved stock and refunds any captured payment through the gateway.
            </p>
            <Button
              className="mt-4"
              variant="danger"
              fullWidth
              disabled={order.orderStatus === 'cancelled'}
              onClick={() => setCancelOpen(true)}
              icon={<Icon name="x" className="h-4 w-4" />}
            >
              {order.orderStatus === 'cancelled' ? 'Order already cancelled' : 'Cancel order'}
            </Button>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        onConfirm={submitRefund}
        loading={refunding}
        title="Refund this payment?"
        confirmLabel="Process refund"
        variant="danger"
      >
        <div className="space-y-4">
          <Alert variant="warning" title="Money moves immediately">
            The refund is sent to the gateway ({order.paymentProvider}) for the captured amount. Stock is not restored
            automatically.
          </Alert>
          <Input
            label="Refund amount (₹)"
            type="number"
            min="1"
            step="0.01"
            max={order.total}
            value={refundAmount}
            onChange={(event) => setRefundAmount(event.target.value)}
            hint={`Maximum ${formatMoney(order.total)}`}
            required
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={submitCancel}
        loading={cancelling}
        title="Cancel this order?"
        confirmLabel="Cancel order"
        variant="danger"
      >
        <div className="space-y-4">
          <Textarea
            label="Reason (shown to the customer)"
            rows={3}
            maxLength={300}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Out of stock, customer requested cancellation…"
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
