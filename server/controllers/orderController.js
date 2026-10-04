const Order = require('../models/Order');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const orderService = require('../services/orderService');
const { parsePagination, buildPaginationMeta, escapeRegex } = require('../utils/query');

const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const decorateOrder = (order) => {
  const plain = order.toObject ? order.toObject({ virtuals: true }) : order;
  const timeline = STATUS_FLOW.map((status, index) => ({
    status,
    label: orderService.STATUS_LABELS[status],
    completed: order.orderStatus === 'cancelled' ? false : index <= STATUS_FLOW.indexOf(order.orderStatus),
    current: order.orderStatus === status,
    at: (order.statusHistory || []).find((h) => h.status === status)?.changedAt || null,
  }));

  return {
    ...plain,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    timeline,
    canCancel: order.canBeCancelled(),
    canReview: order.orderStatus === 'delivered' && order.items.some((item) => !item.reviewed),
  };
};

/** GET /api/orders - the signed-in customer's order history */
const listMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { limit: 10 });
  const filter = { user: req.user._id };

  if (req.query.orderStatus) filter.orderStatus = req.query.orderStatus;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ orderNumber: rx }, { 'items.name': rx }];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort('-createdAt').skip(skip).limit(limit).lean({ virtuals: true }),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      orders: orders.map((o) => ({
        ...o,
        itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
        timelineStage: STATUS_FLOW.indexOf(o.orderStatus),
        canCancel: ['pending', 'confirmed', 'processing'].includes(o.orderStatus),
      })),
      pagination: buildPaginationMeta({ page, limit, total }),
      summary: {
        totalOrders: total,
      },
    },
  });
});

/** GET /api/orders/:id */
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).populate('items.product', 'name slug images');
  if (!order) throw ApiError.notFound('Order not found');

  res.json({ success: true, data: { order: decorateOrder(order) } });
});

/** GET /api/orders/number/:orderNumber - lookup by the human readable number */
const getOrderByNumber = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber.toUpperCase() });
  if (!order) throw ApiError.notFound('Order not found');
  if (String(order.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('This order does not belong to your account');
  }
  res.json({ success: true, data: { order: decorateOrder(order) } });
});

/**
 * POST /api/orders
 * Orders are normally created by the payment verification step. This endpoint
 * exists so a COD/manual flow can be added later - it refuses to run without a
 * verified payment intent.
 */
const createOrder = asyncHandler(async (req, res) => {
  throw ApiError.badRequest(
    'Orders are created automatically once the payment is verified. Start a payment to place your order.',
    { code: 'PAYMENT_REQUIRED' },
  );
});

/** POST /api/orders/:id/cancel */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');

  await orderService.cancelOrder(order, {
    reason: req.body.reason || 'Cancelled by customer',
    changedBy: req.user._id,
    restoreStock: true,
  });

  res.json({ success: true, message: 'Order cancelled. Any payment taken will be refunded.', data: { order: decorateOrder(order) } });
});

