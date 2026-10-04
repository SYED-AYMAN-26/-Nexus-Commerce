const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('slugify');
const statsService = require('../services/statsService');
const orderService = require('../services/orderService');
const paymentService = require('../services/paymentService');
const { parsePagination, buildPaginationMeta, escapeRegex } = require('../utils/query');
const { generateProductSvg } = require('../utils/media');
const { recalculateProductRating } = require('../models/Review');
const { decorateOrder } = require('./orderController');

/* ----------------------------------------------------------------- dashboard */

/** GET /api/admin/dashboard?days=30 */
const getDashboard = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
  const data = await statsService.getDashboard(days);
  res.json({ success: true, data });
});

/** GET /api/admin/stats/sales?days=30 */
const getSalesStats = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
  const [series, categories, top] = await Promise.all([
    statsService.getSalesTimeseries(days),
    statsService.getCategoryPerformance(),
    statsService.getTopProducts(10),
  ]);
  res.json({ success: true, data: { series, categories, ...top } });
});

/* ------------------------------------------------------------------ products */

/** GET /api/admin/products */
const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { limit: 15, maxLimit: 100 });
  const filter = {};

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { SKU: rx }, { brand: rx }];
  }
  if (req.query.category && mongoose.Types.ObjectId.isValid(req.query.category)) filter.category = req.query.category;
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  if (req.query.stock === 'low') filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
  if (req.query.stock === 'out') filter.stock = { $lte: 0 };

  const sortMap = { newest: '-createdAt', oldest: 'createdAt', 'price-asc': 'price', 'price-desc': '-price', stock: 'stock', sold: '-sold', name: 'name' };
  const sort = sortMap[req.query.sort] || '-createdAt';

  const [products, total, summary] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit).populate('category', 'name slug').lean({ virtuals: true }),
    Product.countDocuments(filter),
    Product.aggregate([
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$stock' },
          inventoryValue: { $sum: { $multiply: ['$stock', '$price'] } },
          outOfStock: { $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] } },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: buildPaginationMeta({ page, limit, total }),
      summary: {
        totalStock: summary[0]?.totalStock || 0,
        inventoryValue: summary[0]?.inventoryValue || 0,
        outOfStock: summary[0]?.outOfStock || 0,
      },
    },
  });
});

/** GET /api/admin/products/:id */
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: { product } });
});

/** POST /api/admin/products */
const createProduct = asyncHandler(async (req, res) => {
  const payload = { ...req.body };

  const category = await Category.findById(payload.category);
  if (!category) throw ApiError.badRequest('The selected category does not exist');

  if (await Product.exists({ SKU: String(payload.SKU).toUpperCase() })) {
    throw ApiError.conflict('A product with that SKU already exists', {
      code: 'SKU_IN_USE',
      errors: [{ field: 'SKU', message: 'SKU must be unique' }],
    });
  }

  // Auto-generate placeholder artwork when no images are supplied
  if (!payload.images?.length) {
    const slug = slugify(payload.name, { lower: true, strict: true });
    payload.images = [0, 1, 2, 3].map((i) => `/api/media/products/${slug}.svg?i=${i}`);
  }

  const product = await Product.create(payload);
  await product.populate('category', 'name slug');

  res.status(201).json({ success: true, message: `"${product.name}" created`, data: { product } });
});

