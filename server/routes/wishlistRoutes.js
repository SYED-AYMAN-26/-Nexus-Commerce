const express = require('express');
const userController = require('../controllers/userController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { wishlistPayload } = require('../validators/userValidators');

const router = express.Router();

router.use(protect);

router.route('/').get(userController.getWishlist).post(validate(wishlistPayload), userController.addToWishlist).delete(userController.clearWishlist);
router.delete('/:productId', userController.removeFromWishlist);

module.exports = router;
