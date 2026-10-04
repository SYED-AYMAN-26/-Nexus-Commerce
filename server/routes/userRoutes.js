const express = require('express');
const userController = require('../controllers/userController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const v = require('../validators/authValidators');

const router = express.Router();

router.use(protect);

router.put('/profile', validate(v.updateProfile), userController.updateProfile);
router.get('/stats', userController.getStats);
router.delete('/account', userController.deleteAccount);

module.exports = router;
