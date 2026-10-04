const { body, param } = require('express-validator');
const { isObjectId } = require('./productValidators');

const addressPayload = [
  body('fullName').trim().isLength({ min: 2, max: 80 }).withMessage('Full name is required'),
  body('phone').trim().matches(/^[+\d][\d\s\-()]{6,19}$/).withMessage('A valid phone number is required'),
  body('addressLine1').trim().isLength({ min: 4, max: 160 }).withMessage('Address line 1 is required'),
  body('addressLine2').optional({ values: 'falsy' }).trim().isLength({ max: 160 }),
  body('city').trim().isLength({ min: 2, max: 80 }).withMessage('City is required'),
  body('state').trim().isLength({ min: 2, max: 80 }).withMessage('State is required'),
  body('postalCode').trim().isLength({ min: 3, max: 16 }).withMessage('Postal code is required'),
  body('country').trim().isLength({ min: 2, max: 80 }).withMessage('Country is required'),
  body('label').optional({ values: 'falsy' }).trim().isLength({ max: 40 }),
  body('isDefault').optional().isBoolean().toBoolean(),
];

const addressId = [param('addressId').custom(isObjectId).withMessage('Invalid address id')];

module.exports = { addressPayload, addressId };
