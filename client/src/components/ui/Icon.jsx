/**
 * Inline SVG icon set (stroke based, 24x24 grid, currentColor).
 * Bundling icons as paths keeps the app dependency-free and works offline.
 */
const PATHS = {
  /* navigation & chrome */
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M10 21v-6h4v6',
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M18 6 6 18M6 6l12 12',
  chevronDown: 'm6 9 6 6 6-6',
  chevronUp: 'm18 15-6-6-6 6',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronRight: 'm9 18 6-6-6-6',
  arrowRight: 'M5 12h14m-6-6 6 6-6 6',
  arrowLeft: 'M19 12H5m6 6-6-6 6-6',
  arrowUp: 'M12 19V5m-6 6 6-6 6 6',
  externalLink: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
  filter: 'M4 6h16M7 12h10M10 18h4',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',

  /* commerce */
  cart: 'M3 4h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6.5M9 21h.01M17 21h.01',
  bag: 'M6 7h12l1.5 13H4.5L6 7Zm3 0V5.5a3 3 0 0 1 6 0V7',
  heart: 'M12 20.5s-7.5-4.7-7.5-10.3A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.8c0 5.6-7.5 10.3-7.5 10.3Z',
  star: 'm12 3.6 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6L3.2 10l6.1-.9L12 3.6Z',
  tag: 'M20.6 13.4 12 22l-9-9 8.6-8.6H20a.6.6 0 0 1 .6.6v8.4ZM16.5 8h.01',
  ticket: 'M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Zm11-2v12',
  creditCard: 'M2 7.5A2.5 2.5 0 0 1 4.5 5h15A2.5 2.5 0 0 1 22 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 16.5v-9ZM2 10h20M6 15h4',
  wallet: 'M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1M3 7.5V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1M3 7.5h17M16 14h2',
  truck: 'M3 7h10v9H3zM13 10h4l4 3.5V16h-8M6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  receipt: 'M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3Zm3 5h8M8 12h8M8 16h5',
  percent: 'M19 5 5 19M7.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm9 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  box: 'm12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v18m8-13.5-8 4.5-8-4.5',
  warehouse: 'M3 21V9l9-6 9 6v12M8 21v-6h8v6M3 21h18',
  package: 'M16 4h2.5L21 9v11H3V9l2.5-5H8m8 0H8m8 0v3H8V4m-5 5h18',

  /* account & people */
  user: 'M12 12.5a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5ZM4 21a8 8 0 0 1 16 0',
  users: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0M17 13a3.5 3.5 0 0 0 0-7M18 21h3a5 5 0 0 0-3-4.6',
  logIn: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  logOut: 'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9',
  shield: 'M12 22s8-3.2 8-10V5.5L12 2 4 5.5V12c0 6.8 8 10 8 10Z',
  lock: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z',
  key: 'M15 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 4H3m3 0v3m3-3v2',
  mapPin: 'M12 22s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',

  /* status & feedback */
  check: 'm5 13 4 4 10-10',
  checkCircle: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-4.2-3.2-5.6 5.6L9 12',
  alertCircle: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7.5v5M12 16h.01',
  alertTriangle: 'M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01',
  info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v5M12 8h.01',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3.5 2',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13h10l1-13M10 11v6M14 11v6',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Zm10 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  eyeOff: 'M3 3l18 18M10.6 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 6 10 6s-1 1.7-2.9 3.4M6.3 7.9C3.9 9.6 2 12 2 12s3.6 6 10 6c1.4 0 2.7-.3 3.8-.7M9.9 10.1a3 3 0 0 0 4.2 4.2',
  copy: 'M8 8V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3M5 8h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5a8 8 0 0 0-.14-1.5l2-1.5-2-3.4-2.3 1a8 8 0 0 0-2.6-1.5L14.5 3h-4l-.46 2.6a8 8 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a8.2 8.2 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 2.6 1.5L10.5 21h4l.46-2.6a8 8 0 0 0 2.6-1.5l2.3 1 2-3.4-2-1.5c.09-.5.14-1 .14-1.5Z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  trendingUp: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  trendingDown: 'M3 7l6 6 4-4 8 8M15 17h6v-6',
  activity: 'M3 12h4l3 8 4-16 3 8h4',
  dashboard: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
  orders: 'M8 4h8a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Zm1 5h6M9 13h4',
  image: 'M4 4h16v16H4zM4 15l4-4 5 5M14 13l2.5-2.5L20 14M9.5 9h.01',
  sparkles: 'm12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Zm7 10 .8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  gift: 'M4 11h16v10H4zM2 7h20v4H2zM12 7v14M12 7S10.5 3 8 3a2 2 0 0 0 0 4h4Zm0 0s1.5-4 4-4a2 2 0 0 1 0 4h-4Z',
  mail: 'M3 6.5h18v11H3zM3.5 7l8.5 6 8.5-6',
  phone: 'M7 3h3l2 5-2.5 1.5a12 12 0 0 0 5 5L16 12l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3h1Z',
  truckFast: 'M2 8h11v8H2zM13 11h4l4 3.5V16h-8M5.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10.5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM4 5h9',
  rotate: 'M3 12a9 9 0 0 1 15.5-6.2M21 4v5h-5M21 12a9 9 0 0 1-15.5 6.2M3 20v-5h5',
  headphones: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2Zm16 0a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2Z',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12H8',
  send: 'm22 2-7 20-4-9-9-4 20-7Zm0 0L11 13',
  moreVertical: 'M12 6h.01M12 12h.01M12 18h.01',
  loader: 'M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8',
};

export function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.75, filled = false, ...rest }) {
  // Accept both camelCase and kebab-case names (e.g. "alertTriangle" or "alert-triangle").
  const key = name ? name.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase()) : name;
  const path = PATHS[key] || PATHS[name] || PATHS.info;
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={path} />
    </svg>
  );
}

export const StarIcon = ({ filled, className = 'h-4 w-4', ...rest }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...rest}>
    <path
      d="m12 3.6 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6L3.2 10l6.1-.9L12 3.6Z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export const Spinner = ({ className = 'h-5 w-5', label = 'Loading' }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" role="status" aria-label={label}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.2" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>
);

export const Logo = ({ className = 'h-8 w-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="nexus-logo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="11" fill="url(#nexus-logo)" />
    <path d="M12 28V12l16 16V12" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export default Icon;
