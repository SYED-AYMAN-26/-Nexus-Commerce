const jwt = require('jsonwebtoken');
const config = require('../config');

/** Sign the session token. The payload only carries the user id + role. */
function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, tokenVersion: user.tokenVersion || 0 },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn, issuer: 'nexus-commerce' },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret, { issuer: 'nexus-commerce' });
}

/** Short lived token that only authorises the password-reset endpoint. */
function signResetToken(user) {
  return jwt.sign(
    { sub: String(user._id), purpose: 'password-reset' },
    config.jwt.resetSecret,
    { expiresIn: config.jwt.resetExpiresIn, issuer: 'nexus-commerce' },
  );
}

function verifyResetToken(token) {
  const payload = jwt.verify(token, config.jwt.resetSecret, { issuer: 'nexus-commerce' });
  if (payload.purpose !== 'password-reset') throw new Error('Invalid token purpose');
  return payload;
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: config.cookie.secure,
  // `lax` keeps CSRF surface small while working across the Vite dev-port split
  sameSite: config.isProduction ? 'none' : 'lax',
  maxAge: config.cookie.maxAgeMs,
  path: '/',
});

function setAuthCookie(res, token) {
  res.cookie(config.cookie.name, token, cookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(config.cookie.name, { ...cookieOptions(), maxAge: undefined });
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signResetToken,
  verifyResetToken,
  setAuthCookie,
  clearAuthCookie,
};
