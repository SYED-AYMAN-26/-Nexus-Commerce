/** Values shared across the UI. Kept in sync with the server defaults. */
export const BUSINESS = {
  shippingFlatRate: 99,
  freeShippingThreshold: 1999,
  taxRate: 0.18,
  currency: 'INR',
  lowStockThreshold: 10,
  maxQtyPerLineItem: 10,
};

export const ORDER_STATUS = {
  pending: { label: 'Pending', tone: 'warning', description: 'We have received your order' },
  confirmed: { label: 'Confirmed', tone: 'brand', description: 'Payment received and stock reserved' },
  processing: { label: 'Processing', tone: 'brand', description: 'Your items are being packed' },
  shipped: { label: 'Shipped', tone: 'brand', description: 'On the way to you' },
  delivered: { label: 'Delivered', tone: 'success', description: 'Delivered successfully' },
  cancelled: { label: 'Cancelled', tone: 'danger', description: 'This order was cancelled' },
};

export const PAYMENT_STATUS = {
  pending: { label: 'Pending', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export const STOCK_STATUS = {
  in_stock: { label: 'In stock', tone: 'success' },
  low_stock: { label: 'Low stock', tone: 'warning' },
  out_of_stock: { label: 'Out of stock', tone: 'danger' },
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'name-asc', label: 'Name: A to Z' },
];

export const RATING_FILTERS = [
  { value: 4, label: '4★ & above' },
  { value: 3, label: '3★ & above' },
  { value: 2, label: '2★ & above' },
  { value: 1, label: '1★ & above' },
];

export const ORDER_STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/orders', label: 'Orders', icon: 'orders' },
  { to: '/admin/products', label: 'Products', icon: 'box' },
  { to: '/admin/inventory', label: 'Inventory', icon: 'warehouse' },
  { to: '/admin/categories', label: 'Categories', icon: 'tag' },
  { to: '/admin/users', label: 'Customers', icon: 'users' },
  { to: '/admin/reviews', label: 'Reviews', icon: 'star' },
  { to: '/admin/coupons', label: 'Coupons', icon: 'ticket' },
];

export const FOOTER_LINKS = {
  shop: [
    { label: 'All products', to: '/products' },
    { label: 'New arrivals', to: '/products?sort=newest' },
    { label: 'Best sellers', to: '/products?sort=popular' },
    { label: 'Deals & offers', to: '/products?deals=true' },
  ],
  account: [
    { label: 'My account', to: '/account' },
    { label: 'My orders', to: '/account/orders' },
    { label: 'Wishlist', to: '/account/wishlist' },
    { label: 'Addresses', to: '/account/addresses' },
  ],
  help: [
    { label: 'Shipping & delivery', to: '/help#shipping' },
    { label: 'Returns & refunds', to: '/help#returns' },
    { label: 'Payment options', to: '/help#payments' },
    { label: 'Contact support', to: '/help#contact' },
  ],
};
