const express = require('express');
const addressController = require('../controllers/addressController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { addressPayload, addressId } = require('../validators/addressValidators');

const router = express.Router();

router.use(protect);

router.route('/').get(addressController.listAddresses).post(validate(addressPayload), addressController.createAddress);

router
  .route('/:addressId')
  .put(validate([...addressId, ...addressPayload]), addressController.updateAddress)
  .delete(validate(addressId), addressController.deleteAddress);

router.patch('/:addressId/default', validate(addressId), addressController.setDefaultAddress);

module.exports = router;
