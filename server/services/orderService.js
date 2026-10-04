const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const { round2 } = require('../utils/pricing');

/**
 * Decrement inventory for a single line.
 *
 * Uses a conditional update (`stock: { $gte: qty }`) so two concurrent orders
 * can never oversell the last unit. For variant lines the positional `$`
 * operator targets the exact variant sub-document.
 */
async function decrementStock(line) {
  if (line.variantId) {
    const result = await Product.updateOne(
      { _id: line.product, 'variants._id': line.variantId, 'variants.stock': { $gte: line.quantity } },
      { $inc: { 'variants.$.stock': -line.quantity, sold: line.quantity } },
    );
    return result.modifiedCount === 1;
  }
  const result = await Product.updateOne(
    { _id: line.product, stock: { $gte: line.quantity } },
    { $inc: { stock: -line.quantity, sold: line.quantity } },
  );
  return result.modifiedCount === 1;
}

/** Inverse of `decrementStock`, used on cancellation/refund and as a rollback. */
async function restoreStock(line) {
  if (line.variantId) {
    await Product.updateOne(
      { _id: line.product, 'variants._id': line.variantId },
      { $inc: { 'variants.$.stock': line.quantity, sold: -line.quantity } },
    );
    return;
  }
  await Product.updateOne({ _id: line.product }, { $inc: { stock: line.quantity, sold: -line.quantity } });
}

/**
 * Create an order from authoritative server-side data.
 *
 * @param {object} params
 * @param {object} params.user            mongoose user document
 * @param {Array}  params.lines           output of cartService.getCheckoutLines()
 * @param {object} params.totals          server computed totals
 * @param {object} params.shippingAddress validated address snapshot
 * @param {object} params.payment         Payment document marked `succeeded`
 */
async function createOrder({ user, lines, totals, shippingAddress, payment, paymentMethod = 'card', notes = '', couponCode = '' }) {
  const decremented = [];

  try {
    for (const line of lines) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await decrementStock(line);
      if (!ok) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(decremented.map((l) => restoreStock(l)));
        throw ApiError.conflict(`${line.name} just went out of stock. Your payment was not captured - no order was created.`);
      }
      decremented.push(line);
    }

    const order = await Order.create({
      user: user._id,
      items: lines.map((line) => ({
        product: line.product,
        name: line.name,
        slug: line.slug,
        image: line.image,
        sku: line.sku,
        unitPrice: line.unitPrice,
        compareAtPrice: line.compareAtPrice,
        quantity: line.quantity,
        lineTotal: round2(line.unitPrice * line.quantity),
        variantId: line.variantId,
        variantName: line.variantName,
      })),
      shippingAddress,
      paymentMethod,
      paymentProvider: payment?.provider || 'mock',
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      paymentIntentId: payment?.providerReference || '',
      transactionId: payment?.providerReference || '',
      paidAt: new Date(),
      subtotal: totals.subtotal,
      productDiscount: totals.productDiscount,
      discount: totals.discount,
      couponCode: couponCode || '',
      couponDiscount: totals.couponDiscount,
      shipping: totals.shipping,
      tax: totals.tax,
      taxRate: totals.taxRate,
      total: totals.total,
      currency: totals.currency,
      notes,
      statusHistory: [
        { status: 'pending', note: 'Order placed', changedBy: user._id },
        { status: 'confirmed', note: 'Payment verified and stock reserved', changedBy: null },
      ],
    });

    if (couponCode) {
      await Coupon.updateOne({ code: couponCode }, { $inc: { usedCount: 1 } });
    }

    return order;
  } catch (error) {
    // Roll back any stock that was decremented before the failure
    await Promise.all(decremented.map((l) => restoreStock(l)));
    throw error;
  }
}

/** Attach the created order to its payment record (idempotency guard). */
async function linkPayment(payment, order) {
  if (!payment) return;
  payment.order = order._id;
  payment.consumedAt = new Date();
  await payment.save();
}

/** Cancel an order and (optionally) return the reserved stock to inventory. */
async function cancelOrder(order, { reason = 'Cancelled by customer', changedBy = null, restoreStock: shouldRestore = true } = {}) {
  if (!order.canBeCancelled()) {
    throw ApiError.badRequest(`An order that is already ${order.orderStatus} cannot be cancelled`);
  }

  if (shouldRestore && !order.stockRestored) {
    await Promise.all(
      order.items.map((item) => restoreStock({ product: item.product, variantId: item.variantId, quantity: item.quantity })),
    );
    order.stockRestored = true;
  }

  order.orderStatus = 'cancelled';
  order.cancelledAt = new Date();
  order.cancelReason = reason;
  order.statusHistory.push({ status: 'cancelled', note: reason, changedBy });

  // A paid order that is cancelled must be refunded (or queued for refund).
  if (order.paymentStatus === 'paid') {
    order.paymentStatus = 'refunded';
    order.refundedAt = new Date();
    order.refundAmount = order.total;
  }

  await order.save();
  return order;
}

/** Admin status transition with validation + history + side effects. */
async function updateStatus(order, { orderStatus, note = '', changedBy = null }) {
  const allowed = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  if (order.orderStatus === orderStatus) return order;
  if (!allowed[order.orderStatus].includes(orderStatus)) {
    throw ApiError.badRequest(`Cannot move an order from "${order.orderStatus}" to "${orderStatus}"`);
  }

  if (orderStatus === 'cancelled') {
    await cancelOrder(order, { reason: note || 'Cancelled by admin', changedBy });
    return order;
  }

  order.orderStatus = orderStatus;
  if (orderStatus === 'delivered') order.deliveredAt = new Date();
  order.statusHistory.push({ status: orderStatus, note, changedBy });
  await order.save();
  return order;
}

/**
 * Idempotent: a webhook and the client-side verify call can both reach this
 * point, and only one order is ever created per payment.
 */
async function findOrderByPayment(payment) {
  if (!payment) return null;
  if (payment.order) return Order.findById(payment.order);
  return Order.findOne({ paymentIntentId: payment.providerReference });
}

const STATUS_LABELS = {
  pending: 'Order placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

module.exports = { createOrder, cancelOrder, updateStatus, decrementStock, restoreStock, linkPayment, findOrderByPayment, STATUS_LABELS };