/** PUT /api/admin/products/:id */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');

  const payload = { ...req.body };
  const previousName = product.name;

  if (payload.category) {
    const category = await Category.findById(payload.category);
    if (!category) throw ApiError.badRequest('The selected category does not exist');
  }
  if (payload.SKU && String(payload.SKU).toUpperCase() !== product.SKU) {
    const skuTaken = await Product.exists({ SKU: String(payload.SKU).toUpperCase(), _id: { $ne: product._id } });
    if (skuTaken) throw ApiError.conflict('SKU is already used by another product');
  }

  // Guard against discountPrice >= price after a partial update
  const nextPrice = payload.price ?? product.price;
  const nextDiscount = payload.discountPrice ?? product.discountPrice;
  if (nextDiscount && Number(nextDiscount) >= Number(nextPrice)) {
    throw ApiError.badRequest('Discount price must be lower than the regular price', {
      errors: [{ field: 'discountPrice', message: 'Must be lower than the price' }],
    });
  }

  // Reset the slug when the name changes, and refresh placeholder artwork
  if (payload.name && payload.name !== previousName) {
    const oldSlug = product.slug;
    product.slug = slugify(payload.name, { lower: true, strict: true });
    if (!payload.images && product.images.every((img) => img.includes(`/api/media/products/${oldSlug}`))) {
      payload.images = [0, 1, 2, 3].map((i) => `/api/media/products/${product.slug}.svg?i=${i}`);
    }
  }

  Object.assign(product, payload);
  await product.save();
  await product.populate('category', 'name slug');

  res.json({ success: true, message: 'Product updated', data: { product } });
});

/** DELETE /api/admin/products/:id - soft delete when the product has orders */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');

  const orderCount = await Order.countDocuments({ 'items.product': product._id });
  if (orderCount > 0 && req.query.force !== 'true') {
    product.isActive = false;
    await product.save();
    return res.json({
      success: true,
      message: `"${product.name}" has ${orderCount} order(s), so it was archived (deactivated) instead of deleted.`,
      data: { archived: true, product },
    });
  }

  await Review.deleteMany({ product: product._id });
  await Order.updateMany({}, { $pull: { items: { product: product._id } } });
  await User.updateMany({ wishlist: product._id }, { $pull: { wishlist: product._id } });
  await product.deleteOne();

  await Order.deleteMany({ items: { $size: 0 } });

  return res.json({ success: true, message: `"${product.name}" deleted`, data: { archived: false } });
});

/** PATCH /api/admin/products/:id/stock - quick inventory adjustment */
const updateStock = asyncHandler(async (req, res) => {
  const { stock, variantStocks } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');

  if (stock !== undefined) {
    if (Number(stock) < 0) throw ApiError.badRequest('Stock cannot be negative');
    product.stock = Number(stock);
  }

  if (Array.isArray(variantStocks)) {
    variantStocks.forEach((entry) => {
      const variant = product.variants.id(entry.variantId);
      if (variant && Number(entry.stock) >= 0) variant.stock = Number(entry.stock);
    });
  }

  await product.save();
  res.json({ success: true, message: 'Inventory updated', data: { product } });
});

/** POST /api/admin/products/bulk - bulk price / stock / activation tools */
const bulkUpdateProducts = asyncHandler(async (req, res) => {
  const { ids = [], action, value } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw ApiError.badRequest('Select at least one product');

  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!validIds.length) throw ApiError.badRequest('No valid product ids supplied');

  const operations = {
    activate: { $set: { isActive: true } },
    deactivate: { $set: { isActive: false } },
    feature: { $set: { isFeatured: true } },
    unfeature: { $set: { isFeatured: false } },
    setStock: { $set: { stock: Math.max(0, Number(value) || 0) } },
    adjustStock: { $inc: { stock: Number(value) || 0 } },
    discount: { $set: { discountPrice: Number(value) || 0 } },
    clearDiscount: { $set: { discountPrice: 0 } },
  };

  const update = operations[action];
  if (!update) throw ApiError.badRequest('Unknown bulk action');

  const result = await Product.updateMany({ _id: { $in: validIds } }, update);
  res.json({ success: true, message: `${result.modifiedCount} product(s) updated`, data: { modified: result.modifiedCount } });
});

