/**
 * Sandbox payment provider.
 *
 * Implements the same contract as a real gateway (create -> retrieve -> refund)
 * but runs entirely inside the API, so the project is fully functional with no
 * external account. The "gateway state" lives server side in the Payment
 * collection: the browser can request an outcome, but the order is only ever
 * created from a payment record the server itself marked as `succeeded`.
 *
 * Signature scheme (mirrors Stripe's HMAC webhook signing):
 *   signature = HMAC_SHA256(PAYMENT_WEBHOOK_SECRET, `${payload}.${timestamp}`)
 */
const crypto = require('crypto');
const config = require('../../config');
const ApiError = require('../../utils/ApiError');

const name = 'mock';

/** Deterministic-ish intent id, e.g. pi_mock_5f2c1a9d3b7e4c0e */
function reference() {
  return `pi_mock_${crypto.randomBytes(12).toString('hex')}`;
}

/** Token that proves the checkout session was issued by this server. */
function buildSessionToken({ reference: ref, amount, currency }) {
  return crypto
    .createHmac('sha256', config.payments.secretKey || 'sandbox')
    .update(`${ref}.${amount}.${currency}`)
    .digest('hex');
}

function verifySessionToken({ reference: ref, amount, currency, token }) {
  const expected = buildSessionToken({ reference: ref, amount, currency });
  const a = Buffer.from(String(token || ''));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw ApiError.badRequest('This payment session could not be verified');
  }
  return true;
}

/** Create a payment intent + signed hosted-checkout URL. */
async function createSession({ payment }) {
  const token = buildSessionToken({ reference: payment.providerReference, amount: payment.amount, currency: payment.currency });
  return {
    provider: name,
    providerReference: payment.providerReference,
    status: 'requires_action',
    // The client opens this URL (sandbox hosted checkout page).
    checkoutUrl: `/api/payments/sandbox/checkout/${payment.providerReference}?token=${token}`,
    clientSecret: `${payment.providerReference}_secret_${token.slice(0, 16)}`,
    mode: 'sandbox',
    message: 'Sandbox gateway ready. Complete the payment to create your order.',
  };
}

/** Gateway-side state lookup - the source of truth for verification. */
async function retrieveSession(payment) {
  const map = {
    created: 'requires_action',
    requires_action: 'requires_action',
    processing: 'processing',
    succeeded: 'succeeded',
    failed: 'failed',
    cancelled: 'cancelled',
    refunded: 'refunded',
  };
  return {
    provider: name,
    providerReference: payment.providerReference,
    status: map[payment.status] || payment.status,
    amount: payment.amount,
    currency: payment.currency,
    paid: payment.status === 'succeeded',
    failureReason: payment.failureReason || '',
  };
}

async function refund() {
  // Sandbox refunds always succeed and are persisted by the service layer.
  return { refunded: true, provider: name };
}

function verifyWebhookSignature({ rawBody, signatureHeader, timestamp }) {
  const secret = config.payments.webhookSecret || 'sandbox';
  const payload = `${rawBody}.${timestamp}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(String(signatureHeader || ''));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { name, reference, createSession, retrieveSession, refund, verifyWebhookSignature, buildSessionToken, verifySessionToken };
