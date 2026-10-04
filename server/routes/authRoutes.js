const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const v = require('../validators/authValidators');

const router = express.Router();

router.post('/register', authLimiter, validate(v.register), authController.register);
router.post('/login', authLimiter, validate(v.login), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', protect, authController.refresh);

router.get('/profile', protect, authController.getProfile);
router.get('/check-email', authController.checkEmail);

router.post('/forgot-password', authLimiter, validate(v.forgotPassword), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(v.resetPassword), authController.resetPassword);
router.post('/change-password', protect, validate(v.changePassword), authController.changePassword);

module.exports = router;
