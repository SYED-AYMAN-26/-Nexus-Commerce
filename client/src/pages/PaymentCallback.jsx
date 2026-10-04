import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { paymentApi } from '../services';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Alert } from '../components/ui/Form';
import { Loader } from '../components/ui/Feedback';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

/**
 * Return URL for the sandbox provider's hosted checkout page.
 *
 * The gateway page (served by the API) reports the outcome server-side and then
 * redirects here. This page simply asks the backend to verify the session and,
 * if the gateway confirms success, create the order.
 */
export default function PaymentCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useCart();
  const [state, setState] = useState('verifying');
  const [message, setMessage] = useState('');
  const attempted = useRef(false);

  const reference = params.get('reference') || params.get('payment_intent') || '';

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    (async () => {
      if (!reference) {
        setState('error');
        setMessage('This payment link is missing its reference. Start checkout again from your cart.');
        return;
      }

      try {
        const result = await paymentApi.verify(reference);
        await refresh();
        toast.success('Payment confirmed — your order is placed!');
        navigate(`/order-success/${result.order._id}`, { replace: true });
      } catch (error) {
        await refresh();
        setState('failed');
        setMessage(error.message || 'We could not confirm this payment.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  if (state === 'verifying') {
    return (
      <div className="container-page py-24">
        <Loader label="Verifying your payment with the gateway…" />
        <p className="mt-4 text-center text-sm text-ink-500">Please do not close this window.</p>
      </div>
    );
  }

  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-lg">
        <div className="card card-pad text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-danger-50 text-danger-600">
            <Icon name="alert-triangle" className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-xl font-bold text-ink-900">Payment not completed</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{message}</p>

          <Alert className="mt-6 text-left" variant="info" title="No order was created">
            You have not been charged. Your cart has been preserved, so you can try again whenever you are ready.
          </Alert>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button to="/checkout" fullWidth>Try checkout again</Button>
            <Button to="/cart" variant="outline" fullWidth>Back to cart</Button>
          </div>

          <p className="mt-6 text-xs text-ink-400">
            Reference <span className="font-mono">{reference || '—'}</span> · Need help?{' '}
            <Link to="/help" className="underline hover:text-ink-600">Contact support</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
