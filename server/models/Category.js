const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Category name is required'], trim: true, unique: true, maxlength: 60 },
    slug: { type: String, unique: true, index: true, lowercase: true },
    description: { type: String, default: '', maxlength: 400 },
    image: { type: String, default: '' },
    icon: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

categorySchema.pre('validate', function generateSlug(next) {
  if (this.name && (this.isModified('name') || !this.slug)) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

categorySchema.pre('findOneAndDelete', async function cascadeProducts(next) {
  const category = await this.model.findOne(this.getFilter()).select('_id');
  if (category) {
    await mongoose.model('Product').updateMany({ category: category._id }, { $set: { isActive: false } });
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
