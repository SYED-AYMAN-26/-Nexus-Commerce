const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const Category = require('../models/Category');
const config = require('../config');
const { round2 } = require('../utils/pricing');

/**
 * Dashboard aggregations. Everything is computed in MongoDB - no data is
 * hard coded - and every chart is derived from the real Order collection.
 */

const REVENUE_MATCH = { paymentStatus: { $in: ['paid', 'refunded'] }, orderStatus: { $ne: 'cancelled' } };

function rangeStart(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (days - 1));
  return date;
}

async function getOverview() {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const startOf30 = rangeStart(30);
  const startOfPrev30 = rangeStart(60);

  const [
    totalUsers,
    newUsersThisMonth,
    totalProducts,
    totalCategories,
    totalReviews,
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    revenueAgg,
    monthRevenueAgg,
    last30Revenue,
    prev30Revenue,
    statusBreakdown,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'user', createdAt: { $gte: startOfMonth } }),
    Product.countDocuments({ isActive: true }),
    Category.countDocuments({ isActive: true }),
    Review.countDocuments({ status: 'published' }),
    Order.countDocuments({}),
    Order.countDocuments({ orderStatus: { $in: ['pending', 'confirmed', 'processing'] } }),
    Order.countDocuments({ orderStatus: 'delivered' }),
    Order.countDocuments({ orderStatus: 'cancelled' }),
    Order.aggregate([{ $match: REVENUE_MATCH }, { $group: { _id: null, total: { $sum: '$total' }, avg: { $avg: '$total' } } }]),
    Order.aggregate([
      { $match: { ...REVENUE_MATCH, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.aggregate([{ $match: { ...REVENUE_MATCH, createdAt: { $gte: startOf30 } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.aggregate([
      { $match: { ...REVENUE_MATCH, createdAt: { $gte: startOfPrev30, $lt: startOf30 } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
  ]);

  const revenue = round2(revenueAgg[0]?.total || 0);
  const last30 = round2(last30Revenue[0]?.total || 0);
  const prev30 = round2(prev30Revenue[0]?.total || 0);
  const growth = prev30 === 0 ? (last30 > 0 ? 100 : 0) : round2(((last30 - prev30) / prev30) * 100);

  return {
    totalUsers,
    newUsersThisMonth,
    totalProducts,
    totalCategories,
    totalReviews,
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue: revenue,
    averageOrderValue: round2(revenueAgg[0]?.avg || 0),
    revenueThisMonth: round2(monthRevenueAgg[0]?.total || 0),
    revenueLast30Days: last30,
    revenueGrowthPct: growth,
    currency: config.business.currency,
    ordersByStatus: statusBreakdown.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {}),
  };
}

/** Daily sales/orders series for the dashboard line + bar charts. */
async function getSalesTimeseries(days = 30) {
  const start = rangeStart(days);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        gross: { $sum: '$total' },
        revenue: { $sum: { $cond: [{ $in: ['$paymentStatus', ['paid', 'refunded']] }, '$total', 0] } },
        orders: { $sum: 1 },
        units: { $sum: { $sum: '$items.quantity' } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map(rows.map((r) => [r._id, r]));
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const row = map.get(key);
    series.push({
      date: key,
      label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      revenue: round2(row?.revenue || 0),
      gross: round2(row?.gross || 0),
      orders: row?.orders || 0,
      units: row?.units || 0,
    });
  }
  return series;
}

async function getTopProducts(limit = 8) {
  const [byRevenue, byUnits] = await Promise.all([
    Product.find({ isActive: true })
      .sort('-sold')
      .limit(limit)
      .select('name slug images price discountPrice sold stock rating numReviews brand')
      .populate('category', 'name slug')
      .lean(),
    Order.aggregate([
      { $match: REVENUE_MATCH },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          units: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { units: -1 } },
      { $limit: limit },
    ]),
  ]);

  return {
    bestSellers: byUnits.map((row) => ({ ...row, revenue: round2(row.revenue) })),
    mostViewed: byRevenue.map((p) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      image: p.images?.[0],
      sold: p.sold,
      stock: p.stock,
      rating: p.rating,
      price: p.price,
      discountPrice: p.discountPrice,
      category: p.category?.name,
    })),
  };
}

/** Revenue + order count grouped by category (doughnut chart). */
async function getCategoryPerformance() {
  const rows = await Order.aggregate([
    { $match: REVENUE_MATCH },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$product.category',
        revenue: { $sum: '$items.lineTotal' },
        units: { $sum: '$items.quantity' },
        orders: { $sum: 1 },
      },
    },
    {
      $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    { $sort: { revenue: -1 } },
  ]);

  return rows.map((row) => ({
    categoryId: row._id,
    name: row.category?.name || 'Uncategorised',
    slug: row.category?.slug || 'uncategorised',
    revenue: round2(row.revenue),
    units: row.units,
    orders: row.orders,
  }));
}

/** Inventory health table + alerts. */
async function getInventoryInsights() {
  const threshold = config.business.lowStockThreshold;
  const [lowStock, outOfStock, totals] = await Promise.all([
    Product.find({ isActive: true, stock: { $gt: 0, $lte: threshold } })
      .select('name slug images stock price SKU brand category')
      .populate('category', 'name')
      .sort('stock')
      .limit(20)
      .lean(),
    Product.find({ isActive: true, stock: { $lte: 0 } })
      .select('name slug images stock price SKU brand category')
      .populate('category', 'name')
      .sort('-updatedAt')
      .limit(20)
      .lean(),
    Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: '$stock' },
          inventoryValue: { $sum: { $multiply: ['$stock', '$price'] } },
          products: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    lowStock,
    outOfStock,
    inventoryValue: round2(totals[0]?.inventoryValue || 0),
    totalUnits: totals[0]?.totalUnits || 0,
    productCount: totals[0]?.products || 0,
    threshold,
  };
}

/** Recent orders + newest customers for the dashboard activity feed. */
async function getRecentActivity(limit = 6) {
  const [recentOrders, recentUsers, recentReviews] = await Promise.all([
    Order.find({}).sort('-createdAt').limit(limit).populate('user', 'name email').lean(),
    User.find({ role: 'user' }).sort('-createdAt').limit(limit).select('name email createdAt').lean(),
    Review.find({ status: 'published' }).sort('-createdAt').limit(limit).populate('user', 'name').populate('product', 'name slug').lean(),
  ]);
  return { recentOrders, recentUsers, recentReviews };
}

async function getDashboard(days = 30) {
  const [overview, sales, topProducts, categoryPerformance, inventory, activity] = await Promise.all([
    getOverview(),
    getSalesTimeseries(days),
    getTopProducts(),
    getCategoryPerformance(),
    getInventoryInsights(),
    getRecentActivity(),
  ]);

  return { overview, sales, ...topProducts, categoryPerformance, inventory, ...activity, generatedAt: new Date().toISOString() };
}

module.exports = { getOverview, getSalesTimeseries, getTopProducts, getCategoryPerformance, getInventoryInsights, getRecentActivity, getDashboard, REVENUE_MATCH };