/** POST /api/admin/media/generate-artwork - regenerate placeholder images */
const generateArtwork = asyncHandler(async (req, res) => {
  const { count = 4 } = req.body;
  const product = req.body.productId ? await Product.findById(req.body.productId).populate('category', 'slug') : null;
  const slug = product?.slug || slugify(req.body.name || 'nexus-product', { lower: true, strict: true });

  const images = Array.from({ length: Math.min(8, Math.max(1, Number(count))) }, (_, i) => `/api/media/products/${slug}.svg?i=${i}`);
  const preview = generateProductSvg({
    seed: slug,
    label: product?.name || req.body.name || 'Nexus Product',
    sublabel: req.body.brand || 'Nexus',
    category: product?.category?.slug || 'default',
    width: 400,
    height: 400,
  });

  res.json({ success: true, data: { images, preview } });
});

/* ---------------------------------------------------------------- categories */

/** GET /api/admin/categories */
const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({}).sort('displayOrder name').lean();
  const counts = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 }, stock: { $sum: '$stock' } } }]);
  const map = new Map(counts.map((c) => [String(c._id), c]));

  res.json({
    success: true,
    data: {
      categories: categories.map((c) => ({
        ...c,
        productCount: map.get(String(c._id))?.count || 0,
        totalStock: map.get(String(c._id))?.stock || 0,
      })),
    },
  });
});

/** POST /api/admin/categories */
const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (await Category.exists({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') })) {
    throw ApiError.conflict('A category with that name already exists');
  }
  const slug = slugify(name, { lower: true, strict: true });
  const category = await Category.create({
    ...req.body,
    slug,
    image: req.body.image || `/api/media/categories/${slug}.svg`,
  });
  res.status(201).json({ success: true, message: 'Category created', data: { category } });
});

/** PUT /api/admin/categories/:id */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  Object.assign(category, req.body);
  await category.save();
  res.json({ success: true, message: 'Category updated', data: { category } });
});

/** DELETE /api/admin/categories/:id */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0 && req.query.force !== 'true') {
    throw ApiError.conflict(
      `${productCount} product(s) still use this category. Move them first or pass ?force=true to archive them too.`,
    );
  }
  if (productCount > 0) await Product.updateMany({ category: category._id }, { $set: { isActive: false } });
  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted', data: { archivedProducts: productCount } });
});

/* -------------------------------------------------------------------- orders */

/** GET /api/admin/orders */
const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { limit: 15, maxLimit: 100 });
  const filter = {};

  if (req.query.orderStatus) filter.orderStatus = req.query.orderStatus;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ orderNumber: rx }, { 'shippingAddress.fullName': rx }, { 'shippingAddress.phone': rx }, { transactionId: rx }];
  }
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(new Date(req.query.to).setHours(23, 59, 59, 999));
  }

  const [orders, total, statusCounts] = await Promise.all([
    Order.find(filter).sort('-createdAt').skip(skip).limit(limit).populate('user', 'name email').lean({ virtuals: true }),
    Order.countDocuments(filter),
    Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 }, revenue: { $sum: '$total' } } }]),
  ]);

  res.json({
    success: true,
    data: {
      orders: orders.map((o) => ({ ...o, itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0) })),
      pagination: buildPaginationMeta({ page, limit, total }),
      statusCounts: statusCounts.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {}),
    },
  });
});

/** GET /api/admin/orders/:id */
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone createdAt').populate('items.product', 'name slug images SKU');
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ success: true, data: { order: decorateOrder(order) } });
});

/** PATCH /api/admin/orders/:id/status */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, note = '' } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  await orderService.updateStatus(order, { orderStatus, note, changedBy: req.user._id });
  await order.populate('user', 'name email');

  res.json({ success: true, message: `Order marked as ${orderStatus}`, data: { order: decorateOrder(order) } });
});

/** PATCH /api/admin/orders/:id/payment-status */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus, note = '' } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  if (paymentStatus === 'refunded') {
    await paymentService.refundPayment(order, { changedBy: req.user._id });
    return res.json({ success: true, message: 'Refund processed', data: { order: decorateOrder(order) } });
  }

  order.paymentStatus = paymentStatus;
  if (paymentStatus === 'paid') order.paidAt = order.paidAt || new Date();
  order.statusHistory.push({ status: order.orderStatus, note: note || `Payment marked ${paymentStatus}`, changedBy: req.user._id });
  await order.save();
  await order.populate('user', 'name email');

  return res.json({ success: true, message: `Payment marked ${paymentStatus}`, data: { order: decorateOrder(order) } });
});

