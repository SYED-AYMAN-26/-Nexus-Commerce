const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const productService = require('../services/productService');
const { effectivePrice } = require('../utils/pricing');

/**
 * GET /api/products
 * Search + filter + sort + paginate. All query params are validated by
 * middleware before they reach here.
 */
const listProducts = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);

  // Attach the wishlist flag when the caller is signed in
  let wishlist = new Set();
  if (req.user) wishlist = new Set(req.user.wishlist.map(String));
  const products = result.products.map((p) => ({
    ...p,
    finalPrice: effectivePrice(p),
    isWishlisted: wishlist.has(String(p._id)),
  }));

  res.json({
    success: true,
    data: { products, pagination: result.pagination, appliedFilters: result.appliedFilters },
  });
});

/** GET /api/products/facets - brands, price range, categories for the sidebar */
const getFacets = asyncHandler(async (req, res) => {
  const facets = await productService.getFacets();
  res.json({ success: true, data: facets });
});

/** GET /api/products/search?q= */
const searchProducts = asyncHandler(async (req, res) => {
  const term = req.query.q || req.query.search || '';
  const result = await productService.listProducts({ ...req.query, search: term });
  const suggestions = await productService.suggest(term);

  res.json({
    success: true,
    data: {
      query: term,
      products: result.products.map((p) => ({ ...p, finalPrice: effectivePrice(p) })),
      pagination: result.pagination,
      suggestions: suggestions.suggestions,
      total: result.pagination.total,
    },
  });
});

/** GET /api/products/suggest?q= - lightweight type-ahead */
const suggestProducts = asyncHandler(async (req, res) => {
  const data = await productService.suggest(req.query.q || '', Number(req.query.limit) || 6);
  res.json({ success: true, data });
});

/** GET /api/products/:idOrSlug */
const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);

  const product = await Product.findOne(isObjectId ? { _id: idOrSlug } : { slug: idOrSlug })
    .populate('category', 'name slug')
    .populate('variants.image');

  if (!product || (!product.isActive && req.user?.role !== 'admin')) {
    throw ApiError.notFound('We could not find that product');
  }

  // Fire-and-forget view counter (does not block the response)
  Product.updateOne({ _id: product._id }, { $inc: { views: 1 } }).catch(() => {});

  const [related, recommended, reviews] = await Promise.all([
    Product.find({ category: product.category?._id, _id: { $ne: product._id }, isActive: true })
      .sort('-sold')
      .limit(8)
      .select('name slug images price discountPrice rating numReviews stock brand')
      .lean(),
    Product.find({ _id: { $ne: product._id }, isActive: true, brand: product.brand })
      .sort('-rating')
      .limit(8)
      .select('name slug images price discountPrice rating numReviews stock brand')
      .lean(),
    Review.find({ product: product._id, status: 'published' })
      .sort('-createdAt')
      .limit(20)
      .populate('user', 'name avatar')
      .lean(),
  ]);

  const userId = req.user?._id;
  const userReview = userId ? await Review.findOne({ product: product._id, user: userId }).lean() : null;

  // Verified purchase check drives the "Write a review" button
  let canReview = Boolean(userId);
  if (userId) {
    const purchased = await Order.exists({
      user: userId,
      'items.product': product._id,
      orderStatus: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
    });
    canReview = Boolean(purchased);
  }

  res.json({
    success: true,
    data: {
      product: {
        ...product.toObject({ virtuals: true }),
        finalPrice: effectivePrice(product),
        isWishlisted: req.user ? req.user.isWishlisted(product._id) : false,
      },
      related: related.map((p) => ({ ...p, finalPrice: effectivePrice(p) })),
      recommended: recommended.map((p) => ({ ...p, finalPrice: effectivePrice(p) })),
      reviews,
      ratingBreakdown: product.ratingBreakdown,
      reviewSummary: {
        average: product.rating,
        total: product.numReviews,
        breakdown: product.ratingBreakdown,
      },
      userReview,
      canReview,
    },
  });
});

/* ------------------------------------------------------------------- reviews */

