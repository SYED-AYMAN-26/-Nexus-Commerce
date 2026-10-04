const mongoose = require('mongoose');
const config = require('../config');

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    slug: { type: String, default: '' },
    image: { type: String, default: '' },
    sku: { type: String, default: '' },
    // Historical prices - never re-computed from the product document
    unitPrice: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
    variantName: { type: String, default: '' },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Lets customers review only what they actually received
    reviewed: { type: Boolean, default: false },
  },
  { _id: true },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    note: { type: String, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: { validator: (v) => Array.isArray(v) && v.length > 0, message: 'An order must contain at least one item' },
    },
    shippingAddress: { type: shippingAddressSchema, required: true },
    billingAddress: { type: shippingAddressSchema, default: null },
    paymentMethod: { type: String, enum: ['card', 'upi', 'netbanking', 'cod', 'wallet'], default: 'card' },
    paymentProvider: { type: String, default: 'mock' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending', index: true },
    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    paymentIntentId: { type: String, default: '', index: true },
    transactionId: { type: String, default: '' },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    refundAmount: { type: Number, default: 0 },

    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    productDiscount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, default: '' },
    couponDiscount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: config.business.taxRate },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: config.business.currency },

    statusHistory: { type: [statusHistorySchema], default: [] },
    notes: { type: String, default: '', maxlength: 500 },
    cancelReason: { type: String, default: '' },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    invoiceNumber: { type: String, default: '' },
    stockRestored: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true, transform: (_doc, ret) => { delete ret.__v; return ret; } } },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 'text' });

/**
 * Human friendly sequential order number: NX-2026-000123
 * Sourced from an atomic counter so concurrent orders never collide.
 */
orderSchema.pre('save', async function assignOrderNumber(next) {
  if (this.orderNumber) return next();
  // eslint-disable-next-line global-require
  const Counter = require('./Counter');
  const year = new Date().getFullYear();
  const seq = await Counter.next(`order-${year}`);
  const padded = String(seq).padStart(6, '0');
  this.orderNumber = `NX-${year}-${padded}`;
  this.invoiceNumber = `INV-${year}-${padded}`;
  return next();
});

/** Number of stages completed on the tracker (cancelled = 0). */
orderSchema.virtual('progress').get(function progress() {
  if (this.orderStatus === 'cancelled') return 0;
  const index = ORDER_STATUSES.indexOf(this.orderStatus);
  return index < 0 ? 0 : index;
});

orderSchema.virtual('itemCount').get(function itemCount() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.methods.canBeCancelled = function canBeCancelled() {
  return ['pending', 'confirmed', 'processing'].includes(this.orderStatus);
};

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
