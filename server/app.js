const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const config = require('./config');
const routes = require('./routes');
const ApiError = require('./utils/ApiError');
const { notFound, errorHandler } = require('./middleware/error');
const { apiLimiter } = require('./middleware/rateLimit');

const app = express();

/* ------------------------------------------------------------------ security */

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    // The API returns JSON and inline SVG artwork; disable the strict CSP that
    // would block the sandbox checkout page's inline script.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

/**
 * CORS. The Vite dev server, the bundled preview host and any origin listed in
 * CORS_EXTRA_ORIGINS are allowed. Requests with no Origin (curl, server-to-server,
 * same-origin production) pass through untouched.
 */
const isPreviewHost = (origin) =>
  /https?:\/\/[a-z0-9-]+\.e2b\.app$/i.test(origin) ||
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/i.test(origin);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (config.cors.origins.includes(origin)) return callback(null, true);
      if (!config.isProduction && isPreviewHost(origin)) return callback(null, true);
      return callback(ApiError.forbidden(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'stripe-signature', 'x-nexus-signature', 'x-nexus-timestamp'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400,
  }),
);

/* ------------------------------------------------------------------ parsers */

app.use(compression());
app.use(cookieParser());

// Webhook routes need the untouched body so signatures can be verified
app.use(
  express.json({
    limit: '1mb',
    verify(req, _res, buf) {
      if (req.originalUrl.includes('/payments/webhook')) req.rawBody = buf.toString('utf8');
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (!config.isProduction) {
  app.use(morgan('dev', { skip: (req) => req.originalUrl === '/api/health' }));
} else {
  app.use(morgan('combined'));
}

/* -------------------------------------------------------------------- routes */

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Nexus Commerce API',
    docs: '/api/docs',
    health: '/api/health',
    client: config.clientUrl,
  });
});

// Static uploads (product images added by admins)
app.use('/uploads', express.static('public/uploads', { maxAge: '7d' }));

app.use('/api', apiLimiter, routes);

// Serve the built SPA when it exists (single-service production deployment)
const path = require('path');
const clientDist = path.resolve(__dirname, '../client/dist');
if (config.isProduction && require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1h' }));
  app.get(/^\/(?!api|uploads).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

/* ------------------------------------------------------------------- errors */

app.use(notFound);
app.use(errorHandler);

/** Startup guard - surfaces misconfiguration early instead of at request time. */
function assertEnvironment() {
  const warnings = [];
  if (!config.payments.secretKey && config.payments.provider === 'mock') {
    warnings.push('PAYMENT_SECRET_KEY is not set - the sandbox gateway is using a default signing key.');
  }
  if (config.payments.provider === 'stripe' && !config.payments.stripeSecretKey) {
    warnings.push('PAYMENT_PROVIDER=stripe but STRIPE_SECRET_KEY is missing - payments will fail.');
  }
  if (mongoose.connection.readyState !== 1) warnings.push('MongoDB is not connected.');
  warnings.forEach((w) => console.warn(`\x1b[33m[startup]\x1b[0m ${w}`));
  return warnings;
}

module.exports = app;
module.exports.assertEnvironment = assertEnvironment;
