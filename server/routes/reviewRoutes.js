const express = require('express');
const { body } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const Review = require('../models/Review');
const productController = require('../controllers/productController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isObjectId } = require('../validators/productValidators');

const router = express.Router();

const createReviewBody = [
  body('productId').custom(isObjectId).withMessage('A valid product is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5').toInt(),
  body('title').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('comment').trim().isLength({ min: 3, max: 1200 }).withMessage('Review must be between 3 and 1200 characters'),
];

/** GET /api/reviews/my - everything the signed-in customer has written */
router.get(
  '/my',
  protect,
  asyncHandler(async (req, res) => {
    const reviews = await Review.find({ user: req.user._id })
      .sort('-createdAt')
      .populate('product', 'name slug images price')
      .lean();
    res.json({ success: true, data: { reviews, count: reviews.length } });
  }),
);

/** POST /api/reviews  { productId, rating, comment, title } */
router.post(
  '/',
  protect,
  validate(createReviewBody),
  (req, _res, next) => {
    req.params.productId = req.body.productId;
    next();
  },
  productController.createReview,
);

router.delete('/:reviewId', protect, productController.deleteReview);

module.exports = router;
