const mongoose = require('mongoose');
const slugify = require('slugify');
const config = require('../config');
const { effectivePrice, discountPercentage } = require('../utils/pricing');

/**
 * A variant is one orderable combination (e.g. colour "Midnight" / size "M").
 * Products without variants simply have an empty `variants` array.
 */
const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // "Midnight Black / M"
    sku: { type: String, trim: true, uppercase: true },
    color: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    priceDelta: { type: Number, default: 0 },
    stock: { type: Number, default: 0, min: 0 },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required'], trim: true, maxlength: 140, index: 'text' },
    slug: { type: String, unique: true, index: true, lowercase: true },
    description: { type: String, required: [true, 'Description is required'], maxlength: 6000, index: 'text' },
    shortDescription: { type: String, default: '', maxlength: 260 },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
    discountPrice: {
      type: Number,
      default: 0,
      min: [0, 'Discount price cannot be negative'],
      validate: {
        validator(value) {
          return !value || value < this.price;
        },
        message: 'Discount price must be lower than the regular price',
      },
    },
    currency: { type: String, default: config.business.currency },
    images: {
      type: [String],
      default: [],
      validate: { validator: (v) => v.length <= 8, message: 'A product can have at most 8 images' },
    },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'Category is required'], index: true },
    brand: { type: String, required: [true, 'Brand is required'], trim: true, maxlength: 60, index: true },
    SKU: { type: String, required: [true, 'SKU is required'], unique: true, uppercase: true, trim: true },
    stock: { type: Number, required: true, default: 0, min: [0, 'Stock cannot be negative'], index: true },
    lowStockThreshold: { type: Number, default: config.business.lowStockThreshold },
    variants: { type: [variantSchema], default: [] },
    specifications: { type: [{ key: String, value: String }], default: [] },
    tags: { type: [String], default: [], index: true },
    badges: { type: [String], default: [] },

    // Ratings are denormalised for fast sorting; Review hooks keep them in sync.
    rating: { type: Number, default: 0, min: 0, max: 5, index: true },
    numReviews: { type: Number, default: 0, min: 0 },
    ratingBreakdown: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 },
    },

    sold: { type: Number, default: 0, min: 0, index: true }, // drives "Popular" sorting
    views: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isNewArrival: { type: Boolean, default: false },
    freeShipping: { type: Boolean, default: false },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { delete ret.__v; return ret; } },
    toObject: { virtuals: true },
  },
);

productSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' }, {
  weights: { name: 6, brand: 3, tags: 2, description: 1 },
  name: 'product_text_search',
});
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1, isActive: 1 });

productSchema.virtual('finalPrice').get(function finalPrice() {
  return effectivePrice(this);
});

productSchema.virtual('discountPercentage').get(function getDiscount() {
  return discountPercentage(this);
});

productSchema.virtual('inStock').get(function inStock() {
  if (this.variants?.length) return this.variants.some((v) => v.isActive !== false && v.stock > 0);
  return this.stock > 0;
});

/** 'in_stock' | 'low_stock' | 'out_of_stock' - used by badges and the admin table. */
productSchema.virtual('stockStatus').get(function stockStatus() {
  const stock = this.variants?.length
    ? this.variants.reduce((sum, v) => sum + (v.isActive === false ? 0 : v.stock), 0)
    : this.stock;
  if (stock <= 0) return 'out_of_stock';
  if (stock <= (this.lowStockThreshold || config.business.lowStockThreshold)) return 'low_stock';
  return 'in_stock';
});

productSchema.pre('validate', function generateSlug(next) {
  if (this.name && (this.isModified('name') || !this.slug)) {
    const base = slugify(this.name, { lower: true, strict: true });
    this.slug = this.isNew ? base : `${base}`;
  }
  next();
});

/** Guarantees a unique slug even when two products share a name. */
productSchema.pre('save', async function ensureUniqueSlug(next) {
  if (!this.isModified('name') && this.slug) return next();
  const Model = this.constructor;
  const base = this.slug;
  let candidate = base;
  let suffix = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Model.exists({ slug: candidate, _id: { $ne: this._id } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  this.slug = candidate;
  return next();
});

/** Total available units across variants (or the flat stock). */
productSchema.methods.availableStock = function availableStock(variantName) {
  if (variantName && this.variants?.length) {
    const variant = this.variants.find((v) => v.name === variantName || String(v._id) === String(variantName));
    return variant && variant.isActive !== false ? variant.stock : 0;
  }
  if (this.variants?.length) {
    return this.variants.reduce((sum, v) => sum + (v.isActive === false ? 0 : v.stock), 0);
  }
  return this.stock;
};

/** Resolve the price for a specific variant (base price + delta). */
productSchema.methods.priceFor = function priceFor(variantName) {
  const base = effectivePrice(this);
  if (!variantName || !this.variants?.length) return base;
  const variant = this.variants.find((v) => v.name === variantName || String(v._id) === String(variantName));
  return Math.max(0, Number((base + (variant?.priceDelta || 0)).toFixed(2)));
};

module.exports = mongoose.model('Product', productSchema);
