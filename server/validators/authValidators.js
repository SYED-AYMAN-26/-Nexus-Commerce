const { body } = require('express-validator');

const passwordRule = (field = 'password') =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/\d/)
    .withMessage('Password must contain a number');

const register = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
  body('email').trim().toLowerCase().isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  passwordRule('password'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

const login = [
  body('email').trim().toLowerCase().isEmail().withMessage('Please enter a valid email address'),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

const forgotPassword = [body('email').trim().toLowerCase().isEmail().withMessage('Please enter a valid email address')];

const resetPassword = [
  body('token').isString().isLength({ min: 20 }).withMessage('This reset link is invalid'),
  passwordRule('password'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

const changePassword = [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  passwordRule('newPassword'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
];

const updateProfile = [
  body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
  body('email').optional().trim().toLowerCase().isEmail().withMessage('Please enter a valid email address'),
  body('phone').optional({ values: 'falsy' }).trim().matches(/^[+\d][\d\s\-()]{6,19}$/).withMessage('Please enter a valid phone number'),
];

module.exports = { register, login, forgotPassword, resetPassword, changePassword, updateProfile, passwordRule };
