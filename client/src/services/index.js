import api, { unwrap } from './api';

/* ------------------------------------------------------------------- auth */
export const authApi = {
  register: (payload) => unwrap(api.post('/auth/register', payload)),
  login: (payload) => unwrap(api.post('/auth/login', payload)),
  logout: () => unwrap(api.post('/auth/logout')),
  profile: () => unwrap(api.get('/auth/profile')),
  refresh: () => unwrap(api.post('/auth/refresh')),
  forgotPassword: (email) => unwrap(api.post('/auth/forgot-password', { email })),
  resetPassword: (payload) => unwrap(api.post('/auth/reset-password', payload)),
  changePassword: (payload) => unwrap(api.post('/auth/change-password', payload)),
  checkEmail: (email) => unwrap(api.get('/auth/check-email', { params: { email } })),
  updateProfile: (payload) => unwrap(api.put('/users/profile', payload)),
  stats: () => unwrap(api.get('/users/stats')),
};

/* --------------------------------------------------------------- products */
export const productApi = {
  list: (params) => unwrap(api.get('/products', { params })),
  home: () => unwrap(api.get('/products/home')),
  facets: () => unwrap(api.get('/products/facets')),
  search: (params) => unwrap(api.get('/products/search', { params })),
  suggest: (q, limit = 6) => unwrap(api.get('/products/suggest', { params: { q, limit } })),
  detail: (idOrSlug) => unwrap(api.get(`/products/${idOrSlug}`)),
  reviews: (productId, params) => unwrap(api.get(`/products/${productId}/reviews`, { params })),
  createReview: (productId, payload) => unwrap(api.post(`/products/${productId}/reviews`, payload)),
  deleteReview: (productId, reviewId) => unwrap(api.delete(`/products/${productId}/reviews/${reviewId}`)),
  myReviews: () => unwrap(api.get('/reviews/my')),
  categories: () => unwrap(api.get('/categories')),
  category: (slug) => unwrap(api.get(`/categories/${slug}`)),
};

/* ------------------------------------------------------------------- cart */
export const cartApi = {
  get: () => unwrap(api.get('/cart')),
  add: (payload) => unwrap(api.post('/cart', payload)),
  update: (itemId, quantity) => unwrap(api.put(`/cart/${itemId}`, { quantity })),
  remove: (itemId) => unwrap(api.delete(`/cart/${itemId}`)),
  clear: () => unwrap(api.delete('/cart')),
  count: () => unwrap(api.get('/cart/count')),
  merge: (items) => unwrap(api.post('/cart/merge', { items })),
  preview: () => unwrap(api.post('/cart/preview', {})),
  applyCoupon: (code) => unwrap(api.post('/cart/coupon', { code })),
  removeCoupon: () => unwrap(api.delete('/cart/coupon')),
};

/* --------------------------------------------------------------- wishlist */
export const wishlistApi = {
  list: () => unwrap(api.get('/wishlist')),
  add: (productId) => unwrap(api.post('/wishlist', { productId })),
  remove: (productId) => unwrap(api.delete(`/wishlist/${productId}`)),
  clear: () => unwrap(api.delete('/wishlist')),
};

/* -------------------------------------------------------------- addresses */
export const addressApi = {
  list: () => unwrap(api.get('/addresses')),
  create: (payload) => unwrap(api.post('/addresses', payload)),
  update: (id, payload) => unwrap(api.put(`/addresses/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/addresses/${id}`)),
  setDefault: (id) => unwrap(api.patch(`/addresses/${id}/default`)),
};

/* ---------------------------------------------------------------- payment */
export const paymentApi = {
  config: () => unwrap(api.get('/payments/config')),
  create: (payload) => unwrap(api.post('/payments/create', payload)),
  sandboxComplete: (payload) => unwrap(api.post('/payments/sandbox/complete', payload)),
  verify: (paymentIntentId) => unwrap(api.post('/payments/verify', { paymentIntentId })),
  status: (reference) => unwrap(api.get(`/payments/${reference}`)),
  refund: (orderId) => unwrap(api.post(`/payments/orders/${orderId}/refund`)),
};

