const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SALT_ROUNDS = 12;

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: 'Home', maxlength: 40 },
    fullName: { type: String, required: [true, 'Full name is required'], trim: true, maxlength: 80 },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[+\d][\d\s\-()]{6,19}$/, 'Please provide a valid phone number'],
    },
    addressLine1: { type: String, required: [true, 'Address line 1 is required'], trim: true, maxlength: 160 },
    addressLine2: { type: String, trim: true, default: '', maxlength: 160 },
    city: { type: String, required: [true, 'City is required'], trim: true, maxlength: 80 },
    state: { type: String, required: [true, 'State is required'], trim: true, maxlength: 80 },
    postalCode: { type: String, required: [true, 'Postal code is required'], trim: true, maxlength: 16 },
    country: { type: String, required: [true, 'Country is required'], trim: true, default: 'India', maxlength: 80 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Please provide a valid email address'],
    },
    password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
    phone: { type: String, trim: true, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    addresses: { type: [addressSchema], default: [] },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    // Incremented on logout-all / password change to invalidate issued JWTs
    tokenVersion: { type: Number, default: 0, select: false },
    passwordChangedAt: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.tokenVersion;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ createdAt: -1 });
userSchema.index({ name: 'text', email: 'text' });

/** Virtual used by the admin table + profile header. */
userSchema.virtual('initials').get(function initials() {
  return String(this.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
});

userSchema.virtual('defaultAddress').get(function defaultAddress() {
  if (!this.addresses?.length) return null;
  return this.addresses.find((a) => a.isDefault) || this.addresses[0];
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  return next();
});

/** Ensure exactly one default address whenever addresses change. */
userSchema.pre('save', function normalizeAddresses(next) {
  if (this.isModified('addresses') && this.addresses.length > 0) {
    const defaults = this.addresses.filter((a) => a.isDefault);
    if (defaults.length === 0) this.addresses[0].isDefault = true;
    else if (defaults.length > 1) {
      this.addresses.forEach((a, i) => {
        a.isDefault = i === this.addresses.indexOf(defaults[0]) && a.isDefault;
      });
    }
  }
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/** Returns a plain token; only the hashed value is persisted. */
userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
  return rawToken;
};

userSchema.methods.isWishlisted = function isWishlisted(productId) {
  return this.wishlist.some((id) => String(id) === String(productId));
};

module.exports = mongoose.model('User', userSchema);
