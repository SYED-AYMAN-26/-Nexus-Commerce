const Product = require('../models/Product');
const Category = require('../models/Category');
const { parsePagination, parseSort, buildPaginationMeta, escapeRegex } = require('../utils/query');
const { effectivePrice, round2 } = require('../utils/pricing');

/**
 * Turns a validated query string into a Mongoose query for the catalogue.
 * Shared by /api/products, /api/products/search and the category listing.
 */
const SORT_MAP = {
  newest: '-createdAt',
  oldest: 'createdAt',
  'price-asc': 'priceAsc', // handled via aggregation-free sort on finalPrice
  'price-desc': 'priceDesc',
  popular: '-sold',
  rating: '-rating',
  'name-asc': 'name',
  'name-desc': '-name',
};

async function listProducts(query = {}) {
  const { page, limit, skip } = parsePagination(query, { limit: 12, maxLimit: 60 });
  const filter = { isActive: true };

  if (query.category) {
    const category = await Category.findOne({ slug: String(query.category).toLowerCase() }).select('_id');
    if (!category) {
      return { products: [], pagination: buildPaginationMeta({ page, limit, total: 0 }), appliedFilters: {} };
    }
    filter.category = category._id;
  }

  if (query.brand) {
    const brands = String(query.brand).split(',').map((b) => b.trim()).filter(Boolean);
    if (brands.length) filter.brand = { $in: brands.map((b) => new RegExp(`^${escapeRegex(b)}$`, 'i')) };
  }

  if (query.search) {
    const term = escapeRegex(String(query.search).trim());
    const rx = new RegExp(term, 'i');
    filter.$or = [
      { name: rx },
      { description: rx },
      { brand: rx },
      { tags: rx },
      { SKU: rx },
    ];
  }

  if (query.featured === 'true') filter.isFeatured = true;
  if (query.newArrival === 'true') filter.isNewArrival = true;

  if (query.inStock === 'true') {
    filter.$and = [{ isActive: true }, { $or: [{ stock: { $gt: 0 } }, { 'variants.stock': { $gt: 0 } }] }];
  }

  const minPrice = query.minPrice !== undefined ? Number(query.minPrice) : undefined;
  const maxPrice = query.maxPrice !== undefined ? Number(query.maxPrice) : undefined;
  if (minPrice !== undefined || maxPrice !== undefined) {
    // Filter on the effective (discounted) price using $expr
    const priceExpr = {
      $cond: [
        {
          $and: [
            { $gt: ['$discountPrice', 0] },
            { $lt: ['$discountPrice', '$price'] },
          ],
        },
        '$discountPrice',
        '$price',
      ],
    };
    const conditions = [];
    if (minPrice !== undefined && !Number.isNaN(minPrice)) conditions.push({ $gte: [priceExpr, minPrice] });
    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) conditions.push({ $lte: [priceExpr, maxPrice] });
    filter.$expr = conditions.length === 1 ? conditions[0] : { $and: conditions };
  }

  if (query.rating) {
    const minRating = Number(query.rating);
    if (!Number.isNaN(minRating) && minRating > 0) filter.rating = { $gte: minRating };
  }
  if (query.tags) {
    const tags = String(query.tags).split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length) filter.tags = { $in: tags };
  }

  const sortKey = parseSort(query.sort, SORT_MAP, '-createdAt');
  let sort;
  if (sortKey === 'priceAsc' || sortKey === 'priceDesc') {
    // Sort by the discounted price so "Price: low to high" matches the UI
    const dir = sortKey === 'priceAsc' ? 1 : -1;
    sort = { __effectivePrice: dir, _id: 1 };
  } else {
    sort = sortKey;
  }

  const usePriceSort = sortKey === 'priceAsc' || sortKey === 'priceDesc';

  let products;
  let total;

  if (usePriceSort) {
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          __effectivePrice: {
            $cond: [
              { $and: [{ $gt: ['$discountPrice', 0] }, { $lt: ['$discountPrice', '$price'] }] },
              '$discountPrice',
              '$price',
            ],
          },
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
    ];
    [products, total] = await Promise.all([
      Product.aggregate(pipeline),
      Product.countDocuments(filter),
    ]);
    products = await Product.populate(products, { path: 'category', select: 'name slug' });
  } else {
    [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit).populate('category', 'name slug').lean({ virtuals: true }),
      Product.countDocuments(filter),
    ]);
  }

  return {
    products,
    pagination: buildPaginationMeta({ page, limit, total }),
    appliedFilters: {
      category: query.category || null,
      brand: query.brand || null,
      search: query.search || null,
      minPrice: minPrice ?? null,
      maxPrice: maxPrice ?? null,
      rating: query.rating ? Number(query.rating) : null,
      inStock: query.inStock === 'true',
      sort: query.sort || 'newest',
    },
  };
}

/** Type-ahead suggestions for the header search box. */
async function suggest(term, limit = 6) {
  if (!term || String(term).trim().length < 2) return { suggestions: [], products: [], categories: [] };
  const rx = new RegExp(escapeRegex(String(term).trim()), 'i');

  const [products, categories] = await Promise.all([
    Product.find({ isActive: true, $or: [{ name: rx }, { brand: rx }, { tags: rx }] })
      .select('name slug images price discountPrice brand rating')
      .limit(limit)
      .lean(),
    Category.find({ isActive: true, name: rx }).select('name slug').limit(4).lean(),
  ]);

  const suggestions = [
    ...categories.map((c) => ({ type: 'category', label: c.name, value: c.slug, href: `/category/${c.slug}` })),
    ...products.map((p) => ({ type: 'product', label: p.name, value: p.slug, href: `/product/${p.slug}` })),
    ...[...new Set(products.map((p) => p.brand))].slice(0, 4).map((b) => ({
      type: 'brand', label: b, value: b, href: `/products?brand=${encodeURIComponent(b)}`,
    })),
  ];

  return {
    suggestions,
    products: products.map((p) => ({
      ...p,
      finalPrice: effectivePrice(p),
      discountPercentage: p.price > 0 ? Math.round(((p.price - effectivePrice(p)) / p.price) * 100) : 0,
    })),
    categories,
  };
}

/** Home page rails + facet metadata, all in one round trip. */
async function getFacets() {
  const [brands, priceRange, categories] = await Promise.all([
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 24 },
    ]),
    Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          min: {
            $min: {
              $cond: [
                { $and: [{ $gt: ['$discountPrice', 0] }, { $lt: ['$discountPrice', '$price'] }] },
                '$discountPrice',
                '$price',
              ],
            },
          },
          max: {
            $max: {
              $cond: [
                { $and: [{ $gt: ['$discountPrice', 0] }, { $lt: ['$discountPrice', '$price'] }] },
                '$discountPrice',
                '$price',
              ],
            },
          },
        },
      },
    ]),
    Category.find({ isActive: true }).select('name slug icon image').sort('displayOrder name').lean(),
  ]);

  return {
    brands: brands.map((b) => ({ name: b._id, count: b.count })),
    priceRange: {
      min: round2(priceRange[0]?.min ?? 0),
      max: round2(priceRange[0]?.max ?? 0),
    },
    categories,
  };
}

module.exports = { listProducts, suggest, getFacets, SORT_MAP };
