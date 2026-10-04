const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs the express-validator chains for a route and converts failures into a
 * single 422 response with a `errors` array the client maps onto form fields.
 */
function validate(validations) {
  return async (req, _res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const errors = result.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));

    return next(ApiError.unprocessable(errors[0].message, { errors, code: 'VALIDATION_ERROR' }));
  };
}

module.exports = validate;
