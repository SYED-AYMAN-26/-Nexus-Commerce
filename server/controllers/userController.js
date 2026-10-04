const User = require('../models/User');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { serializeUser } = require('./authController');

/** PUT /api/users/profile */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, avatar } = req.body;
  const user = await User.findById(req.user._id);

  if (email && String(email).toLowerCase() !== user.email) {
    const taken = await User.exists({ email: String(email).toLowerCase(), _id: { $ne: user._id } });
    if (taken) {
      throw ApiError.conflict('That email address is already registered to another account', {
        code: 'EMAIL_IN_USE',
        errors: [{ field: 'email', message: 'Email already in use' }],
      });
    }
    user.email = email;
  }
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  res.json({ success: true, message: 'Profile updated', data: { user: serializeUser(user) } });
});

/** GET /api/users/stats - small summary widgets on the account overview. */
const getStats = asyncHandler(async (req, res) => {
  const [orderCount, spentAgg, reviewCount, pendingCount] = await Promise.all([
    Order.countDocuments({ user: req.user._id }),
    Order.aggregate([
      { $match: { user: req.user._id, paymentStatus: 'paid', orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Review.countDocuments({ user: req.user._id }),
    Order.countDocuments({ user: req.user._id, orderStatus: { $in: ['pending', 'confirmed', 'processing', 'shipped'] } }),
  ]);

  res.json({
    success: true,
    data: {
      orderCount,
      totalSpent: spentAgg[0]?.total || 0,
      reviewCount,
      pendingCount,
      wishlistCount: req.user.wishlist?.length || 0,
      addressCount: req.user.addresses?.length || 0,
    },
  });
});

/** DELETE /api/users/account - self service account deletion (guarded). */
const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(password))) throw ApiError.badRequest('Password is incorrect');

  const activeOrders = await Order.countDocuments({ user: user._id, orderStatus: { $in: ['confirmed', 'processing', 'shipped'] } });
  if (activeOrders > 0) throw ApiError.badRequest('You have orders in progress. Please wait for them to complete before deleting your account.');

  await User.deleteOne({ _id: user._id });
  res.json({ success: true, message: 'Your account has been deleted' });
});

/* ------------------------------------------------------------------ wishlist */

/** GET /api/wishlist */
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'wishlist',
    select: 'name slug images price discountPrice rating numReviews stock brand isActive variants',
    populate: { path: 'category', select: 'name slug' },
  });

  const items = (user.wishlist || []).map((product) => {
    const doc = product.toObject ? product.toObject({ virtuals: true }) : product;
    return { ...doc, inStock: doc.inStock ?? doc.stock > 0 };
  });

  res.json({ success: true, data: { items, count: items.length } });
});

/** POST /api/wishlist  { productId } */
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const product = await Product.findOne({ _id: productId, isActive: true }).select('name');
  if (!product) throw ApiError.notFound('Product not found');

  const user = await User.findById(req.user._id);
  if (user.isWishlisted(productId)) {
    return res.json({ success: true, message: 'Already in your wishlist', data: { wishlist: user.wishlist } });
  }

  user.wishlist.unshift(productId);
  // Keep the list bounded
  if (user.wishlist.length > 200) user.wishlist = user.wishlist.slice(0, 200);
  await user.save();

  return res.status(201).json({
    success: true,
    message: `${product.name} added to your wishlist`,
    data: { wishlist: user.wishlist },
  });
});

/** DELETE /api/wishlist/:productId */
const removeFromWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const before = user.wishlist.length;
  user.wishlist = user.wishlist.filter((id) => String(id) !== String(req.params.productId));
  if (user.wishlist.length === before) throw ApiError.notFound('That product is not in your wishlist');
  await user.save();
  res.json({ success: true, message: 'Removed from wishlist', data: { wishlist: user.wishlist } });
});

/** DELETE /api/wishlist - clear the whole list */
const clearWishlist = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $set: { wishlist: [] } });
  res.json({ success: true, message: 'Wishlist cleared', data: { wishlist: [] } });
});

module.exports = {
  updateProfile,
  getStats,
  deleteAccount,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
};