/* ----------------------------------------------------------------- orders */
export const orderApi = {
  list: (params) => unwrap(api.get('/orders', { params })),
  detail: (id) => unwrap(api.get(`/orders/${id}`)),
  cancel: (id, reason) => unwrap(api.post(`/orders/${id}/cancel`, { reason })),
  reorder: (id) => unwrap(api.post(`/orders/${id}/reorder`)),
  validateStock: () => unwrap(api.get('/orders/validate-stock')),
  invoiceUrl: (id) => `${api.defaults.baseURL}/orders/${id}/invoice`,
};

/* ------------------------------------------------------------------ admin */
export const adminApi = {
  dashboard: (days = 30) => unwrap(api.get('/admin/dashboard', { params: { days } })),
  sales: (days = 30) => unwrap(api.get('/admin/stats/sales', { params: { days } })),

  products: (params) => unwrap(api.get('/admin/products', { params })),
  product: (id) => unwrap(api.get(`/admin/products/${id}`)),
  createProduct: (payload) => unwrap(api.post('/admin/products', payload)),
  updateProduct: (id, payload) => unwrap(api.put(`/admin/products/${id}`, payload)),
  deleteProduct: (id, force = false) => unwrap(api.delete(`/admin/products/${id}`, { params: force ? { force: true } : {} })),
  updateStock: (id, payload) => unwrap(api.patch(`/admin/products/${id}/stock`, payload)),
  bulkProducts: (payload) => unwrap(api.post('/admin/products/bulk', payload)),

  categories: () => unwrap(api.get('/admin/categories')),
  createCategory: (payload) => unwrap(api.post('/admin/categories', payload)),
  updateCategory: (id, payload) => unwrap(api.put(`/admin/categories/${id}`, payload)),
  deleteCategory: (id, force = false) => unwrap(api.delete(`/admin/categories/${id}`, { params: force ? { force: true } : {} })),

  orders: (params) => unwrap(api.get('/admin/orders', { params })),
  order: (id) => unwrap(api.get(`/admin/orders/${id}`)),
  updateOrderStatus: (id, payload) => unwrap(api.patch(`/admin/orders/${id}/status`, payload)),
  updatePaymentStatus: (id, payload) => unwrap(api.patch(`/admin/orders/${id}/payment-status`, payload)),
  refundOrder: (id, amount) => unwrap(api.post(`/admin/orders/${id}/refund`, { amount })),
  cancelOrder: (id, reason) => unwrap(api.post(`/admin/orders/${id}/cancel`, { reason })),

  users: (params) => unwrap(api.get('/admin/users', { params })),
  user: (id) => unwrap(api.get(`/admin/users/${id}`)),
  updateUserRole: (id, role) => unwrap(api.patch(`/admin/users/${id}/role`, { role })),
  updateUserStatus: (id, isActive) => unwrap(api.patch(`/admin/users/${id}/status`, { isActive })),

  reviews: (params) => unwrap(api.get('/admin/reviews', { params })),
  moderateReview: (id, payload) => unwrap(api.patch(`/admin/reviews/${id}`, payload)),
  deleteReview: (id) => unwrap(api.delete(`/admin/reviews/${id}`)),

  coupons: () => unwrap(api.get('/admin/coupons')),
  createCoupon: (payload) => unwrap(api.post('/admin/coupons', payload)),
  updateCoupon: (id, payload) => unwrap(api.put(`/admin/coupons/${id}`, payload)),
  deleteCoupon: (id) => unwrap(api.delete(`/admin/coupons/${id}`)),

  inventory: () => unwrap(api.get('/admin/inventory')),
  updateInventory: (productId, payload) => unwrap(api.patch(`/admin/inventory/${productId}`, payload)),
};

export { api };
