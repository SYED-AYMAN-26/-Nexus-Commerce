const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const MAX_ADDRESSES = 10;

const normalize = (body) => ({
  label: body.label || 'Home',
  fullName: body.fullName,
  phone: body.phone,
  addressLine1: body.addressLine1,
  addressLine2: body.addressLine2 || '',
  city: body.city,
  state: body.state,
  postalCode: body.postalCode,
  country: body.country || 'India',
  isDefault: Boolean(body.isDefault),
});

/** GET /api/addresses */
const listAddresses = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { addresses: req.user.addresses } });
});

/** POST /api/addresses */
const createAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.addresses.length >= MAX_ADDRESSES) {
    throw ApiError.badRequest(`You can save up to ${MAX_ADDRESSES} addresses. Please remove one first.`);
  }

  const payload = normalize(req.body);
  if (user.addresses.length === 0) payload.isDefault = true;
  if (payload.isDefault) user.addresses.forEach((a) => { a.isDefault = false; });

  user.addresses.push(payload);
  await user.save();

  res.status(201).json({ success: true, message: 'Address added', data: { addresses: user.addresses } });
});

/** PUT /api/addresses/:addressId */
const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found');

  const payload = normalize({ ...address.toObject(), ...req.body });
  if (req.body.isDefault) user.addresses.forEach((a) => { a.isDefault = false; });
  // Never allow the single remaining address to lose default status
  if (!payload.isDefault && user.addresses.length === 1) payload.isDefault = true;

  Object.assign(address, payload);
  await user.save();

  res.json({ success: true, message: 'Address updated', data: { addresses: user.addresses } });
});

/** DELETE /api/addresses/:addressId */
const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found');

  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && user.addresses.length) user.addresses[0].isDefault = true;

  await user.save();
  res.json({ success: true, message: 'Address removed', data: { addresses: user.addresses } });
});

/** PATCH /api/addresses/:addressId/default */
const setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found');

  user.addresses.forEach((a) => { a.isDefault = String(a._id) === String(address._id); });
  await user.save();

  res.json({ success: true, message: 'Default address updated', data: { addresses: user.addresses } });
});

module.exports = { listAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress };
