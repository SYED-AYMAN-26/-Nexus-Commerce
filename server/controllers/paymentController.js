const config = require('../config');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/paymentService');
const { getProvider } = require('../services/payments');
const { decorateOrder } = require('./orderController');

/** GET /api/payments/config - lets the client render the right checkout UI */
const getPaymentConfig = asyncHandler(async (req, res) => {
  const provider = getProvider();
  res.json({
    success: true,
    data: {
      provider: provider.name,
      mode: config.payments.secretKey?.startsWith('pk_live') || config.payments.stripeSecretKey?.startsWith('sk_live') ? 'live' : 'sandbox',
      publishableKey: provider.name === 'stripe' ? config.payments.stripePublishableKey : null,
      currency: config.business.currency,
      methods: [
        { id: 'card', label: 'Credit / Debit Card' },
        { id: 'upi', label: 'UPI' },
        { id: 'netbanking', label: 'Net Banking' },
      ],
      sandbox: provider.name === 'mock',
    },
  });
});

/**
 * POST /api/payments/create
 * Prices the cart on the server and opens a gateway session.
 */
const createPayment = asyncHandler(async (req, res) => {
  const { addressId = null, couponCode = '', paymentMethod = 'card', notes = '' } = req.body;
  const result = await paymentService.createIntent(req.user, { addressId, couponCode, paymentMethod, notes });
  res.status(201).json({ success: true, message: result.message, data: result });
});

/** GET /api/payments/:reference - status of a session (polled by the client) */
const getPaymentStatus = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ providerReference: req.params.reference });
  if (!payment) throw ApiError.notFound('Payment session not found');
  if (String(payment.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('This payment does not belong to your account');
  }
  res.json({
    success: true,
    data: {
      paymentId: payment._id,
      providerReference: payment.providerReference,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      order: payment.order,
      createdAt: payment.createdAt,
    },
  });
});

/**
 * POST /api/payments/verify
 * Asks the gateway what really happened, then (only on success) creates the
 * order. Returns the order so the client can redirect to the success page.
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.body;
  const result = await paymentService.verifyPayment(req.user, { providerReference: paymentIntentId });

  if (!result.paid) {
    return res.status(402).json({
      success: false,
      message: result.message,
      code: 'PAYMENT_NOT_COMPLETED',
      data: { status: result.status, paymentId: result.paymentId },
    });
  }

  return res.json({
    success: true,
    message: 'Payment verified and order placed',
    data: { order: decorateOrder(result.order), paymentId: result.paymentId },
  });
});

/**
 * POST /api/payments/sandbox/complete
 * Sandbox only: plays the role of the gateway's hosted page reporting an
 * outcome. Never available when a real provider is configured.
 */
const completeSandboxPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId, outcome = 'success', sessionToken = '' } = req.body;
  const { payment } = await paymentService.completeSandbox(req.user, {
    providerReference: paymentIntentId,
    outcome,
    sessionToken,
  });

  res.json({
    success: true,
    message:
      outcome === 'success'
        ? 'Sandbox payment authorised'
        : outcome === 'failure'
          ? 'Sandbox payment declined'
          : 'Sandbox payment cancelled',
    data: { providerReference: payment.providerReference, status: payment.status },
  });
});

/** POST /api/payments/:reference/refund (customer self-service for cancelled orders) */
const refundPayment = asyncHandler(async (req, res) => {
  const Order = require('../models/Order');
  const order = await Order.findById(req.params.orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (String(order.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('This order does not belong to your account');
  }
  if (order.paymentStatus !== 'paid') throw ApiError.badRequest('Only paid orders can be refunded');
  if (order.orderStatus !== 'cancelled' && req.user.role !== 'admin') {
    throw ApiError.badRequest('Only cancelled orders can be refunded');
  }

  await paymentService.refundPayment(order, { changedBy: req.user._id });
  res.json({ success: true, message: 'Refund issued', data: { order: decorateOrder(order) } });
});

/**
 * POST /api/payments/webhook
 * Gateway callbacks. Verified with an HMAC signature (mock provider) or the
 * Stripe signing secret - no session required, signature is the credential.
 */
const handleWebhook = asyncHandler(async (req, res) => {
  const result = await paymentService.handleWebhook({
    rawBody: req.rawBody || JSON.stringify(req.body),
    headers: req.headers,
    body: req.body,
  });

  // A verified "succeeded" webhook places the order even if the customer
  // closed the browser before returning to the site.
  const body = req.body || {};
  if (body.providerReference && (body.status === 'succeeded' || body.type === 'payment_intent.succeeded')) {
    const payment = await Payment.findOne({ providerReference: body.providerReference || body.data?.object?.id });
    if (payment && !payment.order) {
      const User = require('../models/User');
      const user = await User.findById(payment.user);
      if (user) {
        try {
          await paymentService.verifyPayment(user, { providerReference: payment.providerReference });
        } catch (error) {
          // Webhook handlers must always 200 so the gateway does not retry forever
          // eslint-disable-next-line no-console
          console.error('[webhook] order creation failed:', error.message);
        }
      }
    }
  }

  res.json({ received: true, ...result });
});

module.exports = {
  getPaymentConfig,
  createPayment,
  verifyPayment,
  completeSandboxPayment,
  getPaymentStatus,
  refundPayment,
  handleWebhook,
};
