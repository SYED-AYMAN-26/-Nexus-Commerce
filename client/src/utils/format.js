export const CURRENCY = 'INR';
const SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

/** Format a number as money with the store currency. */
export function formatMoney(amount, options = {}) {
  const value = Number(amount || 0);
  const symbol = SYMBOLS[options.currency || CURRENCY] || '';
  const formatted = value.toLocaleString(options.locale || 'en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return options.hideSymbol ? formatted : `${symbol}${formatted}`;
}

/** Compact money for dashboard tiles: ₹1.2L / ₹3.4Cr style for INR. */
export function formatCompactMoney(amount, currency = CURRENCY) {
  const value = Number(amount || 0);
  const symbol = SYMBOLS[currency] || '';
  if (currency === 'INR') {
    if (value >= 10000000) return `${symbol}${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `${symbol}${(value / 100000).toFixed(2)} L`;
    if (value >= 1000) return `${symbol}${(value / 1000).toFixed(1)}K`;
  } else {
    if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${symbol}${(value / 1000).toFixed(1)}K`;
  }
  return `${symbol}${value.toFixed(0)}`;
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

export function formatDate(date, options = {}) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "3 days ago", "just now" - used in reviews and the activity feed. */
export function formatRelativeTime(date) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  return `${Math.round(months / 12)} year${Math.round(months / 12) > 1 ? 's' : ''} ago`;
}

export function formatPercent(value, digits = 0) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

export const titleCase = (value = '') =>
  String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const initials = (name = '') =>
  String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export const truncate = (text = '', length = 120) =>
  text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;

/** 42 -> "42" | 1234 -> "1.2K" (for review counts etc.) */
export const compactNumber = (value) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));

export const pluralize = (count, singular, plural) => `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