/** POST /api/admin/orders/:id/refund */
const refundOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.paymentStatus !== 'paid') throw ApiError.badRequest('Only paid orders can be refunded');

  await paymentService.refundPayment(order, { amount: req.body.amount, changedBy: req.user._id });
  res.json({ success: true, message: 'Refund processed successfully', data: { order: decorateOrder(order) } });
});

/** POST /api/admin/orders/:id/cancel */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  await orderService.cancelOrder(order, {
    reason: req.body.reason || 'Cancelled by administrator',
    changedBy: req.user._id,
    restoreStock: req.body.restoreStock !== false,
  });

  res.json({ success: true, message: 'Order cancelled', data: { order: decorateOrder(order) } });
});

/* --------------------------------------------------------------------- users */

/** GET /api/admin/users */
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { limit: 15, maxLimit: 100 });
  const filter = {};

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'disabled') filter.isActive = false;

  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(limit).select('-password').lean(),
    User.countDocuments(filter),
  ]);

  // Attach order aggregates so the table shows spend + volume
  const ids = users.map((u) => u._id);
  const stats = await Order.aggregate([
    { $match: { user: { $in: ids } } },
    { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } } } },
  ]);
  const statMap = new Map(stats.map((s) => [String(s._id), s]));

  res.json({
    success: true,
    data: {
      users: users.map((u) => ({
        ...u,
        orderCount: statMap.get(String(u._id))?.orders || 0,
        totalSpent: statMap.get(String(u._id))?.spent || 0,
      })),
      pagination: buildPaginationMeta({ page, limit, total }),
    },
  });
});

/** GET /api/admin/users/:id */
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password').populate('wishlist', 'name slug images price');
  if (!user) throw ApiError.notFound('User not found');

  const orders = await Order.find({ user: user._id }).sort('-createdAt').limit(20).lean({ virtuals: true });
  const totals = await Order.aggregate([
    { $match: { user: user._id, paymentStatus: 'paid' } },
    { $group: { _id: null, spent: { $sum: '$total' }, orders: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: {
      user,
      orders,
      stats: { totalSpent: totals[0]?.spent || 0, paidOrders: totals[0]?.orders || 0, orderCount: orders.length },
    },
  });
});

/** PATCH /api/admin/users/:id/role */
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot change your own role');
  }

  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw ApiError.notFound('User not found');

  if (role === 'user' && user.role === 'admin') {
    const admins = await User.countDocuments({ role: 'admin', isActive: true });
    if (admins <= 1) throw ApiError.badRequest('At least one administrator must remain active');
  }

  user.role = role;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // force re-auth with the new role
  await user.save();

  res.json({ success: true, message: `${user.name} is now ${role === 'admin' ? 'an administrator' : 'a customer'}`, data: { user } });
});

/** PATCH /api/admin/users/:id/status */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (String(req.params.id) === String(req.user._id)) throw ApiError.badRequest('You cannot disable your own account');

  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw ApiError.notFound('User not found');

  if (!isActive && user.role === 'admin') {
    const admins = await User.countDocuments({ role: 'admin', isActive: true });
    if (admins <= 1) throw ApiError.badRequest('At least one administrator must remain active');
  }

  user.isActive = isActive;
  if (!isActive) user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.json({ success: true, message: `${user.name} ${isActive ? 'enabled' : 'disabled'}`, data: { user } });
});

/* ------------------------------------------------------------------- reviews */

/** GET /api/admin/reviews */
const listReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { limit: 15, maxLimit: 100 });
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.rating) filter.rating = Number(req.query.rating);
  if (req.query.search) filter.comment = new RegExp(escapeRegex(req.query.search), 'i');

  const [reviews, total] = await Promise.all([
    Review.find(filter).sort('-createdAt').skip(skip).limit(limit).populate('user', 'name email').populate('product', 'name slug').lean(),
    Review.countDocuments(filter),
  ]);

  res.json({ success: true, data: { reviews, pagination: buildPaginationMeta({ page, limit, total }) } });
});