/** POST /api/products/:productId/reviews */
const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, comment, title } = req.body;

  const product = await Product.findOne({ _id: productId, isActive: true }).select('name');
  if (!product) throw ApiError.notFound('Product not found');

  // Verified purchase requirement: only buyers can review
  const order = await Order.findOne({
    user: req.user._id,
    'items.product': productId,
    orderStatus: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
  }).select('_id');

  if (!order) {
    throw ApiError.forbidden('You can only review products you have purchased');
  }

  const existing = await Review.findOne({ user: req.user._id, product: productId });
  if (existing) throw ApiError.conflict('You have already reviewed this product');

  const review = await Review.create({
    user: req.user._id,
    product: productId,
    order: order._id,
    rating,
    title: title || '',
    comment,
    isVerifiedPurchase: true,
  });

  // Mark the matching order line so the UI can hide the review CTA
  await Order.updateOne({ _id: order._id, 'items.product': productId }, { $set: { 'items.$.reviewed': true } });

  const populated = await review.populate('user', 'name avatar');
  res.status(201).json({ success: true, message: 'Thanks! Your review has been published.', data: { review: populated } });
});

/** GET /api/products/:productId/reviews */
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 10);
  const filter = { product: productId, status: 'published' };
  if (req.query.rating) filter.rating = Number(req.query.rating);

  const [reviews, total, product] = await Promise.all([
    Review.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit).populate('user', 'name avatar').lean(),
    Review.countDocuments(filter),
    Product.findById(productId).select('rating numReviews ratingBreakdown name').lean(),
  ]);

  res.json({
    success: true,
    data: {
      reviews,
      summary: product ? { average: product.rating, total: product.numReviews, breakdown: product.ratingBreakdown } : null,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    },
  });
});

/** DELETE /api/products/:productId/reviews/:reviewId (author or admin) */
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) throw ApiError.notFound('Review not found');
  if (String(review.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only delete your own reviews');
  }
  await review.deleteOne();
  res.json({ success: true, message: 'Review deleted' });
});

/* ----------------------------------------------------------------- categories */

/** GET /api/categories */
const listCategories = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  const categories = await Category.find(filter).sort('displayOrder name').lean();

  // Attach product counts so the nav/mega-menu can show "Electronics (24)"
  const counts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  res.json({
    success: true,
    data: {
      categories: categories.map((c) => ({ ...c, productCount: countMap.get(String(c._id)) || 0 })),
    },
  });
});

/** GET /api/categories/:slug */
const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!category) throw ApiError.notFound('Category not found');
  const productCount = await Product.countDocuments({ category: category._id, isActive: true });
  res.json({ success: true, data: { category: { ...category, productCount } } });
});

/* -------------------------------------------------------------- home content */

/** GET /api/products/home - single call that powers the storefront homepage */
const getHomeContent = asyncHandler(async (req, res) => {
  const select = 'name slug images price discountPrice rating numReviews stock brand badges isNewArrival createdAt sold shortDescription';

  const [featured, newArrivals, bestSellers, discounted, categories] = await Promise.all([
    Product.find({ isActive: true, isFeatured: true }).sort('-rating').limit(8).select(select).lean(),
    Product.find({ isActive: true }).sort('-createdAt').limit(8).select(select).lean(),
    Product.find({ isActive: true }).sort('-sold').limit(8).select(select).lean(),
    Product.find({ isActive: true, discountPrice: { $gt: 0 } }).sort('-discountPrice').limit(8).select(select).lean(),
    Category.find({ isActive: true }).sort('displayOrder').limit(8).lean(),
  ]);

  const decorate = (list) => list.map((p) => ({ ...p, finalPrice: effectivePrice(p) }));

  const counts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  res.json({
    success: true,
    data: {
      featured: decorate(featured),
      newArrivals: decorate(newArrivals),
      bestSellers: decorate(bestSellers),
      deals: decorate(discounted),
      categories: categories.map((c) => ({ ...c, productCount: countMap.get(String(c._id)) || 0 })),
    },
  });
});

module.exports = {
  listProducts,
  getFacets,
  searchProducts,
  suggestProducts,
  getProduct,
  createReview,
  getProductReviews,
  deleteReview,
  listCategories,
  getCategory,
  getHomeContent,
};
