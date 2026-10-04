const rateLimit = require('express-rate-limit');
const config = require('../config');

const handler = (_req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please slow down and try again in a moment.',
    code: 'RATE_LIMITED',
  });
};

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  handler,
};

/** Global limiter applied to the whole API. Disabled in tests for speed. */
const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: config.isProduction ? 600 : 5000,
  message: 'Too many requests from this IP',
});

/** Tight limiter for credential endpoints to blunt brute-force attempts. */
const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 25,
  skipSuccessfulRequests: true,
});

const paymentLimiter = rateLimit({
  ...base,
  windowMs: 10 * 60 * 1000,
  max: 60,
});

module.exports = { apiLimiter, authLimiter, paymentLimiter };
