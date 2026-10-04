const config = require('../config');

/**
 * Money helpers. All prices are stored as plain numbers (not floats derived
 * from user input) and rounded to 2 decimals on the server. The client NEVER
 * supplies prices - they are always recalculated here.
 */
const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/** Effective selling price of a product (discount price wins when valid). */
const effectivePrice = (product) => {
  const price = Number(product?.price || 0);
  const discountPrice = Number(product?.discountPrice || 0);
  if (discountPrice > 0 && discountPrice < price) return round2(discountPrice);
  return round2(price);
};

const discountPercentage = (product) => {
  const price = Number(product?.price || 0);
  const final = effectivePrice(product);
  if (!price || final >= price) return 0;
  return Math.round(((price - final) / price) * 100);
};

/**
 * Canonical order/cart totals calculation used by both cart previews and the
 * order creation service, guaranteeing the numbers shown match the numbers
 * charged.
 */
function calculateTotals(lineItems, options = {}) {
  const shippingFlatRate = options.shippingFlatRate ?? config.business.shippingFlatRate;
  const freeShippingThreshold = options.freeShippingThreshold ?? config.business.freeShippingThreshold;
  const taxRate = options.taxRate ?? config.business.taxRate;

  const items = lineItems.map((item) => {
    const unitPrice = round2(item.unitPrice);
    const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
    const lineTotal = round2(unitPrice * quantity);
    const compareAt = item.compareAtPrice ? round2(item.compareAtPrice) : null;
    return {
      ...item,
      unitPrice,
      quantity,
      lineTotal,
      lineDiscount: compareAt && compareAt > unitPrice ? round2((compareAt - unitPrice) * quantity) : 0,
    };
  });

  const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));
  const productDiscount = round2(items.reduce((sum, i) => sum + i.lineDiscount, 0));
  const couponDiscount = round2(options.couponDiscount || 0);
  const discount = round2(productDiscount + couponDiscount);

  const shipping = items.length === 0 || subtotal >= freeShippingThreshold ? 0 : shippingFlatRate;
  const taxableBase = Math.max(0, subtotal - couponDiscount);
  const tax = round2(taxableBase * taxRate);
  const total = round2(Math.max(0, subtotal - couponDiscount + shipping + tax));

  return {
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal,
    productDiscount,
    couponDiscount,
    discount,
    shipping,
    tax,
    taxRate,
    total,
    currency: options.currency ?? config.business.currency,
    freeShippingThreshold,
  };
}

const formatMoney = (amount, currency = config.business.currency) => {
  const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  const symbol = symbols[currency] || '';
  return `${symbol}${round2(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

module.exports = { round2, effectivePrice, discountPercentage, calculateTotals, formatMoney };
