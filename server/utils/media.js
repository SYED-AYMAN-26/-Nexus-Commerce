/**
 * Deterministic SVG artwork generator.
 *
 * Instead of shipping binary stock photos (which bloat the repo and break in
 * offline/preview environments) the API serves generated vector artwork at
 * `/api/media/products/:slug.svg`. Each product gets a stable gradient derived
 * from its slug plus a category glyph, so the catalogue always renders.
 *
 * Swap `images` for real CDN URLs in the admin panel - the components accept
 * any URL, the generator is simply the zero-dependency default.
 */

const PALETTES = [
  ['#6366f1', '#8b5cf6'],
  ['#0ea5e9', '#6366f1'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#0ea5e9'],
  ['#ec4899', '#8b5cf6'],
  ['#14b8a6', '#0ea5e9'],
  ['#f43f5e', '#f59e0b'],
  ['#8b5cf6', '#6366f1'],
  ['#22c55e', '#14b8a6'],
  ['#e11d48', '#7c3aed'],
];

/** Glyph path data per category (24x24 viewBox, stroke based). */
const GLYPHS = {
  electronics: 'M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 7h10v10H7z',
  fashion: 'M6 3l3 3-2 3 2 3v9h6v-9l2-3-2-3 3-3-3-2-2 2-2-2-3 2z',
  home: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
  beauty: 'M9 3h6v4l2 3v11H7V10l2-3V3zM10 12h4M10 16h4',
  sports: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c3 3 4 6 4 9s-1 6-4 9m0-18c-3 3-4 6-4 9s1 6 4 9M3.5 9h17M3.5 15h17',
  books: 'M4 4h7v16H4zM13 4h7v16h-7zM11 4v16',
  'audio': 'M4 14v-4h3l5-5v14l-5-5H4zM17 8a5 5 0 010 8M20 5a10 10 0 010 14',
  cameras: 'M4 8h3l2-3h6l2 3h3v12H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  gaming: 'M7 10h3M8.5 8.5v3M15 11h.01M17 13h.01M6 7h12a4 4 0 014 4v6a2 2 0 01-3.5 1.4L15 16H9l-3.5 2.4A2 2 0 012 17v-6a4 4 0 014-4z',
  default: 'M4 7h16v13H4zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M4 12h16',
};

function hashString(value = '') {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  return Math.abs(hash);
}

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * @param {object} opts
 * @param {string} opts.seed     unique string (product slug + index)
 * @param {string} opts.label    primary text shown on the artwork
 * @param {string} opts.sublabel secondary text (brand / category)
 * @param {string} opts.category category slug used to pick a glyph
 * @param {number} opts.width
 * @param {number} opts.height
 */
function generateProductSvg({ seed = 'nexus', label = '', sublabel = '', category = 'default', width = 900, height = 900 } = {}) {
  const hash = hashString(seed);
  const [from, to] = PALETTES[hash % PALETTES.length];
  const angle = hash % 60;
  const glyph = GLYPHS[String(category).toLowerCase()] || GLYPHS.default;
  const id = `g${hash.toString(36)}`;

  // Decorative circles positioned deterministically from the hash
  const c1x = 18 + (hash % 40);
  const c1y = 20 + ((hash >> 3) % 30);
  const c2x = 60 + ((hash >> 5) % 30);
  const c2y = 62 + ((hash >> 7) % 28);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 100 100" role="img" aria-label="${escapeXml(label)}">
  <defs>
    <linearGradient id="${id}" gradientTransform="rotate(${angle})">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="${id}-glow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100" height="100" fill="url(#${id})"/>
  <rect width="100" height="100" fill="url(#${id}-glow)"/>
  <circle cx="${c1x}" cy="${c1y}" r="${12 + (hash % 10)}" fill="#ffffff" opacity="0.10"/>
  <circle cx="${c2x}" cy="${c2y}" r="${16 + (hash % 14)}" fill="#000000" opacity="0.07"/>
  <g transform="translate(50 44) scale(2.1) translate(-12 -12)" fill="none" stroke="#ffffff" stroke-opacity="0.92" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <path d="${glyph}"/>
  </g>
  <text x="50" y="74" text-anchor="middle" font-family="Inter, Segoe UI, system-ui, sans-serif" font-size="4.4" font-weight="700" fill="#ffffff" opacity="0.96">${escapeXml(label).slice(0, 34)}</text>
  <text x="50" y="81" text-anchor="middle" font-family="Inter, Segoe UI, system-ui, sans-serif" font-size="3" letter-spacing="0.6" fill="#ffffff" opacity="0.72">${escapeXml(sublabel).slice(0, 40).toUpperCase()}</text>
</svg>`;
}

/** Wide banner artwork used by category tiles / promo blocks. */
function generateBannerSvg({ seed = 'banner', label = '', width = 1200, height = 600 } = {}) {
  const hash = hashString(seed);
  const [from, to] = PALETTES[(hash + 3) % PALETTES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 120 60" role="img" aria-label="${escapeXml(label)}">
  <defs>
    <linearGradient id="b${hash.toString(36)}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="120" height="60" fill="url(#b${hash.toString(36)})"/>
  <circle cx="100" cy="12" r="26" fill="#ffffff" opacity="0.12"/>
  <circle cx="18" cy="52" r="20" fill="#000000" opacity="0.08"/>
  <text x="60" y="33" text-anchor="middle" font-family="Inter, Segoe UI, system-ui, sans-serif" font-size="6" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>
</svg>`;
}

module.exports = { generateProductSvg, generateBannerSvg, paletteFor: (seed) => PALETTES[hashString(seed) % PALETTES.length] };
