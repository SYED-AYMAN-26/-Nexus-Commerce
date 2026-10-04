const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const config = require('../config');
const cartService = require('./cartService');
const orderService = require('./orderService');
const { getProvider } = require('./payments');

/**
 * Payment orchestration.
 *
 *  1. `createIntent`  - lock the cart's server-verified total into a Payment row
 *                       and open a session with the gateway.
 *  2. `completeSandbox`/webhook - the *gateway* marks the payment succeeded.
 *  3. `verifyPayment` - read the gateway status back, and only then create the
 *                       order. The browser can never declare a payment paid.
 */

async function createIntent(user, { addressId = null, couponCode = '', paymentMethod = 'card', notes = '' }) {
  // A coupon supplied at checkout is validated (and persisted on the cart)
  // before we price the intent, so the amount here always matches the UI.
  if (couponCode) await cartService.applyCoupon(user._id, couponCode);

  const { lines, totals, coupon } = await cartService.getCheckoutLines(user._id);
  return createIntentWithTotals(user, { lines, totals, paymentMethod, addressId, notes, couponCode: coupon?.code || '' });
}

async function createIntentWithTotals(user, { lines, totals, paymentMethod = 'card', addressId = null, couponCode = '', notes = '' }) {
  if (!lines.length) throw ApiError.badRequest('Your cart is empty');
  if (totals.total <= 0) throw ApiError.badRequest('Order total must be greater than zero');

  const provider = getProvider();
  const reference = provider === getProvider('mock') ? provider.reference() : `pi_pending_${new mongoose.Types.ObjectId().toHexString()}`;

  const payment = await Payment.create({
    user: user._id,
    provider: provider.name,
    providerReference: reference,
    amount: totals.total,
    currency: totals.currency,
    method: paymentMethod,
    status: 'created',
    metadata: {
      itemCount: totals.itemCount,
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      tax: totals.tax,
      discount: totals.discount,
      couponCode,
      addressId,
      notes,
      // Snapshot of the priced lines at intent time for auditing
      lines: lines.map((l) => ({
        product: String(l.product),
        variantId: l.variantId ? String(l.variantId) : null,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    },
  });
  payment.recordEvent('created', 'Payment session created');
  await payment.save();

  const session = await provider.createSession({
    payment,
    user,
    description: `Nexus Commerce - ${totals.itemCount} item(s)`,
  });

  // Stripe may return a different intent id than the placeholder we generated
  if (session.providerReference && session.providerReference !== payment.providerReference) {
    payment.providerReference = session.providerReference;
    await payment.save();
  }

  payment.recordEvent('session_opened', session.mode || provider.name);
  await payment.save();

  return {
    paymentId: payment._id,
    provider: provider.name,
    mode: session.mode,
    providerReference: payment.providerReference,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    checkoutUrl: session.checkoutUrl || null,
    clientSecret: session.clientSecret || null,
    publishableKey: session.publishableKey || null,
    message: session.message,
    totals,
  };
}

/** Sandbox-only: the gateway's own "hosted checkout" reports an outcome. */
async function completeSandbox(user, { providerReference, outcome, sessionToken }) {
  const provider = getProvider();
  if (provider.name !== 'mock') throw ApiError.badRequest('Sandbox completion is only available with the mock provider');

  const payment = await Payment.findOne({ providerReference, user: user._id });
  if (!payment) throw ApiError.notFound('Payment session not found');
  if (payment.status === 'succeeded') return { payment, alreadyCompleted: true };

  if (sessionToken) {
    provider.verifySessionToken({ reference: payment.providerReference, amount: payment.amount, currency: payment.currency, token: sessionToken });
  }

  if (outcome === 'success') {
    payment.status = 'succeeded';
    payment.recordEvent('succeeded', 'Sandbox payment authorised');
    await payment.save();
  } else if (outcome === 'failure') {
    payment.status = 'failed';
    payment.failureReason = 'Simulated card decline';
    payment.recordEvent('failed', payment.failureReason);
    await payment.save();
  } else {
    payment.status = 'cancelled';
    payment.recordEvent('cancelled', 'Customer cancelled at the gateway');
    await payment.save();
  }

  return { payment, alreadyCompleted: false };
}

/**
 * Ask the gateway for the authoritative status, then (only on success) create
 * the order. Safe to call repeatedly - the payment row is the lock.
 */
async function verifyPayment(user, { providerReference }) {
  const payment = await Payment.findOne({ providerReference }).populate('order');
  if (!payment) throw ApiError.notFound('We could not find that payment session');
  if (String(payment.user) !== String(user._id)) throw ApiError.forbidden('This payment does not belong to your account');

  const provider = getProvider(payment.provider);
  const gateway = await provider.retrieveSession(payment);

  // Mirror gateway state locally for auditability
  if (gateway.status === 'succeeded' && payment.status !== 'succeeded') {
    payment.status = 'succeeded';
    payment.recordEvent('succeeded', 'Confirmed by gateway');
  } else if (['failed', 'cancelled', 'requires_action', 'processing'].includes(gateway.status) && payment.status !== 'succeeded') {
    payment.status = gateway.status === 'failed' ? 'failed' : payment.status;
    if (gateway.failureReason) payment.failureReason = gateway.failureReason;
  }
  await payment.save();

  if (gateway.status !== 'succeeded' && payment.status !== 'succeeded') {
    return {
      status: gateway.status,
      paid: false,
      message: gateway.failureReason || 'The payment was not completed. No order has been created.',
      paymentId: payment._id,
      order: null,
    };
  }

  // Already fulfilled -> return the existing order (idempotent)
  const existingOrder = await orderService.findOrderByPayment(payment);
  if (existingOrder) {
    return { status: 'succeeded', paid: true, message: 'Payment already verified', order: existingOrder, paymentId: payment._id };
  }

  // Re-price from scratch: prices/stock may have moved since the intent
  const { lines, totals, cart, coupon } = await cartService.getCheckoutLines(user._id);

  if (Math.abs(totals.total - payment.amount) > 0.01) {
    payment.recordEvent('amount_mismatch', `intent=${payment.amount} recalculated=${totals.total}`);
    await payment.save();
    throw ApiError.conflict('Your cart total changed after the payment was authorised. Please contact support - you have not been charged for the new amount.');
  }

  const addressId = payment.metadata?.addressId;
  const address = addressId ? user.addresses.id(addressId) : user.defaultAddress;
  if (!address) throw ApiError.badRequest('Please add a shipping address before completing the order');

  const order = await orderService.createOrder({
    user,
    lines,
    totals,
    shippingAddress: {
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    },
    payment,
    paymentMethod: payment.method,
    couponCode: coupon?.code || '',
    notes: payment.metadata?.notes || '',
  });

  await orderService.linkPayment(payment, order);

  // Only now is the cart cleared
  await cart.empty();

  return { status: 'succeeded', paid: true, message: 'Payment verified and order placed', order, paymentId: payment._id };
}

/** Refund through the gateway and record it against the order. */
async function refundPayment(order, { amount, changedBy = null } = {}) {
  const payment = order.paymentIntentId ? await Payment.findOne({ providerReference: order.paymentIntentId }) : null;
  const refundAmount = amount ?? order.total;

  if (payment) {
    const provider = getProvider(payment.provider);
    const result = await provider.refund(payment, refundAmount);
    if (!result.refunded) throw ApiError.badRequest('The gateway declined the refund');
    payment.status = 'refunded';
    payment.recordEvent('refunded', `Refund of ${refundAmount} issued`);
    await payment.save();
  }

  order.paymentStatus = 'refunded';
  order.refundAmount = refundAmount;
  order.refundedAt = new Date();
  order.statusHistory.push({ status: order.orderStatus, note: `Refund of ${refundAmount} issued`, changedBy });
  await order.save();
  return order;
}

/** Handles the sandbox (HMAC) and Stripe webhook payloads. */
async function handleWebhook({ rawBody, headers, body }) {
  const provider = getProvider(body?.provider || config.payments.provider);

  if (provider.name === 'mock') {
    const signature = headers['x-nexus-signature'] || headers['x-webhook-signature'];
    const timestamp = headers['x-nexus-timestamp'] || String(Math.floor(Date.now() / 1000));
    if (config.payments.webhookSecret) {
      const valid = provider.verifyWebhookSignature({ rawBody: typeof rawBody === 'string' ? rawBody : JSON.stringify(body), signatureHeader: signature, timestamp });
      if (!valid) throw ApiError.unauthorized('Invalid webhook signature');
    }
    const { providerReference, status, reason } = body || {};
    if (!providerReference) throw ApiError.badRequest('providerReference is required');

    const payment = await Payment.findOne({ providerReference });
    if (!payment) throw ApiError.notFound('Unknown payment reference');

    if (status === 'succeeded') {
      payment.status = 'succeeded';
      payment.recordEvent('webhook_succeeded', 'Marked paid by webhook');
    } else if (status === 'failed') {
      payment.status = 'failed';
      payment.failureReason = reason || 'Declined';
      payment.recordEvent('webhook_failed', payment.failureReason);
    }
    await payment.save();
    return { received: true, provider: 'mock', paymentId: payment._id };
  }

  // Stripe
  const signature = headers['stripe-signature'];
  const event = provider.verifyWebhookSignature({ rawBody, signatureHeader: signature });

  if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    const payment = await Payment.findOne({ providerReference: intent.id });
    if (payment) {
      payment.status = event.type === 'payment_intent.succeeded' ? 'succeeded' : 'failed';
      payment.failureReason = intent.last_payment_error?.message || payment.failureReason;
      payment.recordEvent(`webhook_${event.type}`, '');
      await payment.save();
    }
  }
  return { received: true, provider: 'stripe', type: event.type };
}

module.exports = { createIntent, verifyPayment, completeSandbox, refundPayment, handleWebhook };
