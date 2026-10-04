const express = require('express');
const orderController = require('../controllers/orderController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { createOrder, listOrders, cancelOrder } = require('../validators/orderValidators');

const router = express.Router();

router.use(protect);

router.route('/').get(validate(listOrders), orderController.listMyOrders).post(validate(createOrder), orderController.createOrder);

router.get('/validate-stock', orderController.validateStock);
router.get('/number/:orderNumber', orderController.getOrderByNumber);
router.get('/:id', orderController.getOrder);
router.get('/:id/invoice', orderController.getInvoice);
router.post('/:id/cancel', validate(cancelOrder), orderController.cancelOrder);
router.post('/:id/reorder', orderController.reorder);

module.exports = router;
