const express = require('express');
const cartController = require('../controllers/cartController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { addToCart, updateCartItem, cartItemParam, mergeCart, applyCoupon } = require('../validators/cartValidators');

const router = express.Router();

router.use(protect);

router.route('/').get(cartController.getCart).post(validate(addToCart), cartController.addToCart).delete(cartController.clearCart);

router.get('/count', cartController.getCartCount);
router.post('/merge', validate(mergeCart), cartController.mergeCart);
router.post('/preview', cartController.previewCheckout);

router.route('/coupon').post(validate(applyCoupon), cartController.applyCoupon).delete(cartController.removeCoupon);

router.route('/:itemId').put(validate(updateCartItem), cartController.updateCartItem).delete(validate(cartItemParam), cartController.removeCartItem);

module.exports = router;
