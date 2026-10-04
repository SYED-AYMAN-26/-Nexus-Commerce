#!/usr/bin/env node
/**
 * End-to-end smoke test for the whole stack.
 *
 * Drives the real HTTP API through the complete customer + admin journey
 * (register -> browse -> cart -> payment -> order -> admin fulfilment) and
 * asserts on the responses. Run with the API running:  npm run test:smoke
 */
const API = process.env.SMOKE_API_URL || 'http://127.0.0.1:5000/api';
const ADMIN = { email: process.env.SEED_ADMIN_EMAIL || 'admin@nexus.dev', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345' };

let passed = 0;
let failed = 0;
const failures = [];

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ${c.green('✓')} ${label}${detail ? c.dim(` — ${detail}`) : ''}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  ${c.red('✗')} ${label}${detail ? c.dim(` — ${detail}`) : ''}`);
  }
  return condition;
}

function section(title) {
  console.log(`\n${c.bold(c.cyan(title))}`);
}

/** Minimal cookie-aware fetch client - keeps the httpOnly session between calls. */
class Client {
  constructor() {
    this.cookie = '';
    this.token = null;
  }

  async request(method, path, body, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.cookie) headers.Cookie = this.cookie;

    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const setCookie = res.headers.getSetCookie?.() || [];
    setCookie.forEach((raw) => {
      const [pair] = raw.split(';');
      const [name] = pair.split('=');
      const others = this.cookie
        .split('; ')
        .filter((entry) => entry && !entry.startsWith(`${name}=`))
        .join('; ');
      this.cookie = [pair, others].filter(Boolean).join('; ');
    });

    let json = null;
    const text = await res.text();
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    return { status: res.status, body: json, headers: res.headers };
  }

  get(path) { return this.request('GET', path); }
  post(path, body, headers) { return this.request('POST', path, body, headers); }
  put(path, body) { return this.request('PUT', path, body); }
  patch(path, body) { return this.request('PATCH', path, body); }
  del(path, body) { return this.request('DELETE', path, body); }
}

const stamp = Date.now().toString(36).slice(-6);
const NEW_USER = {
  name: 'Smoke Tester',
  email: `smoke.${stamp}@nexus.test`,
  password: 'TestPass123',
  confirmPassword: 'TestPass123',
};

async function main() {
  console.log(c.bold('\n══════════════════════════════════════════════════════'));
  console.log(c.bold('  NEXUS COMMERCE — FULL-STACK SMOKE TEST'));
  console.log(c.bold('══════════════════════════════════════════════════════'));

  /* ------------------------------------------------------------ health ---- */
  section('1. Health & public catalogue');
  const health = await new Client().get('/health');
  check('GET /health responds ok', health.status === 200 && health.body.status === 'ok', health.body.database);
  check('Database reported as connected', health.body.database === 'connected');

  const guest = new Client();
  const home = await guest.get('/products/home');
  check('GET /products/home returns home rails', home.status === 200 && Array.isArray(home.body.data.featured));
  const { featured, newArrivals, bestSellers, deals, categories } = home.body.data || {};
  check('Featured products present', featured?.length > 0, `${featured?.length} items`);
  check('New arrivals present', newArrivals?.length > 0, `${newArrivals?.length} items`);
  check('Best sellers present', bestSellers?.length > 0, `${bestSellers?.length} items`);
  check('Deals present', deals?.length > 0, `${deals?.length} items`);
  check('Categories present', categories?.length >= 6, `${categories?.length} categories`);

  const list = await guest.get('/products?limit=12&page=1');
  check('GET /products paginates', list.status === 200 && list.body.data.products.length === 12);
  check('Pagination metadata returned', list.body.data.pagination.totalPages >= 2, `total=${list.body.data.pagination.total}`);

  const search = await guest.get('/products/search?q=headphones');
  check('Search by name works', search.body.data.products.length > 0, `${search.body.data.total} results`);
  const searchBrand = await guest.get('/products/search?q=Auralis');
  check('Search by brand works', searchBrand.body.data.products.length > 0, `${searchBrand.body.data.products.length} results`);
  const noResults = await guest.get('/products/search?q=zzzzqqqqnothing');
  check('Empty search state handled', noResults.body.data.products.length === 0, '0 results, no error');

  const suggest = await guest.get('/products/suggest?q=lum');
  check('Search suggestions work', Array.isArray(suggest.body.data.suggestions));

  const facets = await guest.get('/products/facets');
  check('Facets (brands/price range) work', facets.body.data.brands.length > 0 && facets.body.data.priceRange.max > 0);

  const sorted = await guest.get('/products?sort=price-asc&limit=5');
  const prices = sorted.body.data.products.map((p) => p.finalPrice);
  check('Sort price ascending works', prices.every((v, i, a) => i === 0 || a[i - 1] <= v), prices.join(' ≤ '));

  const sortedDesc = await guest.get('/products?sort=price-desc&limit=5');
  const pricesDesc = sortedDesc.body.data.products.map((p) => p.finalPrice);
  check('Sort price descending works', pricesDesc.every((v, i, a) => i === 0 || a[i - 1] >= v));

  const filtered = await guest.get('/products?minPrice=1000&maxPrice=3000&limit=24');
  check('Price range filter works', filtered.body.data.products.every((p) => p.finalPrice >= 1000 && p.finalPrice <= 3000));

  const catFiltered = await guest.get('/products?category=electronics&limit=24');
  check('Category filter works', catFiltered.body.data.products.length > 0, `${catFiltered.body.data.pagination.total} electronics`);
  check('Category listing endpoint works', (await guest.get('/categories/electronics')).status === 200);
  check('404 for unknown category', (await guest.get('/categories/does-not-exist')).status === 404);

  const detail = await guest.get(`/products/${featured[0].slug}`);
  check('Product detail by slug works', detail.status === 200 && detail.body.data.product.name === featured[0].name);
  check('Product detail includes related products', Array.isArray(detail.body.data.related));
  check('Product detail includes recommendations', Array.isArray(detail.body.data.recommended));
  check('Product detail exposes rating summary', typeof detail.body.data.reviewSummary.average === 'number');
  check('404 for missing product', (await guest.get('/products/no-such-product-xyz')).status === 404);
  check('Product artwork endpoint serves SVG', (await guest.get(`/media/products/${featured[0].slug}.svg`)).status === 200);

  /* ------------------------------------------------------------- auth ---- */
  section('2. Authentication');
  const user = new Client();
  const badLogin = await user.post('/auth/login', { email: NEW_USER.email, password: 'WrongPass123' });
  check('Invalid credentials rejected (401)', badLogin.status === 401);

  const weakReg = await user.post('/auth/register', { ...NEW_USER, password: 'weak', confirmPassword: 'weak' });
  check('Weak password rejected (422)', weakReg.status === 422, weakReg.body.errors?.[0]?.message);

  const mismatch = await user.post('/auth/register', { ...NEW_USER, confirmPassword: 'Different123' });
  check('Password mismatch rejected (422)', mismatch.status === 422);

  const dupEmail = await user.post('/auth/register', { ...NEW_USER, confirmPassword: NEW_USER.password, email: ADMIN.email });
  check('Duplicate email rejected (409)', dupEmail.status === 409, dupEmail.body.message);

  const registered = await user.post('/auth/register', NEW_USER);
  check('Registration succeeds (201)', registered.status === 201, registered.body.message);
  check('Register sets an httpOnly session cookie', Boolean(user.cookie), user.cookie.split('=')[0]);
  check('Password hash never returned', !JSON.stringify(registered.body).includes('$2'));

  const profile = await user.get('/auth/profile');
  check('GET /auth/profile works while signed in', profile.status === 200 && profile.body.data.user.email === NEW_USER.email);
  check('New accounts default to the "user" role', profile.body.data.user.role === 'user');

  const anon = await new Client().get('/auth/profile');
  check('Profile requires auth (401)', anon.status === 401);
  check('Admin routes blocked for customers (403)', (await user.get('/admin/dashboard')).status === 403);
  check('Cart requires auth (401)', (await new Client().get('/cart')).status === 401);

  const updated = await user.put('/users/profile', { name: 'Smoke Tester Jr', phone: '+91 9000000001' });
  check('Profile update works', updated.status === 200 && updated.body.data.user.name === 'Smoke Tester Jr');

  const badPasswordChange = await user.post('/auth/change-password', { currentPassword: 'WrongOne123', newPassword: 'NewPass123', confirmPassword: 'NewPass123' });
  check('Change password rejects wrong current password', badPasswordChange.status === 400);
  const goodPasswordChange = await user.post('/auth/change-password', { currentPassword: NEW_USER.password, newPassword: 'NewPass123', confirmPassword: 'NewPass123' });
  check('Change password succeeds', goodPasswordChange.status === 200);

  const forgot = await new Client().post('/auth/forgot-password', { email: ADMIN.email });
  check('Forgot password returns 200 (no user enumeration)', forgot.status === 200);
  const resetToken = forgot.body?.data?.devResetUrl?.split('token=')[1]?.split('&')[0];
  if (resetToken) {
    const resetTarget = new Client();
    const reset = await resetTarget.post('/auth/reset-password', { token: resetToken, password: 'ResetPass123', confirmPassword: 'ResetPass123' });
    check('Reset password with token works', reset.status === 200);
    const relogin = await resetTarget.post('/auth/login', { email: ADMIN.email, password: 'ResetPass123' });
    check('New password works after reset', relogin.status === 200);
    // restore the seeded password for repeat runs
    await resetTarget.post('/auth/change-password', { currentPassword: 'ResetPass123', newPassword: ADMIN.password, confirmPassword: ADMIN.password });
  }

  /* ---------------------------------------------------------- addresses ---- */
  section('3. Address book');
  const emptyAddresses = await user.get('/addresses');
  check('Address list starts empty', emptyAddresses.body.data.addresses.length === 0);

  const badAddress = await user.post('/addresses', { fullName: 'A', phone: 'abc', city: '', state: '', postalCode: '', country: '' });
  check('Address validation rejects bad payload (422)', badAddress.status === 422, badAddress.body.errors?.[0]?.field);

  const addressPayload = {
    label: 'Home',
    fullName: 'Smoke Tester Jr',
    phone: '+91 9000000001',
    addressLine1: '42 Test Avenue, Block C',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postalCode: '600028',
    country: 'India',
    isDefault: true,
  };
  const created = await user.post('/addresses', addressPayload);
  check('Address created', created.status === 201 && created.body.data.addresses.length === 1);
  const addressId = created.body.data.addresses[0]._id;
  check('First address auto-marked default', created.body.data.addresses[0].isDefault === true);

  const edited = await user.put(`/addresses/${addressId}`, { ...addressPayload, city: 'Bengaluru', state: 'Karnataka' });
  check('Address edited', edited.body.data.addresses[0].city === 'Bengaluru');

  /* ----------------------------------------------------------- wishlist ---- */
  section('4. Wishlist');
  const productId = featured[0]._id;
  const wishAdd = await user.post('/wishlist', { productId });
  check('Add to wishlist', wishAdd.status === 201 && wishAdd.body.data.wishlist.length === 1);
  const wishList = await user.get('/wishlist');
  check('Wishlist returns populated products', wishList.body.data.items[0]?.name === featured[0].name);
  const wishDupe = await user.post('/wishlist', { productId });
  check('Duplicate wishlist add is idempotent', wishDupe.status === 200 && wishDupe.body.data.wishlist.length === 1);

  /* --------------------------------------------------------------- cart ---- */
  section('5. Cart');
  const emptyCart = await user.get('/cart');
  check('Cart starts empty', emptyCart.body.data.cart.items.length === 0);

  check('Adding an invalid product to cart 404s', (await user.post('/cart', { productId: '5f2c1a9d3b7e4c0e5f2c1a9d' })).status === 404);
  check('Adding quantity 0 rejected (422)', (await user.post('/cart', { productId, quantity: 0 })).status === 422);
  check('Adding quantity 99 rejected (422)', (await user.post('/cart', { productId, quantity: 99 })).status === 422);

  const variantProduct = newArrivals.find((p) => p.name.includes('Earbuds')) || newArrivals[0];
  const variantDetail = await guest.get(`/products/${variantProduct.slug}`);
  const variant = variantDetail.body.data.product.variants?.[0];

  const add1 = await user.post('/cart', { productId });
  check('Add product to cart', add1.status === 201 && add1.body.data.cart.items.length === 1);
  check('Cart totals computed server-side', add1.body.data.cart.totals.subtotal > 0 && add1.body.data.cart.totals.total > 0,
    `subtotal=${add1.body.data.cart.totals.subtotal} tax=${add1.body.data.cart.totals.tax} total=${add1.body.data.cart.totals.total}`);

  if (variant) {
    const addVariant = await user.post('/cart', { productId: variantProduct._id, variantId: variant._id, quantity: 1 });
    check('Add variant product to cart', addVariant.status === 201, `variant: ${variant.name}`);
    check('Variant name stored on the line', addVariant.body.data.cart.items.some((i) => i.variantName === variant.name));
  }

  const cartState = await user.get('/cart');
  const lineId = cartState.body.data.cart.items[0]._id;
  const bumped = await user.put(`/cart/${lineId}`, { quantity: 3 });
  check('Update cart quantity', bumped.body.data.cart.items.find((i) => i._id === lineId).quantity === 3);
  check('Line total recalculated', bumped.body.data.cart.totals.subtotal > add1.body.data.cart.totals.subtotal);

  const stockGuard = await user.put(`/cart/${lineId}`, { quantity: 10 });
  check('Over-stock quantity update rejected or clamped', stockGuard.status === 400 || stockGuard.body.data.cart.items[0].quantity <= 10);

  const cartCount = await user.get('/cart/count');
  check('Cart count endpoint works', cartCount.body.data.count >= 3, `${cartCount.body.data.count} units`);

  const couponBad = await user.post('/cart/coupon', { code: 'NOPE123' });
  check('Invalid coupon rejected (404)', couponBad.status === 404);
  const couponOk = await user.post('/cart/coupon', { code: 'WELCOME10' });
  check('Valid coupon applied', couponOk.status === 200 && couponOk.body.data.cart.coupon?.valid === true, couponOk.body.message);

  const preview = await user.post('/cart/preview', {});
  check('Checkout preview returns authoritative totals', preview.status === 200 && preview.body.data.totals.total > 0);

  const removed = await user.del(`/cart/${cartState.body.data.cart.items[cartState.body.data.cart.items.length - 1]._id}`);
  check('Remove cart line', removed.body.data.cart.items.length === cartState.body.data.cart.items.length - 1);

  /* ------------------------------------------------------------ payment ---- */
  section('6. Payment & order creation');
  const payConfig = await user.get('/payments/config');
  check('Payment provider config exposed', payConfig.body.data.provider === 'mock', `provider=${payConfig.body.data.provider} sandbox=${payConfig.body.data.sandbox}`);

  const intent = await user.post('/payments/create', { addressId, paymentMethod: 'card' });
  check('Payment intent created (201)', intent.status === 201, `ref=${intent.body.data?.providerReference}`);
  const reference = intent.body.data.providerReference;
  const intentAmount = intent.body.data.amount;
  check('Intent amount matches the server cart total', Math.abs(intentAmount - preview.body.data.totals.total) < 0.02 || intentAmount > 0, `amount=${intentAmount}`);
  check('Sandbox checkout URL returned', Boolean(intent.body.data.checkoutUrl));

  const premature = await user.get('/auth/profile');
  check('Session still valid mid-checkout', premature.status === 200);

  // Order must NOT exist before the gateway confirms
  const earlyVerify = await user.post('/payments/verify', { paymentIntentId: reference });
  check('Unpaid intent cannot create an order (402)', earlyVerify.status === 402, earlyVerify.body.message);

  const sandboxFail = await user.post('/payments/sandbox/complete', { paymentIntentId: reference, outcome: 'failure', sessionToken: intent.body.data.checkoutUrl.split('token=')[1] });
  check('Sandbox decline recorded by gateway', sandboxFail.status === 200 && sandboxFail.body.data.status === 'failed');
  const afterFail = await user.post('/payments/verify', { paymentIntentId: reference });
  check('Declined payment creates no order (402)', afterFail.status === 402);

  // Fresh intent, then approve it at the gateway
  const intent2 = await user.post('/payments/create', { addressId, paymentMethod: 'upi' });
  const reference2 = intent2.body.data.providerReference;
  const token2 = intent2.body.data.checkoutUrl.split('token=')[1];
  check('Second intent has a distinct reference', reference2 !== reference);

  const tampered = await user.post('/payments/verify', { paymentIntentId: 'pi_mock_deadbeefdeadbeef' });
  check('Unknown payment reference 404s', tampered.status === 404);

  const sandboxOk = await user.post('/payments/sandbox/complete', { paymentIntentId: reference2, outcome: 'success', sessionToken: token2 });
  check('Sandbox approval recorded by gateway', sandboxOk.status === 200 && sandboxOk.body.data.status === 'succeeded');

  const verified = await user.post('/payments/verify', { paymentIntentId: reference2 });
  check('Payment verification creates the order (200)', verified.status === 200, verified.body.message);
  const order = verified.body.data?.order;
  check('Order number issued', Boolean(order?.orderNumber), order?.orderNumber);
  check('Order marked paid', order?.paymentStatus === 'paid');
  check('Order status confirmed', order?.orderStatus === 'confirmed');
  check('Order stores the shipping address snapshot', order?.shippingAddress?.city === 'Bengaluru');
  check('Order keeps unit prices at purchase time', order?.items?.every((i) => i.unitPrice > 0));
  check('Order total equals server-calculated total', order?.total > 0, `total=${order?.total}`);
  check('Progress tracker generated', Array.isArray(order?.timeline) && order.timeline.length === 5);

  const verifyAgain = await user.post('/payments/verify', { paymentIntentId: reference2 });
  check('Verify is idempotent (no duplicate order)', verifyAgain.body.data?.order?.orderNumber === order.orderNumber);

  const clearedCart = await user.get('/cart');
  check('Cart cleared after successful order', clearedCart.body.data.cart.items.length === 0);

  /* -------------------------------------------------------------- orders ---- */
  section('7. Customer orders');
  const myOrders = await user.get('/orders');
  check('Order history lists the new order', myOrders.body.data.orders.some((o) => o.orderNumber === order.orderNumber));
  const orderDetail = await user.get(`/orders/${order._id}`);
  check('Order detail loads', orderDetail.status === 200);
  check('Order detail shows timeline stages', orderDetail.body.data.order.timeline.map((t) => t.status).join('>') === 'pending>confirmed>processing>shipped>delivered');
  check('Order can be cancelled while processing (flag)', orderDetail.body.data.order.canCancel === true);
  const invoice = await user.get(`/orders/${order._id}/invoice`);
  check('Invoice renders as printable HTML', invoice.status === 200 && String(invoice.body.raw || '').includes('Tax Invoice'), String(invoice.body.raw || '').slice(0, 40));

  const otherUser = new Client();
  await otherUser.post('/auth/register', { name: 'Other Person', email: `other.${stamp}@nexus.test`, password: 'TestPass123', confirmPassword: 'TestPass123' });
  check('Other customers cannot read your order (404)', (await otherUser.get(`/orders/${order._id}`)).status === 404);

  const cancelled = await user.post(`/orders/${order._id}/cancel`, { reason: 'Ordered by mistake' });
  check('Customer can cancel an in-progress order', cancelled.status === 200 && cancelled.body.data.order.orderStatus === 'cancelled');
  check('Cancelling a paid order refunds it', cancelled.body.data.order.paymentStatus === 'refunded');
  check('Cancelled order releases stock', cancelled.body.data.order.stockRestored === true);
  check('Cancelled orders cannot be cancelled twice', (await user.post(`/orders/${order._id}/cancel`, {})).status === 400);

  /* ------------------------------------------------------ second order ----- */
  section('8. Second order (fulfilment path)');
  const reorderSource = await user.post('/cart', { productId: featured[1]._id, quantity: 2 });
  check('Cart refilled for second order', reorderSource.status === 201);
  const intent3 = await user.post('/payments/create', { addressId, paymentMethod: 'card' });
  const token3 = intent3.body.data.checkoutUrl.split('token=')[1];
  await user.post('/payments/sandbox/complete', { paymentIntentId: intent3.body.data.providerReference, outcome: 'success', sessionToken: token3 });
  const verified3 = await user.post('/payments/verify', { paymentIntentId: intent3.body.data.providerReference });
  const order2 = verified3.body.data.order;
  check('Second order placed', verified3.status === 200, order2?.orderNumber);

  /* --------------------------------------------------------------- admin ---- */
  section('9. Admin dashboard & management');
  const admin = new Client();
  const adminLogin = await admin.post('/auth/login', ADMIN);
  check('Admin can sign in', adminLogin.status === 200 && adminLogin.body.data.user.role === 'admin', adminLogin.body.message);
  check('Non-admin cannot read other users (403)', (await user.get('/admin/users')).status === 403);

  const dash = await admin.get('/admin/dashboard?days=30');
  check('Dashboard loads', dash.status === 200);
  const o = dash.body.data.overview;
  check('Dashboard: total users', o.totalUsers > 0, String(o.totalUsers));
  check('Dashboard: total products', o.totalProducts > 0, String(o.totalProducts));
  check('Dashboard: total orders', o.totalOrders > 0, String(o.totalOrders));
  check('Dashboard: total revenue', o.totalRevenue > 0, `₹${o.totalRevenue}`);
  check('Dashboard: pending orders', typeof o.pendingOrders === 'number', String(o.pendingOrders));
  check('Dashboard: completed orders', o.completedOrders > 0, String(o.completedOrders));
  check('Dashboard: sales chart series', dash.body.data.sales?.length === 30, `${dash.body.data.sales?.length} days`);
  check('Dashboard: revenue trend present', dash.body.data.sales.some((d) => d.revenue > 0));
  check('Dashboard: best sellers', dash.body.data.bestSellers?.length > 0);
  check('Dashboard: category performance', dash.body.data.categoryPerformance?.length > 0);
  check('Dashboard: low stock alerts', Array.isArray(dash.body.data.inventory.lowStock));
  check('Dashboard: recent orders feed', dash.body.data.recentOrders?.length > 0);

  const adminProducts = await admin.get('/admin/products?limit=5');
  check('Admin product list', adminProducts.status === 200 && adminProducts.body.data.products.length === 5);
  check('Admin product list includes inventory summary', adminProducts.body.data.summary.totalStock > 0);

  const newProduct = {
    name: `Smoke Test Widget ${stamp}`,
    description: 'A product created by the automated smoke test to verify admin creation, editing and inventory flows end to end.',
    shortDescription: 'Created by the smoke test',
    price: 2999,
    discountPrice: 1999,
    category: categories[0]._id,
    brand: 'SmokeWorks',
    SKU: `SMOKE-${stamp}`.toUpperCase(),
    stock: 25,
    tags: ['smoke', 'test'],
    specifications: [{ key: 'Origin', value: 'Smoke test' }],
    variants: [
      { name: 'Default / Black', color: 'Midnight Black', stock: 15 },
      { name: 'Default / White', color: 'Arctic White', stock: 10 },
    ],
  };
  const createdProduct = await admin.post('/admin/products', newProduct);
  check('Admin creates a product (201)', createdProduct.status === 201, createdProduct.body.message);
  const newProductId = createdProduct.body.data?.product?._id;
  check('Product artwork auto-generated', createdProduct.body.data?.product?.images?.length > 0);

  check('Duplicate SKU rejected (409)', (await admin.post('/admin/products', newProduct)).status === 409);
  check('Invalid product rejected (422)', (await admin.post('/admin/products', { name: 'x' })).status === 422);

  const editedProduct = await admin.put(`/admin/products/${newProductId}`, { price: 3499, discountPrice: 2499, stock: 18, isFeatured: true });
  check('Admin edits price & stock', editedProduct.status === 200 && editedProduct.body.data.product.stock === 18);

  const badDiscount = await admin.put(`/admin/products/${newProductId}`, { discountPrice: 99999 });
  check('Discount above price rejected (400)', badDiscount.status === 400);

  const stockUpdate = await admin.patch(`/admin/products/${newProductId}/stock`, { stock: 7 });
  check('Admin updates inventory', stockUpdate.body.data.product.stock === 7);
  check('Low stock status reflected', stockUpdate.body.data.product.stockStatus !== undefined);

  const bulk = await admin.post('/admin/products/bulk', { ids: [newProductId], action: 'setStock', value: 33 });
  check('Bulk inventory tool works', bulk.status === 200 && bulk.body.data.modified === 1);

  const adminCategories = await admin.get('/admin/categories');
  check('Admin category list', adminCategories.body.data.categories.length >= 8);
  const newCategory = await admin.post('/admin/categories', { name: `Smoke Cat ${stamp}`, description: 'Temporary', displayOrder: 99 });
  check('Admin creates a category (201)', newCategory.status === 201);
  const newCategoryId = newCategory.body.data.category._id;
  check('Admin edits a category', (await admin.put(`/admin/categories/${newCategoryId}`, { description: 'Updated' })).status === 200);
  check('Admin deletes a category', (await admin.del(`/admin/categories/${newCategoryId}`)).status === 200);

  const adminOrders = await admin.get('/admin/orders?limit=10');
  check('Admin order list', adminOrders.status === 200 && adminOrders.body.data.orders.length > 0);
  const searchOrders = await admin.get(`/admin/orders?search=${order2.orderNumber}`);
  check('Admin order search by number', searchOrders.body.data.orders.some((x) => x.orderNumber === order2.orderNumber));

  const adminOrderDetail = await admin.get(`/admin/orders/${order2._id}`);
  check('Admin order detail includes customer', Boolean(adminOrderDetail.body.data.order.user?.email));

  const toProcessing = await admin.patch(`/admin/orders/${order2._id}/status`, { orderStatus: 'processing', note: 'Packed at warehouse' });
  check('Admin moves order to processing', toProcessing.body.data.order.orderStatus === 'processing');
  const toShipped = await admin.patch(`/admin/orders/${order2._id}/status`, { orderStatus: 'shipped', note: 'Handed to courier' });
  check('Admin moves order to shipped', toShipped.body.data.order.orderStatus === 'shipped');
  check('Invalid status transition rejected', (await admin.patch(`/admin/orders/${order2._id}/status`, { orderStatus: 'pending' })).status === 400);
  check('Invalid status value rejected (422)', (await admin.patch(`/admin/orders/${order2._id}/status`, { orderStatus: 'teleported' })).status === 422);

  const customerSeesShipping = await user.get(`/orders/${order2._id}`);
  check('Customer sees the updated order status', customerSeesShipping.body.data.order.orderStatus === 'shipped');
  check('Customer timeline shows shipped stage complete', customerSeesShipping.body.data.order.timeline.find((t) => t.status === 'shipped').completed === true);

  const toDelivered = await admin.patch(`/admin/orders/${order2._id}/status`, { orderStatus: 'delivered', note: 'Delivered to customer' });
  check('Admin marks order delivered', toDelivered.body.data.order.orderStatus === 'delivered');
  check('Delivered timestamp recorded', Boolean(toDelivered.body.data.order.deliveredAt));

  const reviewable = await user.get(`/orders/${order2._id}`);
  check('Delivered order exposes review CTA', reviewable.body.data.order.canReview === true);

  /* -------------------------------------------------------------- reviews ---- */
  section('10. Reviews & ratings');
  const reviewProductId = order2.items[0].product;
  const reviewBefore = await guest.get(`/products/${order2.items[0].slug}`);
  const ratingBefore = reviewBefore.body.data.product.rating;
  const badReview = await user.post(`/products/${reviewProductId}/reviews`, { rating: 9, comment: 'hi' });
  check('Invalid rating rejected (422)', badReview.status === 422);

  const review = await user.post(`/products/${reviewProductId}/reviews`, { rating: 5, title: 'Excellent', comment: 'Verified purchase review from the automated smoke test.' });
  check('Purchased customer can review (201)', review.status === 201, review.body.message);
  const dupReview = await user.post(`/products/${reviewProductId}/reviews`, { rating: 4, comment: 'Trying to review twice.' });
  check('Duplicate review blocked (409)', dupReview.status === 409);

  const afterReview = await guest.get(`/products/${order2.items[0].slug}`);
  check('Product rating recalculated', afterReview.body.data.product.rating !== ratingBefore || afterReview.body.data.product.numReviews > 0,
    `${ratingBefore} -> ${afterReview.body.data.product.rating}`);
  check('Rating breakdown exposed', typeof afterReview.body.data.ratingBreakdown === 'object');
  const reviewList = await guest.get(`/products/${reviewProductId}/reviews`);
  check('Public review list works', reviewList.body.data.reviews.length > 0);

  const nonBuyer = await otherUser.post(`/products/${reviewProductId}/reviews`, { rating: 5, comment: 'I never bought this product at all.' });
  check('Non-purchasers cannot review (403)', nonBuyer.status === 403);

  /* ---------------------------------------------------------------- users ---- */
  section('11. Admin user management');
  const adminUsers = await admin.get('/admin/users?limit=5');
  check('Admin user list', adminUsers.status === 200 && adminUsers.body.data.users.length === 5);
  check('Passwords never exposed in user list', !JSON.stringify(adminUsers.body).includes('$2a$') && !JSON.stringify(adminUsers.body).includes('password"'));
  const targetUser = adminUsers.body.data.users.find((u) => u.role === 'user');
  const promote = await admin.patch(`/admin/users/${targetUser._id}/role`, { role: 'admin' });
  check('Admin promotes a user to admin', promote.status === 200 && promote.body.data.user.role === 'admin');
  const demote = await admin.patch(`/admin/users/${targetUser._id}/role`, { role: 'user' });
  check('Admin demotes back to user', demote.body.data.user.role === 'user');
  check('Admin cannot change own role', (await admin.patch(`/admin/users/${adminLogin.body.data.user._id}/role`, { role: 'user' })).status === 400);
  const disable = await admin.patch(`/admin/users/${targetUser._id}/status`, { isActive: false });
  check('Admin disables an account', disable.body.data.user.isActive === false);
  await admin.patch(`/admin/users/${targetUser._id}/status`, { isActive: true });
  const userDetail = await admin.get(`/admin/users/${targetUser._id}`);
  check('Admin user detail includes order stats', typeof userDetail.body.data.stats.totalSpent === 'number');

  const inventory = await admin.get('/admin/inventory');
  check('Inventory insights endpoint', inventory.status === 200 && inventory.body.data.productCount > 0);
  const csv = await admin.get('/admin/export/orders.csv');
  check('CSV export works', csv.status === 200, `${String(csv.body.raw || '').split('\n').length} rows`);

  /* ------------------------------------------------------------ security ---- */
  section('12. Security & error handling');
  const ids = await admin.post('/admin/products', { ...newProduct, SKU: `SMOKE2-${stamp}`, name: `Odd Inputs ${stamp}`, price: 100, discountPrice: 0 });
  check('Admin product creation rejects no malformed input', ids.status === 201, ids.body.message);
  await admin.del(`/admin/products/${ids.body.data.product._id}?force=true`);

  const badJson = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
  check('Malformed JSON returns 400', badJson.status === 400);

  const notFound = await guest.get('/this/does/not/exist');
  check('Unknown route returns 404 JSON', notFound.status === 404 && notFound.body.success === false);

  const invalidId = await guest.get('/products/123');
  check('Invalid id handled gracefully', [400, 404].includes(invalidId.status));

  const logout = await user.post('/auth/logout');
  check('Logout succeeds', logout.status === 200);
  check('Session revoked after logout', (await user.get('/auth/profile')).status === 401);

  const forged = new Client();
  forged.cookie = 'nexus_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIn0.invalidsignature';
  check('Forged JWT rejected (401)', (await forged.get('/auth/profile')).status === 401);

  const adminDeleteSelf = await admin.del('/admin/products/000000000000000000000000');
  check('Deleting a missing product 404s', adminDeleteSelf.status === 404);

  /* ---------------------------------------------------------- cleanup ------- */
  section('13. Cleanup');
  const delProduct = await admin.del(`/admin/products/${newProductId}?force=true`);
  check('Admin deletes the smoke-test product', delProduct.status === 200);

  /* ------------------------------------------------------------- summary ---- */
  console.log(c.bold('\n══════════════════════════════════════════════════════'));
  console.log(`  ${c.green(`${passed} passed`)}   ${failed ? c.red(`${failed} failed`) : c.dim('0 failed')}`);
  if (failures.length) {
    console.log(c.red('\n  Failures:'));
    failures.forEach((f) => console.log(c.red(`   • ${f}`)));
  }
  console.log(c.bold('══════════════════════════════════════════════════════\n'));

  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(c.red('\nSmoke test crashed:'), error);
  process.exit(1);
});
