/**
 * Helpers that translate validated query strings into Mongoose query objects.
 * Keeping this logic in one place means list endpoints behave identically.
 */

const parsePagination = (query = {}, defaults = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || defaults.page || 1);
  const rawLimit = Number.parseInt(query.limit, 10) || defaults.limit || 12;
  const limit = Math.min(Math.max(1, rawLimit), defaults.maxLimit || 60);
  return { page, limit, skip: (page - 1) * limit };
};

const parseSort = (sort, sortMap, fallback = '-createdAt') => {
  if (!sort) return fallback;
  return sortMap[sort] || fallback;
};

const buildPaginationMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

/** Escape user supplied text before using it inside a RegExp. */
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { parsePagination, parseSort, buildPaginationMeta, escapeRegex };
