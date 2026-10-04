const { body, param, query } = require('express-validator');
const { isObjectId } = require('./productValidators');

const addressRules = [
  body('shippingAddress.fullName').trim().isLength({ min: 2, max: 80 }).withMessage('Full name is required'),
  body('shippingAddress.phone').trim().matches(/^[+\d][\d\s\-()]{6,19}$/).withMessage('A valid phone number is required'),
  body('shippingAddress.addressLine1').trim().isLength({ min: 4, max: 160 }).withMessage('Address line 1 is required'),
  body('shippingAddress.addressLine2').optional({ values: 'falsy' }).trim().isLength({ max: 160 }),
  body('shippingAddress.city').trim().isLength({ min: 2, max: 80 }).withMessage('City is required'),
  body('shippingAddress.state').trim().isLength({ min: 2, max: 80 }).withMessage('State is required'),
  body('shippingAddress.postalCode').trim().isLength({ min: 3, max: 16 }).withMessage('Postal code is required'),
  body('shippingAddress.country').trim().isLength({ min: 2, max: 80 }).withMessage('Country is required'),
];

const createOrder = [
  body('paymentIntentId').isString().isLength({ min: 8 }).withMessage('A verified payment session is required'),
  body('addressId').optional({ values: 'null' }).custom(isObjectId).withMessage('Invalid address'),
  ...addressRules,
  body('paymentMethod').optional().isIn(['card', 'upi', 'netbanking', 'wallet', 'cod']),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
];

const previewOrder = [
  body('addressId').optional({ values: 'null' }).custom(isObjectId).withMessage('Invalid address'),
  body('couponCode').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
];

const updateOrderStatus = [
  param('id').custom(isObjectId).withMessage('Invalid order id'),
  body('orderStatus').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid order status'),
  body('note').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('restoreStock').optional().isBoolean().toBoolean(),
];

const updatePaymentStatus = [
  param('id').custom(isObjectId).withMessage('Invalid order id'),
  body('paymentStatus').isIn(['pending', 'paid', 'failed', 'refunded']).withMessage('Invalid payment status'),
  body('note').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
];

const listOrders = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 60 }).toInt(),
  query('orderStatus').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  query('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded']),
];

const cancelOrder = [body('reason').optional({ values: 'falsy' }).trim().isLength({ max: 300 })];

module.exports = { createOrder, previewOrder, updateOrderStatus, updatePaymentStatus, listOrders, cancelOrder, addressRules };
