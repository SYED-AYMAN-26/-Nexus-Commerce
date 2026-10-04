import { useState } from 'react';
import { Icon, Spinner } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert, Input, Radio } from '../ui/Form';
import { Modal } from '../ui/Modal';
import { StatRow } from '../ui/Misc';
import { formatMoney } from '../../utils/format';

/* ------------------------------------------------------------ step header */

export const CHECKOUT_STEPS = [
  { key: 'address', label: 'Address', icon: 'mapPin' },
  { key: 'review', label: 'Review', icon: 'bag' },
  { key: 'payment', label: 'Payment', icon: 'creditCard' },
  { key: 'confirm', label: 'Confirm', icon: 'checkCircle' },
];

export function StepIndicator({ current, steps = CHECKOUT_STEPS, onNavigate }) {
  const currentIndex = steps.findIndex((step) => step.key === current);

  return (
    <ol className="flex items-center gap-1 sm:gap-2">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        const clickable = done && onNavigate;

        return (
          <li key={step.key} className="flex flex-1 items-center gap-1 sm:gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onNavigate(step.key)}
              className={`flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-left transition sm:px-3
                          ${clickable ? 'hover:bg-ink-100' : 'cursor-default'}`}
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition
                            ${done ? 'bg-success-600 text-white' : active ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-500'}`}
              >
                {done ? <Icon name="check" className="h-4 w-4" strokeWidth={3} /> : <Icon name={step.icon} className="h-4 w-4" />}
              </span>
              <span className={`hidden truncate text-xs font-semibold sm:block ${active ? 'text-ink-900' : 'text-ink-500'}`}>
                {step.label}
              </span>
            </button>

            {index < steps.length - 1 && (
              <span className={`h-0.5 flex-1 rounded-full transition ${done ? 'bg-success-500' : 'bg-ink-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* --------------------------------------------------------- order summary */

export function OrderSummaryPanel({ items = [], totals = {}, shippingAddress, paymentMethod, coupon, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-ink-200 bg-white p-5 sm:p-6 ${className}`}>
      <h2 className="text-base font-bold text-ink-900">Order summary</h2>

      <ul className="mt-4 max-h-72 space-y-3.5 overflow-y-auto scroll-thin pr-1">
        {items.map((item) => (
          <li key={item._id || `${item.productId}-${item.variantName}`} className="flex gap-3">
            <div className="relative shrink-0">
              <img src={item.image} alt={item.name} className="h-14 w-14 rounded-xl border border-ink-200 object-cover" loading="lazy" />
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink-900 px-1 text-[10px] font-bold text-white">
                {item.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium text-ink-800">{item.name}</p>
              {item.variantName && <p className="text-xs text-ink-500">{item.variantName}</p>}
            </div>
            <p className="shrink-0 text-sm font-semibold text-ink-900">
              {formatMoney(item.lineTotal ?? item.unitPrice * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-5 space-y-2.5 border-t border-ink-100 pt-5">
        <StatRow label="Subtotal" value={formatMoney(totals.subtotal)} />
        {totals.discount > 0 && <StatRow label="Product discount" value={`-${formatMoney(totals.productDiscount ?? totals.discount)}`} tone="success" />}
        {totals.couponDiscount > 0 && (
          <StatRow label={`Coupon ${coupon?.code || ''}`.trim()} value={`-${formatMoney(totals.couponDiscount)}`} tone="success" />
        )}
        <StatRow label="Shipping" value={totals.shipping === 0 ? 'FREE' : formatMoney(totals.shipping)} tone={totals.shipping === 0 ? 'success' : 'default'} />
        <StatRow label={`Tax (GST ${Math.round((totals.taxRate || 0.18) * 100)}%)`} value={formatMoney(totals.tax)} />
        <div className="border-t border-ink-200 pt-3">
          <StatRow label="Total payable" value={formatMoney(totals.total)} className="text-base" />
        </div>
      </div>

      {(shippingAddress || paymentMethod) && (
        <div className="mt-5 space-y-3 border-t border-ink-100 pt-5 text-sm">
          {shippingAddress && (
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">Delivering to</p>
              <p className="mt-1 font-medium text-ink-800">{shippingAddress.fullName}</p>
              <p className="text-xs text-ink-500">
                {shippingAddress.addressLine1}, {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
              </p>
            </div>
          )}
          {paymentMethod && (
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">Payment method</p>
              <p className="mt-1 font-medium capitalize text-ink-800">{paymentMethod}</p>
            </div>
          )}
        </div>
      )}

      {children && <div className="mt-5 border-t border-ink-100 pt-5">{children}</div>}

      <p className="mt-5 flex items-center gap-2 text-xs text-ink-500">
        <Icon name="shield" className="h-3.5 w-3.5 text-success-600" />
        Your order is only created after the payment is verified by the gateway.
      </p>
    </div>
  );
}

/* -------------------------------------------------------- payment methods */

export const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit card', description: 'Visa, Mastercard, RuPay, Amex', icon: 'creditCard' },
  { id: 'upi', label: 'UPI', description: 'GPay, PhonePe, Paytm and more', icon: 'zap' },
  { id: 'netbanking', label: 'Net banking', description: 'All major Indian banks', icon: 'wallet' },
];

export function PaymentMethodSelector({ value, onChange, methods = PAYMENT_METHODS }) {
  return (
    <div className="space-y-3" role="radiogroup" aria-label="Payment method">
      {methods.map((method) => (
        <label
          key={method.id}
          className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition
                      ${value === method.id ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-500' : 'border-ink-200 bg-white hover:border-ink-300'}`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value={method.id}
            checked={value === method.id}
            onChange={() => onChange(method.id)}
            className="h-4 w-4 border-ink-300 text-brand-600 focus:ring-brand-500/30"
          />
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-600">
            <Icon name={method.icon} className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink-900">{method.label}</span>
            <span className="block text-xs text-ink-500">{method.description}</span>
          </span>
          {value === method.id && <Icon name="checkCircle" className="h-5 w-5 shrink-0 text-brand-600" />}
        </label>
      ))}
    </div>
  );
}

/* ------------------------------------------------------ sandbox gateway */

/**
 * Sandbox payment sheet.
 *
 * Stands in for the payment provider's hosted checkout. The card fields are
 * simulated locally (no PAN ever leaves the browser); clicking "Pay" calls the
 * API's sandbox-completion endpoint, exactly like a gateway's webhook would.
 * Swap PAYMENT_PROVIDER=stripe to render Stripe Elements here instead.
 */
export function SandboxPaymentModal({ open, intent, onComplete, onClose }) {
  const [status, setStatus] = useState('idle'); // idle | processing | error
  const [error, setError] = useState(null);
  const [card, setCard] = useState('4242 4242 4242 4242');

  if (!intent) return null;

  const decline = card.replace(/\s/g, '').startsWith('4000');

  const submit = async (outcome) => {
    setStatus('processing');
    setError(null);
    try {
      await onComplete(outcome);
      setStatus('idle');
    } catch (err) {
      setError(err.message || 'The sandbox gateway rejected this request');
      setStatus('error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={status === 'processing' ? undefined : onClose}
      size="md"
      closeOnOverlay={false}
      title={
        <span className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
            N
          </span>
          Nexus Pay
          <Badge tone="brand" size="sm">Sandbox</Badge>
        </span>
      }
      description="Test mode — no real money moves. This sheet simulates the payment provider's hosted checkout."
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-ink-200 bg-ink-50/60 p-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-ink-500">Amount due</span>
            <span className="text-2xl font-extrabold tracking-tight text-ink-900">{formatMoney(intent.amount, { currency: intent.currency })}</span>
          </div>
          <p className="mt-2 font-mono text-2xs text-ink-400">{intent.providerReference}</p>
        </div>

        <div className="space-y-3.5">
          <Input
            label="Card number"
            value={card}
            onChange={(event) => setCard(event.target.value)}
            disabled={status === 'processing'}
            icon={<Icon name="creditCard" className="h-4 w-4" />}
            hint="Use 4242… to succeed or 4000 0000 0000 0002 to simulate a decline."
          />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Expiry" defaultValue="12 / 34" disabled={status === 'processing'} />
            <Input label="CVC" defaultValue="123" disabled={status === 'processing'} />
            <Input label="Postal code" defaultValue="600028" disabled={status === 'processing'} />
          </div>
        </div>

        {error && <Alert variant="error" title="Payment failed">{error}</Alert>}

        {status === 'processing' && (
          <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-sm text-brand-800">
            <Spinner className="h-4 w-4" label="Processing" />
            Contacting the gateway…
          </div>
        )}

        <div className="space-y-2.5">
          <Button
            fullWidth
            size="lg"
            loading={status === 'processing'}
            onClick={() => submit(decline ? 'failure' : 'success')}
            icon={<Icon name="lock" className="h-4 w-4" />}
          >
            Pay {formatMoney(intent.amount, { currency: intent.currency })}
          </Button>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" disabled={status === 'processing'} onClick={() => submit('failure')}>
              Simulate decline
            </Button>
            <Button variant="ghost" disabled={status === 'processing'} onClick={() => submit('cancel')}>
              Cancel payment
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default StepIndicator;
