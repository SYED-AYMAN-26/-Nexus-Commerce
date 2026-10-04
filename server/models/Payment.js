const mongoose = require('mongoose');

/**
 * Audit trail for every payment attempt, independent of the gateway used.
 * This is the record the server trusts when verifying a payment - never the
 * status reported by the browser.
 */
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    provider: { type: String, required: true, default: 'mock' },
    providerReference: { type: String, required: true, index: true }, // checkout session / payment intent id
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: { type: String, default: 'card' },
    status: {
      type: String,
      enum: ['created', 'requires_action', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'],
      default: 'created',
      index: true,
    },
    failureReason: { type: String, default: '' },
    // Prevent a checkout session from being consumed twice
    consumedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    events: {
      type: [
        {
          type: { type: String },
          message: { type: String, default: '' },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

paymentSchema.index({ providerReference: 1, provider: 1 }, { unique: true });

paymentSchema.methods.recordEvent = function recordEvent(type, message = '') {
  this.events.push({ type, message, at: new Date() });
  return this;
};

module.exports = mongoose.model('Payment', paymentSchema);
