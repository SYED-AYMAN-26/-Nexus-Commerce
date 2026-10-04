const mongoose = require('mongoose');
const config = require('../config');
const ApiError = require('../utils/ApiError');

/** 404 for unmatched API routes. */
function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/** Translate driver / validation errors into ApiError instances. */
function normalizeError(err) {
  if (err instanceof ApiError) return err;

  if (err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.unprocessable('Please correct the highlighted fields', { errors, code: 'VALIDATION_ERROR' });
  }
  if (err.name === 'CastError') {
    return ApiError.badRequest(`Invalid value for "${err.path}"`, { code: 'INVALID_ID' });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || { field: 'value' })[0];
    return ApiError.conflict(`That ${field} is already in use`, { code: 'DUPLICATE_KEY', errors: [{ field, message: `${field} must be unique` }] });
  }
  if (err.name === 'JsonWebTokenError') return ApiError.unauthorized('Invalid session token');
  if (err.name === 'TokenExpiredError') return ApiError.unauthorized('Your session has expired');
  if (err.type === 'entity.parse.failed') return ApiError.badRequest('Malformed JSON payload');
  if (err.type === 'entity.too.large') return ApiError.badRequest('Request payload is too large');
  if (err.code === 'LIMIT_FILE_SIZE') return ApiError.badRequest('Uploaded file is too large (max 5MB)');
  if (err.code === 'LIMIT_UNEXPECTED_FILE') return ApiError.badRequest('Unexpected file field');

  if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || err.name === 'MongoServerError') {
    return new ApiError(503, 'The database is temporarily unavailable. Please try again.', { code: 'DB_ERROR' });
  }

  return new ApiError(err.statusCode || 500, err.message || 'Something went wrong');
}

/** Central error handler - never leaks stack traces or driver internals. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const normalized = normalizeError(err);
  const statusCode = normalized.statusCode || 500;

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('\x1b[31m[error]\x1b[0m', req.method, req.originalUrl, '\n', err);
  } else if (!config.isProduction) {
    // eslint-disable-next-line no-console
    console.warn('\x1b[33m[warn]\x1b[0m', req.method, req.originalUrl, '-', normalized.message);
  }

  const isServerError = statusCode >= 500;

  res.status(statusCode).json({
    success: false,
    message: isServerError && config.isProduction ? 'Something went wrong on our end. Please try again.' : normalized.message,
    code: normalized.code || undefined,
    errors: normalized.errors || undefined,
    ...(config.isProduction
      ? {}
      : {
        stack: err.stack,
        ...(err instanceof mongoose.Error ? { mongooseError: err.name } : {}),
      }),
  });
}

module.exports = { notFound, errorHandler, normalizeError };
