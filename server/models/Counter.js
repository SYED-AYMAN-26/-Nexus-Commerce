const mongoose = require('mongoose');

/**
 * Atomic sequence generator.
 *
 * `findOneAndUpdate` with `$inc` + `upsert` is a single atomic operation in
 * MongoDB, so concurrent order creations can never collide on the same number
 * (unlike counting documents, which races).
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. "order-2026"
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

counterSchema.statics.next = async function next(key) {
  const doc = await this.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
