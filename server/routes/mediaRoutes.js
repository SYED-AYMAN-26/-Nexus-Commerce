const express = require('express');
const mediaController = require('../controllers/mediaController');

const router = express.Router();

router.get('/products/:slug', mediaController.productImage);
router.get('/banners/:seed', mediaController.bannerImage);
router.get('/categories/:slug', mediaController.categoryImage);

module.exports = router;
