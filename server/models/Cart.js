const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    variantName: { type: String, default: '' },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'], max: [10, 'Maximum 10 units per item'] },
    // Snapshot of the price when it was added - the charged price is always
    // re-validated server side at checkout, this is only for display.
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    couponCode: { type: String, default: '', uppercase: true, trim: true },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

cartSchema.methods.findItem = function findItem(productId, variantId = null) {
  return this.items.find(
    (item) => String(item.product) === String(productId) && String(item.variantId || '') === String(variantId || ''),
  );
};

cartSchema.methods.empty = function empty() {
  this.items = [];
  this.couponCode = '';
  return this.save();
};

module.exports = mongoose.model('Cart', cartSchema);
