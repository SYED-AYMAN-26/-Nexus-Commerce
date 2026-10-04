const express = require('express');
const config = require('../config');

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const addressRoutes = require('./addressRoutes');
const wishlistRoutes = require('./wishlistRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const cartRoutes = require('./cartRoutes');
const orderRoutes = require('./orderRoutes');
const paymentRoutes = require('./paymentRoutes');
const reviewRoutes = require('./reviewRoutes');
const adminRoutes = require('./adminRoutes');
const mediaRoutes = require('./mediaRoutes');

const router = express.Router();

/** GET /api - machine readable index of the API surface. */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'Nexus Commerce API',
    version: '1.0.0',
    documentation: '/api/docs',
    paymentProvider: config.payments.provider,
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      addresses: '/api/addresses',
      wishlist: '/api/wishlist',
      products: '/api/products',
      categories: '/api/categories',
      cart: '/api/cart',
      orders: '/api/orders',
      payments: '/api/payments',
      reviews: '/api/reviews',
      admin: '/api/admin',
      media: '/api/media',
    },
  });
});

/** GET /api/docs - lightweight self-describing endpoint catalogue. */
router.get('/docs', (_req, res) => {
  res.json({
    success: true,
    data: [
      { method: 'POST', path: '/api/auth/register', auth: false, description: 'Create an account' },
      { method: 'POST', path: '/api/auth/login', auth: false, description: 'Sign in and receive a session' },
      { method: 'POST', path: '/api/auth/logout', auth: false, description: 'Revoke the current session' },
      { method: 'GET', path: '/api/auth/profile', auth: 'user', description: 'Current user profile' },
      { method: 'POST', path: '/api/auth/forgot-password', auth: false, description: 'Request a reset link' },
      { method: 'POST', path: '/api/auth/reset-password', auth: false, description: 'Reset with a token' },
      { method: 'PUT', path: '/api/users/profile', auth: 'user', description: 'Update name/email/phone' },
      { method: 'GET', path: '/api/products', auth: false, description: 'List, search, filter, sort, paginate' },
      { method: 'GET', path: '/api/products/home', auth: false, description: 'Homepage content rails' },
      { method: 'GET', path: '/api/products/facets', auth: false, description: 'Filter facets (brands, price range)' },
      { method: 'GET', path: '/api/products/search', auth: false, description: 'Search with suggestions' },
      { method: 'GET', path: '/api/products/:idOrSlug', auth: false, description: 'Product detail + related + reviews' },
      { method: 'POST', path: '/api/products/:productId/reviews', auth: 'user', description: 'Review a purchased product' },
      { method: 'GET', path: '/api/categories', auth: false, description: 'List categories with counts' },
      { method: 'GET', path: '/api/cart', auth: 'user', description: 'Cart with server-computed totals' },
      { method: 'POST', path: '/api/cart', auth: 'user', description: 'Add a product/variant' },
      { method: 'PUT', path: '/api/cart/:itemId', auth: 'user', description: 'Change quantity' },
      { method: 'DELETE', path: '/api/cart/:itemId', auth: 'user', description: 'Remove a line' },
      { method: 'GET', path: '/api/wishlist', auth: 'user', description: 'Saved products' },
      { method: 'POST', path: '/api/wishlist', auth: 'user', description: 'Save a product' },
      { method: 'DELETE', path: '/api/wishlist/:productId', auth: 'user', description: 'Unsave a product' },
      { method: 'GET', path: '/api/addresses', auth: 'user', description: 'Saved addresses' },
      { method: 'POST', path: '/api/addresses', auth: 'user', description: 'Add an address' },
      { method: 'PUT', path: '/api/addresses/:addressId', auth: 'user', description: 'Edit an address' },
      { method: 'DELETE', path: '/api/addresses/:addressId', auth: 'user', description: 'Delete an address' },
      { method: 'POST', path: '/api/payments/create', auth: 'user', description: 'Create a gateway session for the cart' },
      { method: 'POST', path: '/api/payments/verify', auth: 'user', description: 'Verify with the gateway and create the order' },
      { method: 'POST', path: '/api/payments/webhook', auth: false, description: 'Signed gateway callback' },
      { method: 'GET', path: '/api/orders', auth: 'user', description: 'Order history' },
      { method: 'GET', path: '/api/orders/:id', auth: 'user', description: 'Order detail + progress tracker' },
      { method: 'POST', path: '/api/orders/:id/cancel', auth: 'user', description: 'Cancel an order' },
      { method: 'GET', path: '/api/orders/:id/invoice', auth: 'user', description: 'Printable invoice' },
      { method: 'GET', path: '/api/admin/dashboard', auth: 'admin', description: 'KPIs + charts' },
      { method: 'GET', path: '/api/admin/products', auth: 'admin', description: 'Manage products' },
      { method: 'POST', path: '/api/admin/products', auth: 'admin', description: 'Create a product' },
      { method: 'GET', path: '/api/admin/orders', auth: 'admin', description: 'Manage orders' },
      { method: 'PATCH', path: '/api/admin/orders/:id/status', auth: 'admin', description: 'Update order status' },
      { method: 'GET', path: '/api/admin/users', auth: 'admin', description: 'Manage users' },
      { method: 'PATCH', path: '/api/admin/inventory/:productId', auth: 'admin', description: 'Update inventory' },
    ],
  });
});

/** GET /api/health - readiness probe used by the client and deployments. */
router.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    success: true,
    status: 'ok',
    uptime: Math.round(process.uptime()),
    environment: config.env,
    database: states[mongoose.connection.readyState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/addresses', addressRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);
router.use('/media', mediaRoutes);

module.exports = router;
