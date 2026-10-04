/**
 * Application error type. Controllers throw `ApiError` and the global error
 * handler converts it into a predictable JSON payload. Operational errors are
 * safe to expose to clients, programming errors never are.
 */
class ApiError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = options.code || null;
    this.errors = options.errors || null;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', options) {
    return new ApiError(400, message, options);
  }

  static unauthorized(message = 'Authentication required', options) {
    return new ApiError(401, message, options);
  }

  static forbidden(message = 'You do not have permission to perform this action', options) {
    return new ApiError(403, message, options);
  }

  static notFound(message = 'Resource not found', options) {
    return new ApiError(404, message, options);
  }

  static conflict(message = 'Resource already exists', options) {
    return new ApiError(409, message, options);
  }

  static unprocessable(message = 'Validation failed', options) {
    return new ApiError(422, message, options);
  }

  static tooMany(message = 'Too many requests', options) {
    return new ApiError(429, message, options);
  }

  static internal(message = 'Something went wrong', options) {
    return new ApiError(500, message, options);
  }
}

module.exports = ApiError;
