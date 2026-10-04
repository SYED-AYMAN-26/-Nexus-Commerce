const express = require('express');
const productController = require('../controllers/productController');
const adminController = require('../controllers/adminController');
const validate = require('../middleware/validate');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
const { listProducts, createProduct, updateProduct } = require('../validators/productValidators');
const { createReview } = require('../validators/reviewValidators');

const router = express.Router();

// Public catalogue ------------------------------------------------------------
router.get('/', validate(listProducts), productController.listProducts);
router.get('/home', productController.getHomeContent);
router.get('/facets', productController.getFacets);
router.get('/search', productController.searchProducts);
router.get('/suggest', productController.suggestProducts);
router.get('/:idOrSlug', optionalAuth, productController.getProduct);

// Reviews ---------------------------------------------------------------------
router.get('/:productId/reviews', productController.getProductReviews);
router.post('/:productId/reviews', protect, validate(createReview), productController.createReview);
router.delete('/:productId/reviews/:reviewId', protect, productController.deleteReview);

// Admin write access (mirrors /api/admin/products so both documented REST
// shapes work - the handlers are shared, not duplicated).
router.post('/', protect, adminOnly, validate(createProduct), adminController.createProduct);
router.put('/:id', protect, adminOnly, validate(updateProduct), adminController.updateProduct);
router.delete('/:id', protect, adminOnly, adminController.deleteProduct);

module.exports = router;
