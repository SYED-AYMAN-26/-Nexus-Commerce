const express = require('express');
const productController = require('../controllers/productController');
const adminController = require('../controllers/adminController');
const validate = require('../middleware/validate');
const { protect, adminOnly } = require('../middleware/auth');
const { categoryPayload } = require('../validators/productValidators');

const router = express.Router();

router.get('/', productController.listCategories);
router.get('/:slug', productController.getCategory);

// Admin write access
router.post('/', protect, adminOnly, validate(categoryPayload), adminController.createCategory);
router.put('/:id', protect, adminOnly, adminController.updateCategory);
router.delete('/:id', protect, adminOnly, adminController.deleteCategory);

module.exports = router;
