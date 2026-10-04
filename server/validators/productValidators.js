const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const createProduct = [
  body('name').trim().isLength({ min: 3, max: 140 }).withMessage('Product name must be 3-140 characters'),
  body('description').trim().isLength({ min: 20, max: 6000 }).withMessage('Description must be at least 20 characters'),
  body('shortDescription').optional({ values: 'falsy' }).trim().isLength({ max: 260 }),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number').toFloat(),
  body('discountPrice')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a positive number')
    .toFloat()
    .custom((value, { req }) => !value || Number(value) < Number(req.body.price))
    .withMessage('Discount price must be lower than the regular price'),
  body('category').custom(isObjectId).withMessage('Please choose a valid category'),
  body('brand').trim().isLength({ min: 1, max: 60 }).withMessage('Brand is required'),
  body('SKU').trim().isLength({ min: 2, max: 40 }).withMessage('SKU is required'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be zero or greater').toInt(),
  body('images').optional().isArray({ max: 8 }).withMessage('Maximum 8 images allowed'),
  body('images.*').optional().isString().trim().isLength({ max: 500 }),
  body('variants').optional().isArray(),
  body('variants.*.name').optional().trim().isLength({ min: 1, max: 80 }).withMessage('Variant name is required'),
  body('variants.*.stock').optional().isInt({ min: 0 }).withMessage('Variant stock must be zero or greater').toInt(),
  body('variants.*.priceDelta').optional().isFloat().toFloat(),
  body('specifications').optional().isArray(),
  body('specifications.*.key').optional().trim().isLength({ min: 1, max: 60 }),
  body('specifications.*.value').optional().trim().isLength({ min: 1, max: 200 }),
  body('tags').optional().isArray(),
  body('badges').optional().isArray(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('isFeatured').optional().isBoolean().toBoolean(),
  body('isNewArrival').optional().isBoolean().toBoolean(),
];

const updateProduct = [
  param('id').custom(isObjectId).withMessage('Invalid product id'),
  body('name').optional().trim().isLength({ min: 3, max: 140 }),
  body('description').optional().trim().isLength({ min: 20, max: 6000 }),
  body('price').optional().isFloat({ min: 0 }).toFloat(),
  body('discountPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).toFloat(),
  body('category').optional().custom(isObjectId).withMessage('Please choose a valid category'),
  body('stock').optional().isInt({ min: 0 }).toInt(),
  body('variants').optional().isArray(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('isFeatured').optional().isBoolean().toBoolean(),
];

const listProducts = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 60 }).toInt(),
  query('minPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('rating').optional().isFloat({ min: 0, max: 5 }).toFloat(),
  query('inStock').optional().isIn(['true', 'false']),
  query('featured').optional().isIn(['true', 'false']),
];

const categoryPayload = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Category name must be 2-60 characters'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 400 }),
  body('image').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('icon').optional({ values: 'falsy' }).trim().isLength({ max: 60 }),
  body('featured').optional().isBoolean().toBoolean(),
  body('displayOrder').optional().isInt().toInt(),
];

module.exports = { createProduct, updateProduct, listProducts, categoryPayload, isObjectId };
