const asyncHandler = require('../utils/asyncHandler');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { generateProductSvg, generateBannerSvg } = require('../utils/media');

/**
 * Generated artwork endpoints.
 *
 * The seed data points `images` at these URLs so the store renders instantly
 * with zero binary assets and works offline. Admins can replace any image with
 * a real CDN URL from the product form.
 * Add `?format=json` to inspect the source of a graphic.
 */

/** GET /api/media/products/:slug.svg */
const productImage = asyncHandler(async (req, res) => {
  // Accept both "/products/thing.svg" and "/products/thing".
  const slug = String(req.params.slug).replace(/\.svg$/i, '');
  const index = Number(req.query.i || 0);

  const product = await Product.findOne({ slug }).select('name brand category images').populate('category', 'name slug').lean();
  const seed = `${slug}-${index}`;

  if (req.query.format === 'json') {
    return res.json({ success: true, data: { slug, index, product: product || null } });
  }

  const svg = generateProductSvg({
    seed,
    label: product?.name || slug.replace(/-/g, ' '),
    sublabel: product ? `${product.brand} · ${product.category?.name || 'Nexus'}` : 'Nexus Commerce',
    category: product?.category?.slug || 'default',
    width: 900,
    height: 900,
  });

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  return res.send(svg);
});

/** GET /api/media/banners/:seed.svg */
const bannerImage = asyncHandler(async (req, res) => {
  const svg = generateBannerSvg({
    seed: req.params.seed,
    label: req.query.label || 'Nexus Commerce',
    width: Number(req.query.w) || 1200,
    height: Number(req.query.h) || 600,
  });
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.send(svg);
});

/** GET /api/media/categories/:slug.svg */
const categoryImage = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug).replace(/\.svg$/i, '');
  const category = await Category.findOne({ slug }).select('name slug').lean();
  const svg = generateProductSvg({
    seed: `cat-${slug}`,
    label: category?.name || slug,
    sublabel: 'Shop the collection',
    category: req.params.slug,
    width: 800,
    height: 800,
  });
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.send(svg);
});

module.exports = { productImage, bannerImage, categoryImage };
