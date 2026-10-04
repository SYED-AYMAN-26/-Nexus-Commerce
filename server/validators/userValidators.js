const { body, param, query } = require('express-validator');
const { isObjectId } = require('./productValidators');

const updateRole = [
  param('id').custom(isObjectId).withMessage('Invalid user id'),
  body('role').isIn(['user', 'admin']).withMessage('Role must be either user or admin'),
];

const updateStatus = [
  param('id').custom(isObjectId).withMessage('Invalid user id'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean').toBoolean(),
];

const listUsers = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['user', 'admin']),
];

const wishlistPayload = [body('productId').custom(isObjectId).withMessage('A valid product is required')];

module.exports = { updateRole, updateStatus, listUsers, wishlistPayload };