/** PATCH /api/admin/reviews/:id */
const moderateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');

  if (req.body.status) review.status = req.body.status;
  await review.save();
  await recalculateProductRating(review.product);

  res.json({ success: true, message: 'Review updated', data: { review } });
});

/** DELETE /api/admin/reviews/:id */
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  const { product } = review;
  await review.deleteOne();
  await recalculateProductRating(product);
  res.json({ success: true, message: 'Review deleted' });
});

/* ------------------------------------------------------------------- coupons */

/** GET /api/admin/coupons */
const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({}).sort('-createdAt').lean();
  res.json({ success: true, data: { coupons } });
});

/** POST /api/admin/coupons */
const createCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').toUpperCase();
  if (await Coupon.exists({ code })) throw ApiError.conflict('That coupon code already exists');
  const coupon = await Coupon.create({ ...req.body, code });
  res.status(201).json({ success: true, message: 'Coupon created', data: { coupon } });
});

/** PUT /api/admin/coupons/:id */
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  Object.assign(coupon, req.body);
  await coupon.save();
  res.json({ success: true, message: 'Coupon updated', data: { coupon } });
});

/** DELETE /api/admin/coupons/:id */
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  res.json({ success: true, message: 'Coupon deleted' });
});

/* ----------------------------------------------------------------- inventory */

/** GET /api/admin/inventory */
const getInventory = asyncHandler(async (req, res) => {
  const data = await statsService.getInventoryInsights();
  res.json({ success: true, data });
});

/** PATCH /api/admin/inventory/:productId */
const updateInventory = asyncHandler(async (req, res) => {
  const { stock, lowStockThreshold, variants } = req.body;
  const product = await Product.findById(req.params.productId);
  if (!product) throw ApiError.notFound('Product not found');

  if (stock !== undefined) {
    const value = Number(stock);
    if (Number.isNaN(value) || value < 0) throw ApiError.badRequest('Stock must be zero or greater');
    product.stock = value;
  }
  if (lowStockThreshold !== undefined) product.lowStockThreshold = Math.max(0, Number(lowStockThreshold));
  if (Array.isArray(variants)) {
    variants.forEach((entry) => {
      const variant = product.variants.id(entry.variantId);
      if (variant && Number(entry.stock) >= 0) variant.stock = Number(entry.stock);
    });
  }

  await product.save();
  res.json({ success: true, message: 'Inventory saved', data: { product } });
});

/** GET /api/admin/export/orders.csv - simple CSV export for finance */
const exportOrdersCsv = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).sort('-createdAt').limit(5000).populate('user', 'email name').lean();
  const header = 'orderNumber,date,customer,email,items,subtotal,discount,shipping,tax,total,paymentStatus,orderStatus';

  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = orders.map((o) =>
    [
      o.orderNumber,
      new Date(o.createdAt).toISOString(),
      o.shippingAddress?.fullName || o.user?.name || '',
      o.user?.email || '',
      o.items.reduce((sum, i) => sum + i.quantity, 0),
      o.subtotal,
      o.discount,
      o.shipping,
      o.tax,
      o.total,
      o.paymentStatus,
      o.orderStatus,
    ].map(escape).join(','),
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="nexus-orders-${Date.now()}.csv"`);
  res.send([header, ...rows].join('\n'));
});

module.exports = {
  getDashboard,
  getSalesStats,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  bulkUpdateProducts,
  generateArtwork,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listOrders,
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
  refundOrder,
  cancelOrder,
  listUsers,
  getUser,
  updateUserRole,
  updateUserStatus,
  listReviews,
  moderateReview,
  deleteReview,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getInventory,
  updateInventory,
  exportOrdersCsv,
};
