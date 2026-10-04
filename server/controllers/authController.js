const crypto = require('crypto');
const User = require('../models/User');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signAccessToken, signResetToken, verifyResetToken, setAuthCookie, clearAuthCookie } = require('../utils/token');
const cartService = require('../services/cartService');

/** Shape returned to the client - never includes password/hash fields. */
const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  addresses: user.addresses,
  wishlist: user.wishlist,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const authPayload = (user, token) => ({ user: serializeUser(user), token });

/**
 * POST /api/auth/register
 * Creates the account, hashes the password (model hook), signs a session,
 * sets the httpOnly cookie and merges any guest cart.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, guestCart } = req.body;

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists. Try signing in instead.', {
      code: 'EMAIL_IN_USE',
      errors: [{ field: 'email', message: 'This email is already registered' }],
    });
  }

  const user = await User.create({ name, email, password, role: 'user' });
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  // Carry a guest cart over to the new account
  if (Array.isArray(guestCart) && guestCart.length) {
    await cartService.mergeGuestCart(user._id, guestCart);
  }

  const token = signAccessToken(user);
  setAuthCookie(res, token);

  res.status(201).json({
    success: true,
    message: `Welcome to Nexus, ${user.name.split(' ')[0]}!`,
    data: authPayload(user, token),
  });
});

/** POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password, guestCart } = req.body;

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password +tokenVersion');
  if (!user || !(await user.comparePassword(password))) {
    // Deliberately vague: do not reveal whether the email exists
    throw ApiError.unauthorized('Incorrect email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled. Please contact support.');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  if (Array.isArray(guestCart) && guestCart.length) {
    await cartService.mergeGuestCart(user._id, guestCart);
  }

  const token = signAccessToken(user);
  setAuthCookie(res, token);

  res.json({
    success: true,
    message: `Signed in as ${user.email}`,
    data: authPayload(user, token),
  });
});

/**
 * POST /api/auth/logout
 * Bumps `tokenVersion` so every previously issued token for this account is
 * rejected, then clears the cookie.
 */
const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  }
  clearAuthCookie(res);
  res.json({ success: true, message: 'You have been signed out' });
});

/** GET /api/auth/profile */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'wishlist',
    select: 'name slug images price discountPrice rating numReviews stock brand',
  });
  const cartCount = await cartService.getCartCount(req.user._id);

  res.json({
    success: true,
    data: { user: serializeUser(user), wishlistDetailed: user.wishlist, cartCount },
  });
});

/**
 * POST /api/auth/forgot-password
 * Always responds 200 so the endpoint cannot be used to enumerate accounts.
 * The reset link is printed to the server log when no mailer is configured.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email).toLowerCase() });

  let devResetUrl = null;
  if (user) {
    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${config.clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    // eslint-disable-next-line no-console
    console.log(`\x1b[35m[email:password-reset]\x1b[0m ${user.email} -> ${resetUrl}`);
    if (!config.isProduction) devResetUrl = resetUrl;
  }

  res.json({
    success: true,
    message: 'If an account exists for that email, a password reset link has been sent.',
    // Only surfaced outside production so the flow is testable without an SMTP server
    data: devResetUrl ? { devResetUrl } : undefined,
  });
});

/**
 * POST /api/auth/reset-password
 * Accepts either the emailed opaque token, or a JWT issued by
 * /api/auth/forgot-password (kept for API compatibility).
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password, email } = req.body;

  let user = null;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires +tokenVersion');

  if (!user) {
    // Fallback: try the JWT form
    try {
      const payload = verifyResetToken(token);
      user = await User.findById(payload.sub).select('+tokenVersion');
    } catch {
      user = null;
    }
  }

  if (!user) throw ApiError.badRequest('This password reset link is invalid or has expired. Please request a new one.');
  if (email && String(user.email) !== String(email).toLowerCase()) {
    throw ApiError.badRequest('This password reset link does not match the account');
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // revoke existing sessions
  await user.save();

  res.json({ success: true, message: 'Your password has been updated. Please sign in with your new password.' });
});

/** POST /api/auth/change-password (authenticated) */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password +tokenVersion');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect', {
      errors: [{ field: 'currentPassword', message: 'Incorrect current password' }],
    });
  }
  if (await user.comparePassword(newPassword)) {
    throw ApiError.badRequest('Your new password must be different from the current one');
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  // Issue a fresh token so the current session survives the revocation.
  // `tokenVersion` is `select: false`, so it must be requested explicitly -
  // signing with a stale version would immediately invalidate the new cookie.
  const freshUser = await User.findById(user._id).select('+tokenVersion');
  const token = signAccessToken(freshUser);
  setAuthCookie(res, token);

  res.json({ success: true, message: 'Password updated successfully', data: { token } });
});

/** POST /api/auth/refresh - rotates the session token for active users. */
const refresh = asyncHandler(async (req, res) => {
  const token = signAccessToken(req.user);
  setAuthCookie(res, token);
  res.json({ success: true, data: { token, user: serializeUser(req.user) } });
});

/** GET /api/auth/check-email?email= - live "is this email taken" hint. */
const checkEmail = asyncHandler(async (req, res) => {
  const email = String(req.query.email || '').toLowerCase();
  if (!email) throw ApiError.badRequest('An email address is required');
  const exists = await User.exists({ email });
  res.json({ success: true, data: { email, available: !exists } });
});

module.exports = { register, login, logout, getProfile, forgotPassword, resetPassword, changePassword, refresh, checkEmail, serializeUser };
