const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    rating: { type: Number, required: [true, 'Rating is required'], min: 1, max: 5 },
    title: { type: String, default: '', maxlength: 120 },
    comment: { type: String, required: [true, 'Review comment is required'], trim: true, minlength: 3, maxlength: 1200 },
    images: { type: [String], default: [] },
    isVerifiedPurchase: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0 },
    status: { type: String, enum: ['published', 'hidden'], default: 'published' },
  },
  { timestamps: true },
);

// One review per customer per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });

/** Recalculate the product's denormalised rating fields after any change. */
async function recalculateProductRating(productId) {
  const Product = mongoose.model('Product');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: 'published' } },
    {
      $group: {
        _id: '$product',
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
        r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
      },
    },
  ]);

  const result = stats[0] || { avg: 0, count: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 };
  await Product.findByIdAndUpdate(productId, {
    rating: Math.round((result.avg || 0) * 10) / 10,
    numReviews: result.count,
    ratingBreakdown: { 1: result.r1, 2: result.r2, 3: result.r3, 4: result.r4, 5: result.r5 },
  });
}

reviewSchema.post('save', function afterSave(doc) {
  return recalculateProductRating(doc.product);
});
reviewSchema.post('findOneAndDelete', async function afterDelete(doc) {
  if (doc) await recalculateProductRating(doc.product);
});
reviewSchema.post('findOneAndUpdate', async function afterUpdate(doc) {
  if (doc) await recalculateProductRating(doc.product);
});
reviewSchema.post('deleteMany', async function afterDeleteMany(docs) {
  // `docs` is often empty for deleteMany; the caller recalculates explicitly.
  if (Array.isArray(docs) && docs.length) {
    const ids = [...new Set(docs.map((d) => String(d.product)))];
    await Promise.all(ids.map((id) => recalculateProductRating(id)));
  }
});

module.exports = mongoose.model('Review', reviewSchema);
module.exports.recalculateProductRating = recalculateProductRating;
