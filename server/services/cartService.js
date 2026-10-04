const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const { calculateTotals, effectivePrice, round2 } = require('../utils/pricing');

/** Loads (or lazily creates) the signed-in user's cart document. */
async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

/**
 * Hydrates raw cart lines with live product data and recomputes every number
 * server side. Any line whose product was deleted becomes `unavailable` and is
 * excluded from totals so the UI can offer to remove it.
 */
async function buildCartPayload(cart, options = {}) {
  const productIds = cart.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } })
    .select('name slug images price discountPrice stock variants brand isActive category sku')
    .populate('category', 'name slug')
    .lean();

  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const available = [];
  const unavailable = [];

  cart.items.forEach((item) => {
    const product = productMap.get(String(item.product));
    const variant = product?.variants?.find((v) => String(v._id) === String(item.variantId || ''));

    if (!product || product.isActive === false) {
      unavailable.push({
        _id: item._id,
        productId: item.product,
        name: product?.name || 'Unavailable product',
        reason: 'This product is no longer available',
        quantity: item.quantity,
      });
      return;
    }

    const maxStock = variant ? variant.stock : product.stock;
    const unitPrice = round2(effectivePrice(product) + (variant?.priceDelta || 0));
    const quantity = Math.min(item.quantity, Math.max(0, maxStock));

    const line = {
      _id: item._id,
      productId: product._id,
      name: product.name,
      slug: product.slug,
      image: variant?.image || product.images?.[0] || '',
      brand: product.brand,
      category: product.category?.name || '',
      sku: variant?.sku || product.sku || product.SKU,
      variantId: variant?._id || null,
      variantName: variant?.name || '',
      quantity,
      requestedQuantity: item.quantity,
      unitPrice,
      compareAtPrice: round2(product.price) > unitPrice ? round2(product.price) : null,
      maxStock,
      inStock: maxStock > 0,
      lineTotal: round2(unitPrice * quantity),
    };

    if (maxStock <= 0) {
      unavailable.push({ ...line, reason: 'Out of stock' });
      return;
    }
    // Surface the automatic quantity clamp to the user
    if (quantity < item.quantity) line.note = `Quantity reduced to ${quantity} (only ${maxStock} left)`;
    available.push(line);
  });

  let couponDiscount = 0;
  let couponError = null;
  let coupon = null;

  const totals = calculateTotals(
    available.map((l) => ({ unitPrice: l.unitPrice, compareAtPrice: l.compareAtPrice, quantity: l.quantity })),
    { couponDiscount: 0, currency: options.currency },
  );

  if (cart.couponCode) {
    try {
      coupon = await Coupon.findOne({ code: cart.couponCode, isActive: true });
      if (!coupon) throw new Error('This coupon code is not valid');
      couponDiscount = coupon.computeDiscount(totals.subtotal);
    } catch (error) {
      couponError = error.message;
      coupon = null;
    }
  }

  const finalTotals = calculateTotals(
    available.map((l) => ({ unitPrice: l.unitPrice, compareAtPrice: l.compareAtPrice, quantity: l.quantity })),
    { couponDiscount, currency: options.currency },
  );
  finalTotals.itemCount = available.reduce((sum, l) => sum + l.quantity, 0);

  return {
    _id: cart._id,
    user: cart.user,
    items: available,
    unavailableItems: unavailable,
    itemCount: finalTotals.itemCount,
    uniqueItemCount: available.length,
    coupon: couponError ? { code: cart.couponCode, valid: false, error: couponError } : coupon ? { code: coupon.code, description: coupon.description, valid: true, discount: couponDiscount } : null,
    totals: finalTotals,
    updatedAt: cart.updatedAt,
  };
}

/** Add a product (optionally a specific variant) to the cart. */
async function addItem(userId, { productId, quantity = 1, variantId = null }) {
  const product = await Product.findById(productId);
  if (!product || product.isActive === false) throw ApiError.notFound('Product not found');

  let variant = null;
  if (product.variants?.length) {
    variant = variantId ? product.variants.id(variantId) : product.variants.find((v) => v.isActive !== false && v.stock > 0);
    if (variantId && !variant) throw ApiError.badRequest('The selected variant is not available');
  }

  const available = variant ? variant.stock : product.stock;
  if (available <= 0) throw ApiError.badRequest(`${product.name} is currently out of stock`);

  const cart = await getOrCreateCart(userId);
  const existing = cart.findItem(product._id, variant?._id || null);
  const requested = (existing?.quantity || 0) + Number(quantity);

  if (requested > available) {
    throw ApiError.badRequest(`Only ${available} unit(s) of ${product.name} are available`);
  }
  if (requested > 10) throw ApiError.badRequest('You can add a maximum of 10 units per item');

  if (existing) {
    existing.quantity = requested;
  } else {
    cart.items.push({
      product: product._id,
      variantId: variant?._id || null,
      variantName: variant?.name || '',
      quantity: requested,
    });
  }
  cart.lastActivityAt = new Date();
  await cart.save();
  return buildCartPayload(cart);
}

