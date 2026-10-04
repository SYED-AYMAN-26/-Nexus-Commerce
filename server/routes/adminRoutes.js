const express = require('express');
const adminController = require('../controllers/adminController');
const validate = require('../middleware/validate');
const { protect, adminOnly } = require('../middleware/auth');
const { createProduct, updateProduct, categoryPayload } = require('../validators/productValidators');
const { updateOrderStatus, updatePaymentStatus, listOrders, cancelOrder } = require('../validators/orderValidators');
const { updateRole, updateStatus, listUsers } = require('../validators/userValidators');

const router = express.Router();

// Every route below requires a valid session AND the admin role
router.use(protect, adminOnly);

/* Dashboard ------------------------------------------------------------------ */
router.get('/dashboard', adminController.getDashboard);
router.get('/stats/sales', adminController.getSalesStats);
router.get('/inventory', adminController.getInventory);
router.get('/export/orders.csv', adminController.exportOrdersCsv);

/* Products ------------------------------------------------------------------- */
router.get('/products', adminController.listProducts);
router.post('/products', validate(createProduct), adminController.createProduct);
router.post('/products/bulk', adminController.bulkUpdateProducts);
router.get('/products/:id', adminController.getProduct);
router.put('/products/:id', validate(updateProduct), adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.patch('/products/:id/stock', adminController.updateStock);
router.post('/media/generate-artwork', adminController.generateArtwork);

/* Categories ----------------------------------------------------------------- */
router.get('/categories', adminController.listCategories);
router.post('/categories', validate(categoryPayload), adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

/* Orders --------------------------------------------------------------------- */
router.get('/orders', validate(listOrders), adminController.listOrders);
router.get('/orders/:id', adminController.getOrder);
router.patch('/orders/:id/status', validate(updateOrderStatus), adminController.updateOrderStatus);
router.patch('/orders/:id/payment-status', validate(updatePaymentStatus), adminController.updatePaymentStatus);
router.post('/orders/:id/refund', adminController.refundOrder);
router.post('/orders/:id/cancel', validate(cancelOrder), adminController.cancelOrder);

/* Users ---------------------------------------------------------------------- */
router.get('/users', validate(listUsers), adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id/role', validate(updateRole), adminController.updateUserRole);
router.patch('/users/:id/status', validate(updateStatus), adminController.updateUserStatus);

/* Reviews -------------------------------------------------------------------- */
router.get('/reviews', adminController.listReviews);
router.patch('/reviews/:id', adminController.moderateReview);
router.delete('/reviews/:id', adminController.deleteReview);

/* Coupons -------------------------------------------------------------------- */
router.get('/coupons', adminController.listCoupons);
router.post('/coupons', adminController.createCoupon);
router.put('/coupons/:id', adminController.updateCoupon);
router.delete('/coupons/:id', adminController.deleteCoupon);

/* Inventory ------------------------------------------------------------------ */
router.patch('/inventory/:productId', adminController.updateInventory);

module.exports = router;