/** GET /api/orders/:id/invoice - printable HTML invoice */
const getInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');

  const money = (value) => `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const rows = order.items
    .map(
      (item) => `<tr>
        <td>${item.name}${item.variantName ? ` <span class="muted">(${item.variantName})</span>` : ''}<br><span class="muted">${item.sku}</span></td>
        <td class="center">${item.quantity}</td>
        <td class="right">${money(item.unitPrice)}</td>
        <td class="right">${money(item.lineTotal)}</td>
      </tr>`,
    )
    .join('');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${order.invoiceNumber}</title>
<style>
  :root{--ink:#0f172a;--muted:#64748b;--line:#e2e8f0}
  *{box-sizing:border-box}
  body{font:14px/1.5 ui-sans-serif,system-ui,Segoe UI,sans-serif;color:var(--ink);margin:0;padding:40px;background:#f8fafc}
  .sheet{max-width:820px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:16px;padding:40px}
  h1{margin:0;font-size:22px}
  .muted{color:var(--muted);font-size:12px}
  .head{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid var(--line);padding-bottom:20px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th,td{padding:10px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
  .right{text-align:right}.center{text-align:center}
  .totals{margin-top:18px;margin-left:auto;width:280px}
  .totals div{display:flex;justify-content:space-between;padding:6px 0}
  .totals .grand{border-top:2px solid var(--ink);margin-top:8px;padding-top:10px;font-weight:700;font-size:16px}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:600}
  @media print{body{background:#fff;padding:0}.sheet{border:0}}
</style></head>
<body><div class="sheet">
  <div class="head">
    <div><h1>Nexus Commerce</h1><div class="muted">Tax Invoice</div></div>
    <div style="text-align:right">
      <div><strong>${order.invoiceNumber}</strong></div>
      <div class="muted">Order ${order.orderNumber}</div>
      <div class="muted">${new Date(order.createdAt).toLocaleString('en-IN')}</div>
      <div class="badge">${order.paymentStatus.toUpperCase()}</div>
    </div>
  </div>
  <div class="grid">
    <div><div class="muted">BILL TO</div>
      <strong>${order.shippingAddress.fullName}</strong><br>
      ${order.shippingAddress.addressLine1}<br>
      ${order.shippingAddress.addressLine2 ? `${order.shippingAddress.addressLine2}<br>` : ''}
      ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br>
      ${order.shippingAddress.country}<br>${order.shippingAddress.phone}
    </div>
    <div><div class="muted">PAYMENT</div>
      Method: ${order.paymentMethod}<br>
      Provider: ${order.paymentProvider}<br>
      Reference: ${order.transactionId || '-'}<br>
      Status: ${order.orderStatus.toUpperCase()}
    </div>
  </div>
  <table><thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th><th class="right">Amount</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="totals">
    <div><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
    ${order.discount > 0 ? `<div><span>Discount</span><span>-${money(order.discount)}</span></div>` : ''}
    <div><span>Shipping</span><span>${order.shipping === 0 ? 'FREE' : money(order.shipping)}</span></div>
    <div><span>Tax (${Math.round(order.taxRate * 100)}%)</span><span>${money(order.tax)}</span></div>
    <div class="grand"><span>Total</span><span>${money(order.total)}</span></div>
  </div>
  <p class="muted" style="margin-top:32px">Thank you for shopping with Nexus Commerce. For support email support@nexuscommerce.dev</p>
</div></body></html>`);
});

/** Reorder: copy a past order's still-available items back into the cart */
const reorder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');

  const cartService = require('../services/cartService');
  const added = [];
  const skipped = [];

  for (const item of order.items) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await cartService.addItem(req.user._id, {
        productId: item.product,
        quantity: item.quantity,
        variantId: item.variantId || null,
      });
      added.push(item.name);
    } catch {
      skipped.push(item.name);
    }
  }

  if (!added.length) throw ApiError.badRequest('None of the items from this order are currently available');

  const cart = await cartService.getOrCreateCart(req.user._id);
  const payload = await cartService.buildCartPayload(cart);

  res.json({
    success: true,
    message: skipped.length ? `${added.length} item(s) added. ${skipped.length} unavailable.` : 'Items added back to your cart',
    data: { cart: payload, added, skipped },
  });
});

/** POST /api/orders/validate-stock - pre-checkout stock validation */
const validateStock = asyncHandler(async (req, res) => {
  const cartService = require('../services/cartService');
  const { lines, totals } = await cartService.getCheckoutLines(req.user._id);
  const productIds = lines.map((l) => l.product);
  const products = await Product.find({ _id: { $in: productIds } }).select('name stock images').lean();

  res.json({
    success: true,
    data: {
      valid: true,
      items: lines.map((l) => ({ name: l.name, quantity: l.quantity, unitPrice: l.unitPrice })),
      totals,
      productsChecked: products.length,
    },
  });
});

module.exports = {
  listMyOrders,
  getOrder,
  getOrderByNumber,
  createOrder,
  cancelOrder,
  getInvoice,
  reorder,
  validateStock,
  decorateOrder,
};
