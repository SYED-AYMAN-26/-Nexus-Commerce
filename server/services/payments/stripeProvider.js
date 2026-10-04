/**
 * Stripe provider (test or live mode).
 *
 * Enabled with PAYMENT_PROVIDER=stripe and STRIPE_SECRET_KEY (or
 * PAYMENT_SECRET_KEY) present in the environment. Uses PaymentIntents +
 * signed webhooks; the sandbox flow stays available as a zero-config fallback.
 */
const config = require('../../config');
const ApiError = require('../../utils/ApiError');

const name = 'stripe';
let stripeClient = null;

function getClient() {
  if (stripeClient) return stripeClient;
  if (!config.payments.stripeSecretKey) {
    throw ApiError.internal('Stripe is selected but STRIPE_SECRET_KEY is not configured');
  }
  // Lazy require so `stripe` stays an optional dependency in sandbox-only setups
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const Stripe = require('stripe');
  stripeClient = new Stripe(config.payments.stripeSecretKey, { apiVersion: '2024-12-18.acacia' });
  return stripeClient;
}

const toMinorUnits = (amount, currency) => {
  const zeroDecimal = ['JPY', 'KRW', 'VND', 'CLP'];
  return zeroDecimal.includes(String(currency).toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);
};

async function createSession({ payment, user, description }) {
  const stripe = getClient();
  const intent = await stripe.paymentIntents.create(
    {
      amount: toMinorUnits(payment.amount, payment.currency),
      currency: String(payment.currency).toLowerCase(),
      // Card data is collected by Stripe Elements on the client - it never
      // touches this server, keeping us out of PCI scope.
      automatic_payment_methods: { enabled: true },
      description: description || `Nexus Commerce order for ${user?.email || 'customer'}`,
      metadata: { userId: String(user?._id || ''), paymentId: String(payment._id) },
    },
    // Idempotency protects against double-charging on retries
    { idempotencyKey: `nexus_${payment.providerReference}` },
  );

  return {
    provider: name,
    providerReference: intent.id,
    status: intent.status,
    clientSecret: intent.client_secret,
    publishableKey: config.payments.stripePublishableKey,
    mode: config.payments.stripeSecretKey.startsWith('sk_test') ? 'test' : 'live',
    message: 'Complete the card payment with Stripe Elements.',
  };
}

async function retrieveSession(payment) {
  const stripe = getClient();
  const intent = await stripe.paymentIntents.retrieve(payment.providerReference);
  return {
    provider: name,
    providerReference: intent.id,
    status: intent.status,
    amount: intent.amount / 100,
    currency: intent.currency?.toUpperCase(),
    paid: intent.status === 'succeeded',
    failureReason: intent.last_payment_error?.message || '',
  };
}

async function refund(payment, amount) {
  const stripe = getClient();
  const result = await stripe.refunds.create({
    payment_intent: payment.providerReference,
    amount: amount ? toMinorUnits(amount, payment.currency) : undefined,
  });
  return { refunded: result.status === 'succeeded' || result.status === 'pending', provider: name, refundId: result.id };
}

/** Verify a Stripe webhook signature against the raw request body. */
function verifyWebhookSignature({ rawBody, signatureHeader }) {
  const stripe = getClient();
  return stripe.webhooks.constructEvent(rawBody, signatureHeader, config.payments.webhookSecret);
}

module.exports = { name, createSession, retrieveSession, refund, verifyWebhookSignature };
