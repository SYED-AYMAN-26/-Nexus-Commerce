const config = require('../config');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/token');
const User = require('../models/User');

/** Reads the JWT from the httpOnly cookie first, then the Authorization header. */
function extractToken(req) {
  if (req.cookies?.[config.cookie.name]) return req.cookies[config.cookie.name];
  const header = req.headers.authorization || req.headers.Authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * Require a valid session. Attaches `req.user` (a lean user document).
 * Token payloads carry a `tokenVersion` so logout/password-change can revoke
 * previously issued tokens.
 */
const protect = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('You need to sign in to continue');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    throw ApiError.unauthorized(error.name === 'TokenExpiredError' ? 'Your session has expired. Please sign in again.' : 'Invalid session token');
  }

  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user) throw ApiError.unauthorized('The account linked to this session no longer exists');
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled. Please contact support.');
  if ((user.tokenVersion || 0) !== (payload.tokenVersion || 0)) {
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.');
  }

  req.user = user;
  next();
});

/** Attaches `req.user` when a valid session exists but never blocks the request. */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (user && user.isActive && (user.tokenVersion || 0) === (payload.tokenVersion || 0)) {
      req.user = user;
    }
  } catch {
    // A bad token on a public route is simply treated as "not signed in".
  }
  return next();
});

/** Role guard - use after `protect`. */
const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized('You need to sign in to continue'));
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to access this resource'));
  }
  return next();
};

const adminOnly = authorize('admin');

module.exports = { protect, optionalAuth, authorize, adminOnly, extractToken };
