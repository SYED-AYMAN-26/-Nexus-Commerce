const { body, param } = require('express-validator');
const { isObjectId } = require('./productValidators');

const addToCart = [
  body('productId').custom(isObjectId).withMessage('A valid product is required'),
  body('quantity').optional().isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10').toInt(),
  body('variantId').optional({ values: 'null' }).custom(isObjectId).withMessage('Invalid variant'),
];

const updateCartItem = [
  param('itemId').custom(isObjectId).withMessage('Invalid cart item'),
  body('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10').toInt(),
];

const cartItemParam = [param('itemId').custom(isObjectId).withMessage('Invalid cart item')];

const mergeCart = [
  body('items').isArray({ min: 0, max: 40 }).withMessage('items must be an array'),
  body('items.*.productId').custom(isObjectId).withMessage('Invalid product in cart payload'),
  body('items.*.quantity').optional().isInt({ min: 1, max: 10 }).toInt(),
  body('items.*.variantId').optional({ values: 'null' }).custom(isObjectId).withMessage('Invalid variant'),
];

const applyCoupon = [body('code').trim().isLength({ min: 2, max: 30 }).withMessage('Enter a valid coupon code')];

module.exports = { addToCart, updateCartItem, cartItemParam, mergeCart, applyCoupon };
