import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addressApi, cartApi, paymentApi } from '../services';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Badge } from '../components/ui/Badge';
import { Alert, Checkbox, Input, Textarea } from '../components/ui/Form';
import { Breadcrumbs } from '../components/ui/Misc';
import { EmptyState, ErrorState, Loader, Skeleton } from '../components/ui/Feedback';
import { AddressCard, AddressModal } from '../components/checkout/AddressComponents';
import {
  OrderSummaryPanel,
  PaymentMethodSelector,
  SandboxPaymentModal,
  StepIndicator,
} from '../components/checkout/CheckoutParts';
import { formatMoney } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { BUSINESS } from '../utils/constants';

/**
 * Four step checkout: address -> review -> payment -> confirm.
 *
 * Every monetary value shown here comes from the server (`/cart/preview` and
 * `/payments/create`). The client only picks an address and a method; the order
 * is created exclusively by the payment verification endpoint.
 */
export default function Checkout() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { items, totals, itemCount, coupon, refresh: refreshCart, freeShippingRemaining } = useCart();

  const [step, setStep] = useState('address');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);

  const [preview, setPreview] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [notes, setNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [intent, setIntent] = useState(null);
  const [paying, setPaying] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [fieldError, setFieldError] = useState(null);

  /* ------------------------------------------------------------- bootstrap */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [addressData, cartData] = await Promise.all([addressApi.list(), cartApi.get()]);
        if (cancelled) return;

        setAddresses(addressData.addresses || []);
        const preferred = addressData.addresses?.find((a) => a.isDefault) || addressData.addresses?.[0];
        setSelectedAddressId(preferred?._id || null);
        setPreview(cartData.cart);

        if ((cartData.cart.items || []).length === 0) setStep('address');
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cartItems = preview?.items || items;
  const liveTotals = preview?.totals || totals;
  const selectedAddress = useMemo(
    () => addresses.find((a) => String(a._id) === String(selectedAddressId)) || null,
    [addresses, selectedAddressId],
  );

  /* --------------------------------------------------------------- actions */

  const saveAddress = async (values) => {
    setSavingAddress(true);
    try {
      const data = editingAddress
        ? await addressApi.update(editingAddress._id, values)
        : await addressApi.create(values);
      setAddresses(data.addresses);
      const saved = values.isDefault
        ? data.addresses.find((a) => a.isDefault)
        : data.addresses[data.addresses.length - 1];
      setSelectedAddressId(saved?._id || data.addresses[0]._id);
      setAddressModalOpen(false);
      setEditingAddress(null);
      toast.success(editingAddress ? 'Address updated' : 'Address added');
    } catch (err) {
      toast.error(err.message || 'Could not save that address');
    } finally {
      setSavingAddress(false);
    }
  };

  const goToReview = () => {
    if (!selectedAddressId) {
      setFieldError('Please select or add a delivery address to continue');
      return;
    }
    setFieldError(null);
    setStep('review');
  };

  const goToPayment = async () => {
    setFieldError(null);
    try {
      const data = await cartApi.preview();
      setPreview(data);
      setStep('payment');
    } catch (err) {
      // Stock or pricing changed between steps - surface it and stay put
      toast.error(err.message);
      await refreshCart();
    }
  };

  const goToConfirm = async () => {
    if (!acceptTerms) {
      setFieldError('Please accept the terms and return policy to continue');
      return;
    }
    setFieldError(null);
    setPaying(true);

    try {
      // The server re-prices the cart and opens a gateway session
      const created = await paymentApi.create({
        addressId: selectedAddressId,
        couponCode: couponCode || undefined,
        paymentMethod,
        notes: notes || undefined,
      });
      setIntent(created);
      setStep('confirm');
    } catch (err) {
      toast.error(err.message);
      if (err.status === 400) await refreshCart();
    } finally {
      setPaying(false);
    }
  };

  /** Gateway outcome -> server-side verification -> order creation. */
  const completePayment = async (outcome) => {
    if (!intent) return;
    try {
      await paymentApi.sandboxComplete({
        paymentIntentId: intent.providerReference,
        outcome,
        sessionToken: intent.checkoutUrl ? new URL(intent.checkoutUrl, window.location.origin).searchParams.get('token') : '',
      });
    } catch (err) {
      throw new Error(err.message || 'The gateway could not process this payment');
    }

    if (outcome !== 'success') {
      setIntent(null);
      setStep('payment');
      await refreshCart();
      if (outcome === 'failure') toast.error('Payment declined by the bank. No order was created.');
      else toast.info('Payment cancelled. Your cart is still saved.');
      return;
    }

    setPlacingOrder(true);
    try {
      const result = await paymentApi.verify(intent.providerReference);
      const order = result.order;
      await refreshCart();
      toast.success('Payment confirmed — your order is placed!');
      navigate(`/order-success/${order._id}`, { replace: true });
    } catch (err) {
      toast.error(err.message || 'We could not confirm your payment. Please contact support.');
      setIntent(null);
      setStep('payment');
    } finally {
      setPlacingOrder(false);
    }
  };

  /* ---------------------------------------------------------------- states */

  if (loading) return <Loader className="py-32" label="Preparing your checkout…" />;
  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorState
          error={error}
          title="We could not start checkout"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon="cart"
          title="Your cart is empty"
          description="Add a few products before checking out — your cart is saved automatically."
          action={<Button to="/products">Browse products</Button>}
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8 lg:py-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Secure checkout</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Signed in as <span className="font-medium text-ink-800">{user?.email}</span>
          </p>
        </div>
        <Badge tone="success" size="lg" icon="lock">256-bit encrypted</Badge>
      </div>

      <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-4 sm:p-5">
        <StepIndicator current={step} onNavigate={setStep} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          {/* ------------------------------------------- step 1: address */}
          {step === 'address' && (
            <section className="animate-fade-in space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-ink-900">Delivery address</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setEditingAddress(null); setAddressModalOpen(true); }}
                  icon={<Icon name="plus" className="h-4 w-4" />}
                >
                  Add new address
                </Button>
              </div>

              {addresses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50/40">
                  <EmptyState
                    compact
                    icon="mapPin"
                    title="No delivery address yet"
                    description="Add an address so we know where to ship your order."
                    action={
                      <Button onClick={() => setAddressModalOpen(true)} icon={<Icon name="plus" className="h-4 w-4" />}>
                        Add your first address
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="space-y-3" role="radiogroup" aria-label="Select delivery address">
                  {addresses.map((address) => (
                    <AddressCard
                      key={address._id}
                      address={address}
                      selected={String(address._id) === String(selectedAddressId)}
                      onSelect={() => { setSelectedAddressId(address._id); setFieldError(null); }}
                      onEdit={(target) => { setEditingAddress(target); setAddressModalOpen(true); }}
                    />
                  ))}
                </div>
              )}

              {fieldError && <Alert variant="error">{fieldError}</Alert>}

              <div className="flex justify-end">
                <Button size="lg" onClick={goToReview} iconRight={<Icon name="arrowRight" className="h-4 w-4" />}>
                  Continue to review
                </Button>
              </div>
            </section>
          )}

          {/* -------------------------------------------- step 2: review */}
          {step === 'review' && (
            <section className="animate-fade-in space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-ink-900">Review your items</h2>
                <Button size="sm" variant="ghost" onClick={() => setStep('address')} icon={<Icon name="edit" className="h-4 w-4" />}>
                  Change address
                </Button>
              </div>

              {selectedAddress && <AddressCard address={selectedAddress} compact />}

              <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200 bg-white">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex items-center gap-4 p-4">
                    <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-ink-200 object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/product/${item.slug}`} className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-700">
                        {item.name}
                      </Link>
                      {item.variantName && <p className="text-xs text-ink-500">{item.variantName}</p>}
                      <p className="mt-1 text-xs text-ink-500">Qty {item.quantity} · {formatMoney(item.unitPrice)} each</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-ink-900">
                      {formatMoney(item.lineTotal ?? item.unitPrice * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {freeShippingRemaining > 0 && (
                <Alert variant="info">
                  Add {formatMoney(freeShippingRemaining)} more to your cart to qualify for free shipping on a future order.
                </Alert>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => setStep('address')} icon={<Icon name="arrowLeft" className="h-4 w-4" />}>
                  Back
                </Button>
                <Button size="lg" onClick={goToPayment} iconRight={<Icon name="arrowRight" className="h-4 w-4" />}>
                  Continue to payment
                </Button>
              </div>
            </section>
          )}

          {/* ------------------------------------------- step 3: payment */}
          {step === 'payment' && (
            <section className="animate-fade-in space-y-5">
              <h2 className="text-lg font-bold text-ink-900">Payment method</h2>
              <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

              <div className="rounded-2xl border border-ink-200 p-5">
                <Input
                  label="Coupon code"
                  placeholder="e.g. WELCOME10"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  icon={<Icon name="ticket" className="h-4 w-4" />}
                  hint={coupon?.valid ? `Currently applied: ${coupon.code}` : 'Applied when you confirm the order.'}
                />
              </div>

              <Textarea
                label="Order notes (optional)"
                rows={3}
                maxLength={500}
                placeholder="Delivery instructions, gate code, preferred time…"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />

              <Checkbox
                checked={acceptTerms}
                onChange={(event) => { setAcceptTerms(event.target.checked); setFieldError(null); }}
                label="I agree to the terms of sale and the 7-day return policy."
              />

              {fieldError && <Alert variant="error">{fieldError}</Alert>}

              <Alert variant="info" title="How your payment is protected">
                Your card details never touch our servers. The order is created only after the payment gateway
                confirms the transaction to our backend, and prices are re-verified at that moment.
              </Alert>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => setStep('review')} icon={<Icon name="arrowLeft" className="h-4 w-4" />}>
                  Back
                </Button>
                <Button size="lg" loading={paying} onClick={goToConfirm} icon={<Icon name="lock" className="h-4 w-4" />}>
                  Continue to confirm
                </Button>
              </div>
            </section>
          )}

          {/* ------------------------------------------- step 4: confirm */}
          {step === 'confirm' && (
            <section className="animate-fade-in space-y-5">
              <h2 className="text-lg font-bold text-ink-900">Confirm and pay</h2>

              {placingOrder ? (
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
                  <Loader label="Verifying your payment and creating your order…" />
                </div>
              ) : (
                <>
                  {selectedAddress && <AddressCard address={selectedAddress} compact />}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-ink-200 p-4">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">Paying with</p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold capitalize text-ink-900">
                        <Icon name="creditCard" className="h-4 w-4 text-brand-600" />
                        {paymentMethod}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-ink-200 p-4">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">Amount</p>
                      <p className="mt-1 text-sm font-semibold text-ink-900">{formatMoney(intent?.amount || liveTotals.total)}</p>
                    </div>
                  </div>

                  <Alert variant="warning" title="Sandbox gateway active">
                    The payment provider is running in <strong>sandbox mode</strong>. Clicking pay opens a simulated
                    checkout sheet — no real money moves. Set <code className="rounded bg-white px-1">PAYMENT_PROVIDER=stripe</code>{' '}
                    in <code className="rounded bg-white px-1">.env</code> to use a live gateway.
                  </Alert>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button variant="ghost" onClick={() => setStep('payment')} disabled={placingOrder} icon={<Icon name="arrowLeft" className="h-4 w-4" />}>
                      Back
                    </Button>
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        {/* -------------------------------------------------------- summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {loading ? (
            <Skeleton className="h-96 rounded-2xl" />
          ) : (
            <OrderSummaryPanel
              items={cartItems}
              totals={liveTotals}
              shippingAddress={selectedAddress}
              paymentMethod={step === 'address' ? null : paymentMethod}
              coupon={coupon}
            >
              {step !== 'confirm' ? (
                <p className="text-xs text-ink-500">
                  {itemCount} item{itemCount === 1 ? '' : 's'} · Shipping {liveTotals.shipping === 0 ? 'free' : formatMoney(liveTotals.shipping)} ·
                  Free above {formatMoney(BUSINESS.freeShippingThreshold)}
                </p>
              ) : (
                <p className="flex items-center gap-2 text-xs text-ink-500">
                  <Icon name="lock" className="h-3.5 w-3.5 text-success-600" />
                  Complete the payment in the gateway window to place your order.
                </p>
              )}
            </OrderSummaryPanel>
          )}
        </aside>
      </div>

      {/* Gateway simulation sheet */}
      <SandboxPaymentModal
        open={Boolean(intent) && !placingOrder}
        intent={intent}
        onComplete={completePayment}
        onClose={async () => {
          setIntent(null);
          setStep('payment');
          await refreshCart();
        }}
      />

      <AddressModal
        open={addressModalOpen}
        onClose={() => { setAddressModalOpen(false); setEditingAddress(null); }}
        address={editingAddress}
        onSubmit={saveAddress}
        submitting={savingAddress}
      />
    </div>
  );
}
