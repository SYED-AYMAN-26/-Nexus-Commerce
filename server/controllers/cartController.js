const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const cartService = require('../services/cartService');

/** GET /api/cart */
const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getOrCreateCart(req.user._id);
  const payload = await cartService.buildCartPayload(cart);
  res.json({ success: true, data: { cart: payload } });
});

/** POST /api/cart */
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, variantId = null } = req.body;
  const cart = await cartService.addItem(req.user._id, { productId, quantity, variantId });
  res.status(201).json({ success: true, message: 'Added to your cart', data: { cart } });
});

/** PUT /api/cart/:itemId */
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  if (quantity <= 0) {
    const cart = await cartService.removeItem(req.user._id, req.params.itemId);
    return res.json({ success: true, message: 'Item removed', data: { cart } });
  }
  const cart = await cartService.updateItemQuantity(req.user._id, req.params.itemId, quantity);
  return res.json({ success: true, message: 'Cart updated', data: { cart } });
});

/** DELETE /api/cart/:itemId */
const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await cartService.removeItem(req.user._id, req.params.itemId);
  res.json({ success: true, message: 'Item removed from cart', data: { cart } });
});

/** DELETE /api/cart */
const clearCart = asyncHandler(async (req, res) => {
  const cart = await cartService.clearCart(req.user._id);
  res.json({ success: true, message: 'Cart cleared', data: { cart } });
});

/** POST /api/cart/merge - push a guest (localStorage) cart into the account cart */
const mergeCart = asyncHandler(async (req, res) => {
  const { cart, results } = await cartService.mergeGuestCart(req.user._id, req.body.items);
  res.json({
    success: true,
    message: results.skipped ? `Merged ${results.added} item(s); ${results.skipped} unavailable` : 'Your cart has been synced',
    data: { cart, results },
  });
});

/** GET /api/cart/count - header badge without hydration */
const getCartCount = asyncHandler(async (req, res) => {
  const count = await cartService.getCartCount(req.user._id);
  res.json({ success: true, data: { count } });
});

/** POST /api/cart/coupon */
const applyCoupon = asyncHandler(async (req, res) => {
  const result = await cartService.applyCoupon(req.user._id, req.body.code);
  res.json({ success: true, message: result.message, data: { cart: result.cart } });
});

/** DELETE /api/cart/coupon */
const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await cartService.removeCoupon(req.user._id);
  res.json({ success: true, message: 'Coupon removed', data: { cart } });
});

/** POST /api/cart/preview - totals for checkout review (no payment yet) */
const previewCheckout = asyncHandler(async (req, res) => {
  const { totals, lines } = await cartService.getCheckoutLines(req.user._id);
  if (!lines.length) throw ApiError.badRequest('Your cart is empty');
  res.json({
    success: true,
    data: {
      items: lines.map((l) => ({
        productId: l.product,
        name: l.name,
        slug: l.slug,
        image: l.image,
        variantName: l.variantName,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: Math.round(l.unitPrice * l.quantity * 100) / 100,
      })),
      totals,
    },
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeCart,
  getCartCount,
  applyCoupon,
  removeCoupon,
  previewCheckout,
};
