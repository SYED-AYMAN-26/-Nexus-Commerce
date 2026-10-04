const { body, param } = require('express-validator');
const { isObjectId } = require('./productValidators');

const createReview = [
  param('productId').custom(isObjectId).withMessage('Invalid product'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5').toInt(),
  body('title').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('comment').trim().isLength({ min: 3, max: 1200 }).withMessage('Review must be between 3 and 1200 characters'),
];

const updateReview = [
  param('id').custom(isObjectId).withMessage('Invalid review'),
  body('rating').optional().isInt({ min: 1, max: 5 }).toInt(),
  body('title').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('comment').optional().trim().isLength({ min: 3, max: 1200 }),
];

module.exports = { createReview, updateReview };
