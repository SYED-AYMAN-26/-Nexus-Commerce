const { body } = require('express-validator');

const createPaymentIntent = [
  body('addressId').optional({ values: 'null' }).isString().trim().isLength({ max: 60 }),
  body('couponCode').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  body('paymentMethod').optional().isIn(['card', 'upi', 'netbanking', 'wallet']).withMessage('Unsupported payment method'),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Order notes are limited to 500 characters'),
];

const verifyPayment = [
  body('paymentIntentId').isString().isLength({ min: 8 }).withMessage('A payment reference is required'),
  body('outcome')
    .optional()
    .isIn(['success', 'failure', 'cancel'])
    .withMessage('Outcome must be success, failure or cancel'),
];

module.exports = { createPaymentIntent, verifyPayment };
