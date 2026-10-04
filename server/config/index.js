/**
 * Central runtime configuration.
 * Every value comes from the environment - nothing sensitive is hard coded.
 * `.env.example` documents every supported variable.
 */
const path = require('path');
const dotenv = require('dotenv');

// Load server/.env first, then fall back to the repo root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toFloat = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

/**
 * In development we allow a fully working configuration with zero setup so the
 * project boots out of the box. In production every secret must be provided.
 */
const requireSecret = (name, devFallback) => {
  const value = process.env[name];
  if (value && value !== 'change-me-to-a-long-random-string' && value !== 'change-me-too-another-long-random-string') {
    return value;
  }
  if (isProduction) {
    // eslint-disable-next-line no-console
    console.error(`\x1b[31m[config] Missing required environment variable: ${name}\x1b[0m`);
    process.exit(1);
  }
  return devFallback;
};

const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

const config = {
  env,
  isProduction,
  port: toInt(process.env.PORT, 5000),
  apiUrl: process.env.API_URL || `http://localhost:${toInt(process.env.PORT, 5000)}`,
  clientUrl,
  cors: {
    origins: [clientUrl, ...(process.env.CORS_EXTRA_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)],
  },
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexus_commerce',
  jwt: {
    secret: requireSecret('JWT_SECRET', 'nexus_dev_jwt_secret_do_not_use_in_production'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    resetSecret: requireSecret('JWT_RESET_SECRET', 'nexus_dev_reset_secret_do_not_use_in_production'),
    resetExpiresIn: process.env.JWT_RESET_EXPIRES_IN || '15m',
  },
  cookie: {
    secure: toBool(process.env.COOKIE_SECURE, isProduction),
    name: 'nexus_token',
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },
  payments: {
    // `mock` = bundled sandbox gateway (no external account needed), `stripe` = Stripe test/live
    provider: (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase(),
    secretKey: process.env.PAYMENT_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || '',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },
  business: {
    shippingFlatRate: toInt(process.env.SHIPPING_FLAT_RATE, 99),
    freeShippingThreshold: toInt(process.env.FREE_SHIPPING_THRESHOLD, 1999),
    taxRate: toFloat(process.env.TAX_RATE, 0.18),
    currency: process.env.CURRENCY || 'INR',
    lowStockThreshold: toInt(process.env.LOW_STOCK_THRESHOLD, 10),
    maxQtyPerLineItem: 10,
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@nexus.dev',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    customerEmail: process.env.SEED_CUSTOMER_EMAIL || 'customer@nexus.dev',
    customerPassword: process.env.SEED_CUSTOMER_PASSWORD || 'Customer@123',
  },
};

module.exports = config;