/** Change the quantity of an existing line (0 is handled by removeItem). */
async function updateItemQuantity(userId, itemId, quantity) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound('That item is no longer in your cart');

  const product = await Product.findById(item.product).select('name stock variants isActive');
  if (!product || product.isActive === false) throw ApiError.notFound('This product is no longer available');

  const variant = item.variantId ? product.variants.id(item.variantId) : null;
  const available = variant ? variant.stock : product.stock;

  if (available <= 0) throw ApiError.badRequest(`${product.name} is currently out of stock`);
  if (quantity > available) throw ApiError.badRequest(`Only ${available} unit(s) available`);
  if (quantity > 10) throw ApiError.badRequest('Maximum 10 units per item');

  item.quantity = quantity;
  cart.lastActivityAt = new Date();
  await cart.save();
  return buildCartPayload(cart);
}

async function removeItem(userId, itemId) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound('That item is no longer in your cart');
  item.deleteOne();
  cart.lastActivityAt = new Date();
  await cart.save();
  return buildCartPayload(cart);
}

async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);
  cart.items = [];
  cart.couponCode = '';
  cart.lastActivityAt = new Date();
  await cart.save();
  return buildCartPayload(cart);
}

/** Merge a guest cart (kept in localStorage) into the account cart on login. */
async function mergeGuestCart(userId, items = []) {
  const cart = await getOrCreateCart(userId);
  const results = { added: 0, skipped: 0 };

  for (const raw of items) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const product = await Product.findById(raw.productId).select('stock variants isActive name');
      if (!product || product.isActive === false) {
        results.skipped += 1;
        // eslint-disable-next-line no-continue
        continue;
      }
      const variant = raw.variantId ? product.variants.id(raw.variantId) : null;
      const available = variant ? variant.stock : product.stock;
      if (available <= 0) {
        results.skipped += 1;
        // eslint-disable-next-line no-continue
        continue;
      }
      const existing = cart.findItem(product._id, variant?._id || null);
      const qty = Math.min(Math.max(1, Number(raw.quantity) || 1), available, 10);
      if (existing) existing.quantity = Math.min(existing.quantity + qty, available, 10);
      else cart.items.push({ product: product._id, variantId: variant?._id || null, variantName: variant?.name || '', quantity: qty });
      results.added += 1;
    } catch {
      results.skipped += 1;
    }
  }

  cart.lastActivityAt = new Date();
  await cart.save();
  return { cart: await buildCartPayload(cart), results };
}

/** Validate + apply a coupon code (used by the cart and checkout pages). */
async function applyCoupon(userId, code) {
  const cart = await getOrCreateCart(userId);
  const payload = await buildCartPayload(cart);
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });

  if (!coupon) throw ApiError.notFound('That coupon code is not valid');
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw ApiError.badRequest('This coupon has reached its usage limit');

  const discount = coupon.computeDiscount(payload.totals.subtotal); // throws with a friendly message
  cart.couponCode = coupon.code;
  await cart.save();

  const updated = await buildCartPayload(cart);
  return { cart: updated, discount, message: `Coupon ${coupon.code} applied - you saved ${discount}` };
}

async function removeCoupon(userId) {
  const cart = await getOrCreateCart(userId);
  cart.couponCode = '';
  await cart.save();
  return buildCartPayload(cart);
}

/** Read-only counters used by the header badge without hydrating products. */
async function getCartCount(userId) {
  const cart = await Cart.findOne({ user: userId }).select('items').lean();
  if (!cart) return 0;
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Re-validate every line right before payment/order creation.
 * Returns the authoritative, server-priced line items. Throws on any problem
 * so the customer never pays for something that cannot be fulfilled.
 */
async function getCheckoutLines(userId, options = {}) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) throw ApiError.badRequest('Your cart is empty');

  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) } });
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const lines = [];

  for (const item of cart.items) {
    const product = productMap.get(String(item.product));
    if (!product || product.isActive === false) throw ApiError.badRequest('One of the products in your cart is no longer available');

    const variant = item.variantId ? product.variants.id(item.variantId) : null;
    const available = variant ? variant.stock : product.stock;

    if (available <= 0) throw ApiError.badRequest(`${product.name} is out of stock. Please remove it to continue.`);
    if (item.quantity > available) throw ApiError.badRequest(`Only ${available} unit(s) of ${product.name} are left in stock`);

    const unitPrice = product.priceFor(variant?.name);
    lines.push({
      product: product._id,
      productDoc: product,
      name: product.name,
      slug: product.slug,
      image: variant?.image || product.images?.[0] || '',
      sku: variant?.sku || product.SKU,
      variantId: variant?._id || null,
      variantName: variant?.name || '',
      quantity: item.quantity,
      unitPrice,
      compareAtPrice: product.price > unitPrice ? round2(product.price) : null,
    });
  }

  let couponDiscount = 0;
  let coupon = null;
  if (cart.couponCode) {
    coupon = await Coupon.findOne({ code: cart.couponCode, isActive: true });
    const totalsPreview = calculateTotals(lines.map((l) => ({ unitPrice: l.unitPrice, compareAtPrice: l.compareAtPrice, quantity: l.quantity })));
    if (coupon) {
      try {
        couponDiscount = coupon.computeDiscount(totalsPreview.subtotal);
      } catch {
        coupon = null;
        couponDiscount = 0;
      }
    }
  }

  const totals = calculateTotals(
    lines.map((l) => ({ unitPrice: l.unitPrice, compareAtPrice: l.compareAtPrice, quantity: l.quantity })),
    { couponDiscount, currency: options.currency },
  );

  return { cart, lines, totals, coupon };
}

module.exports = {
  getOrCreateCart,
  buildCartPayload,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  mergeGuestCart,
  applyCoupon,
  removeCoupon,
  getCartCount,
  getCheckoutLines,
};
