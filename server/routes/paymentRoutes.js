const express = require('express');
const paymentController = require('../controllers/paymentController');
const sandboxController = require('../controllers/sandboxController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimit');
const { createPaymentIntent, verifyPayment } = require('../validators/paymentValidators');

const router = express.Router();

router.get('/config', paymentController.getPaymentConfig);

// Sandbox "hosted checkout" page - stands in for the gateway's own UI
router.get('/sandbox/checkout/:reference', sandboxController.checkoutPage);
router.post('/sandbox/complete', protect, paymentController.completeSandboxPayment);

// Webhooks are authenticated by signature, never by a session cookie
router.post('/webhook', paymentController.handleWebhook);

router.post('/create', protect, paymentLimiter, validate(createPaymentIntent), paymentController.createPayment);
router.post('/verify', protect, paymentLimiter, validate(verifyPayment), paymentController.verifyPayment);
router.get('/:reference', protect, paymentController.getPaymentStatus);
router.post('/orders/:orderId/refund', protect, paymentController.refundPayment);

module.exports = router;
