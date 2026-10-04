const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    value: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    usageLimit: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/** Returns the discount amount for a given subtotal, or throws a reason. */
couponSchema.methods.computeDiscount = function computeDiscount(subtotal) {
  if (!this.isActive) throw new Error('This coupon is no longer active');
  if (this.expiresAt && this.expiresAt < new Date()) throw new Error('This coupon has expired');
  if (this.startsAt && this.startsAt > new Date()) throw new Error('This coupon is not active yet');
  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) throw new Error('This coupon has reached its usage limit');
  if (subtotal < this.minOrderValue) {
    throw new Error(`Add items worth ${this.minOrderValue - subtotal} more to use this coupon`);
  }
  let discount = this.type === 'percentage' ? (subtotal * this.value) / 100 : this.value;
  if (this.maxDiscount > 0) discount = Math.min(discount, this.maxDiscount);
  return Math.round(Math.min(discount, subtotal) * 100) / 100;
};

module.exports = mongoose.model('Coupon', couponSchema);
