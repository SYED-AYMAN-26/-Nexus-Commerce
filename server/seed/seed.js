/* eslint-disable no-console */
/**
 * Database seeder.
 *
 *   npm run seed          -> wipe + insert demo catalogue, users, orders, reviews
 *   npm run seed:destroy  -> drop all documents
 *
 * Everything is idempotent: re-running produces the same demo store.
 */
const mongoose = require('mongoose');
const slugify = require('slugify');

const config = require('../config');
const { connectDatabase } = require('../config/database');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const Payment = require('../models/Payment');
const Counter = require('../models/Counter');
const { recalculateProductRating } = require('../models/Review');
const { calculateTotals, round2 } = require('../utils/pricing');
const { categories, products, coupons } = require('./data');

const REVIEW_TEXTS = [
  { rating: 5, title: 'Exactly what I hoped for', comment: 'Arrived two days early and the build quality is genuinely premium. Would buy again without hesitating.' },
  { rating: 4, title: 'Great, with one small caveat', comment: 'Really happy overall - only reason it is not five stars is the packaging was a bit bulky to recycle.' },
  { rating: 5, title: 'Worth every rupee', comment: 'I compared this against two alternatives in the same price bracket and it wins comfortably on finish and performance.' },
  { rating: 4, title: 'Solid daily driver', comment: 'Been using it every day for three weeks now. No complaints at all, and support answered my question within a day.' },
  { rating: 3, title: 'Good but not perfect', comment: 'Does the job well, though I expected slightly better materials at this price point. Functionally it is excellent.' },
  { rating: 5, title: 'Sleek and well made', comment: 'Looks even better in person than in the photos. Colour is accurate to the listing which is rare.' },
  { rating: 4, title: 'Very pleased', comment: 'Comfortable, well packaged, and the description matched reality. Shipping took three days within India.' },
  { rating: 5, title: 'Second one I have bought', comment: 'Bought one for myself last year and got this as a gift. That should tell you everything.' },
];

const FIRST_NAMES = ['Aarav', 'Diya', 'Vihaan', 'Ananya', 'Ishaan', 'Meera', 'Rohan', 'Sara', 'Kabir', 'Aditi', 'Arjun', 'Nisha', 'Dev', 'Priya', 'Rahul', 'Sneha'];
const LAST_NAMES = ['Sharma', 'Iyer', 'Patel', 'Nair', 'Reddy', 'Mehta', 'Kulkarni', 'Banerjee', 'Chopra', 'Rao', 'Verma', 'Menon'];
const CITIES = [
  { city: 'Chennai', state: 'Tamil Nadu', postalCode: '600028' },
  { city: 'Bengaluru', state: 'Karnataka', postalCode: '560095' },
  { city: 'Mumbai', state: 'Maharashtra', postalCode: '400050' },
  { city: 'Hyderabad', state: 'Telangana', postalCode: '500081' },
  { city: 'Pune', state: 'Maharashtra', postalCode: '411014' },
  { city: 'New Delhi', state: 'Delhi', postalCode: '110024' },
];

/** Deterministic pseudo random so repeat seeds look identical. */
let seedState = 42;
function rand() {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}
const pick = (list) => list[Math.floor(rand() * list.length)];
const range = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

function buildAddress(name) {
  const location = pick(CITIES);
  return {
    label: pick(['Home', 'Office', 'Parents']),
    fullName: name,
    phone: `+91 9${range(10, 99)}${range(1000000, 9999999)}`,
    addressLine1: `${range(1, 240)}, ${pick(['Brigade Road', 'MG Road', 'Anna Salai', 'Linking Road', 'Park Street', 'Nehru Nagar'])}, Apt ${range(1, 40)}${String.fromCharCode(65 + range(0, 5))}`,
    addressLine2: pick(['Near Metro Station', 'Behind City Mall', '', 'Opp. Central Park']),
    city: location.city,
    state: location.state,
    postalCode: location.postalCode,
    country: 'India',
    isDefault: true,
  };
}

async function destroy() {
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
    Cart.deleteMany({}),
    Coupon.deleteMany({}),
    Payment.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  console.log('\x1b[33m[seed]\x1b[0m all collections cleared');
}

async function seed() {
  const started = Date.now();
  await destroy();

  /* ------------------------------------------------------------ categories */
  const categoryMap = new Map();
  for (const [index, raw] of categories.entries()) {
    const slug = slugify(raw.name, { lower: true, strict: true });
    const category = await Category.create({
      ...raw,
      slug,
      image: `/api/media/categories/${slug}.svg`,
    });
    categoryMap.set(raw.name, category);
    console.log(`  \x1b[36mcategory\x1b[0m ${index + 1}/${categories.length} ${category.name}`);
  }

  /* -------------------------------------------------------------- products */
  const createdProducts = [];
  for (const [index, raw] of products.entries()) {
    const category = categoryMap.get(raw.category);
    const slug = slugify(raw.name, { lower: true, strict: true });
    const stockFromVariants = raw.variants?.reduce((sum, v) => sum + (v.stock || 0), 0);
    const sku = `NX-${slugify(raw.category, { lower: false, strict: true }).slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`;

    const product = await Product.create({
      name: raw.name,
      slug,
      description: raw.description,
      shortDescription: raw.shortDescription,
      price: raw.price,
      discountPrice: raw.discountPrice || 0,
      images: [0, 1, 2, 3].map((i) => `/api/media/products/${slug}.svg?i=${i}`),
      category: category._id,
      brand: raw.brand,
      SKU: sku,
      stock: stockFromVariants ?? raw.stock,
      variants: (raw.variants || []).map((v, i) => ({
        name: v.name,
        sku: `${sku}-V${i + 1}`,
        color: v.color || '',
        size: v.size || '',
        priceDelta: v.priceDelta || 0,
        stock: v.stock ?? 0,
        isActive: true,
      })),
      specifications: raw.specifications || [],
      tags: raw.tags || [],
      badges: raw.badges || [],
      isFeatured: Boolean(raw.isFeatured),
      isNewArrival: Boolean(raw.isNewArrival),
      sold: range(0, 240),
      views: range(50, 4000),
      // Slight stagger so "Newest" ordering is meaningful
      createdAt: new Date(Date.now() - (products.length - index) * 36 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - (products.length - index) * 12 * 60 * 60 * 1000),
    });
    createdProducts.push(product);
    console.log(`  \x1b[32mproduct \x1b[0m ${index + 1}/${products.length} ${product.name}`);
  }

  /* ----------------------------------------------------------------- users */
  const admin = await User.create({
    name: 'Nexus Admin',
    email: config.seed.adminEmail,
    password: config.seed.adminPassword,
    phone: '+91 9876543210',
    role: 'admin',
    addresses: [buildAddress('Nexus Admin')],
    isActive: true,
  });
  console.log(`  \x1b[35madmin  \x1b[0m ${admin.email}`);

  const customers = [];
  const primaryCustomer = await User.create({
    name: 'Priya Customer',
    email: config.seed.customerEmail,
    password: config.seed.customerPassword,
    phone: '+91 9123456780',
    role: 'user',
    addresses: [buildAddress('Priya Customer'), { ...buildAddress('Priya Customer'), label: 'Office', isDefault: false, city: 'Bengaluru', state: 'Karnataka', postalCode: '560095' }],
  });
  customers.push(primaryCustomer);
  console.log(`  \x1b[35mcustomer\x1b[0m ${primaryCustomer.email}`);

  for (let i = 0; i < 11; i += 1) {
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${pick(LAST_NAMES)}`;
    // eslint-disable-next-line no-await-in-loop
    const user = await User.create({
      name,
      email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}${i}@example.com`,
      password: 'Customer@123',
      phone: `+91 9${range(10, 99)}${range(1000000, 9999999)}`,
      role: 'user',
      addresses: [buildAddress(name)],
    });
    customers.push(user);
  }
  console.log(`  \x1b[35musers  \x1b[0m ${customers.length} customer accounts created`);

  /* --------------------------------------------------------------- coupons */
  for (const coupon of coupons) {
    await Coupon.create({ ...coupon, startsAt: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() + 90 * 86400000) });
  }

  /* ---------------------------------------------------------------- orders */
  const ORDER_STATUS_POOL = [
    'delivered', 'delivered', 'delivered', 'delivered', 'shipped', 'shipped',
    'processing', 'processing', 'confirmed', 'pending', 'cancelled',
  ];
  const PAYMENT_METHODS = ['card', 'upi', 'netbanking', 'card', 'card'];
  const createdOrders = [];

  for (let i = 0; i < 34; i += 1) {
    const user = customers[range(0, customers.length - 1)];
    const orderStatus = ORDER_STATUS_POOL[range(0, ORDER_STATUS_POOL.length - 1)];
    const lineCount = range(1, 3);

    const lines = [];
    for (let l = 0; l < lineCount; l += 1) {
      const product = createdProducts[range(0, createdProducts.length - 1)];
      if (lines.some((existing) => String(existing.product) === String(product._id))) continue;

      const variant = product.variants.length ? product.variants[range(0, product.variants.length - 1)] : null;
      const unitPrice = round2(
        (product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price) + (variant?.priceDelta || 0),
      );

      lines.push({
        product: product._id,
        productDoc: product,
        name: product.name,
        slug: product.slug,
        image: product.images[0],
        sku: variant?.sku || product.SKU,
        variantId: variant?._id || null,
        variantName: variant?.name || '',
        quantity: range(1, 2),
        unitPrice,
        compareAtPrice: product.discountPrice ? product.price : null,
      });
    }
    if (!lines.length) continue;

    const totals = calculateTotals(lines);
    const address = user.addresses[0];
    // Orders are spread over the last 60 days so the dashboard has a real trend
    const daysAgo = range(0, 59);
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - range(0, 23) * 3600000);

    const paymentStatus = orderStatus === 'cancelled' ? pick(['refunded', 'failed']) : 'paid';

    const order = new Order({
      user: user._id,
      items: lines.map((line) => ({
        product: line.product,
        name: line.name,
        slug: line.slug,
        image: line.image,
        sku: line.sku,
        unitPrice: line.unitPrice,
        compareAtPrice: line.compareAtPrice,
        quantity: line.quantity,
        lineTotal: round2(line.unitPrice * line.quantity),
        variantId: line.variantId,
        variantName: line.variantName,
      })),
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      },
      paymentMethod: pick(PAYMENT_METHODS),
      paymentProvider: 'mock',
      paymentStatus,
      orderStatus,
      paymentIntentId: `pi_mock_seed_${i}${Date.now().toString(36)}`,
      transactionId: `txn_seed_${Math.random().toString(36).slice(2, 12)}`,
      paidAt: paymentStatus === 'paid' || paymentStatus === 'refunded' ? createdAt : null,
      refundedAt: paymentStatus === 'refunded' ? new Date(createdAt.getTime() + 86400000) : null,
      refundAmount: paymentStatus === 'refunded' ? totals.total : 0,
      subtotal: totals.subtotal,
      productDiscount: totals.productDiscount,
      discount: totals.discount,
      shipping: totals.shipping,
      tax: totals.tax,
      taxRate: totals.taxRate,
      total: totals.total,
      currency: totals.currency,
      createdAt,
      updatedAt: createdAt,
      deliveredAt: orderStatus === 'delivered' ? new Date(createdAt.getTime() + 3 * 86400000) : null,
      cancelledAt: orderStatus === 'cancelled' ? new Date(createdAt.getTime() + 86400000) : null,
      statusHistory: ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
        .slice(0, Math.max(1, ['pending', 'confirmed', 'processing', 'shipped', 'delivered'].indexOf(orderStatus) + 1))
        .map((status, idx) => ({
          status,
          note: idx === 0 ? 'Order placed' : `Marked ${status}`,
          changedAt: new Date(createdAt.getTime() + idx * 12 * 3600000),
        })),
    });

    if (orderStatus === 'cancelled') {
      order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by customer', changedAt: new Date(createdAt.getTime() + 86400000) });
      order.stockRestored = true;
    }

    // eslint-disable-next-line no-await-in-loop
    await order.save();
    createdOrders.push(order);
  }
  console.log(`  \x1b[32morders \x1b[0m ${createdOrders.length} demo orders created`);

  /* --------------------------------------------------------------- reviews */
  let reviewCount = 0;
  const reviewed = new Set();
  for (const order of createdOrders) {
    if (order.orderStatus !== 'delivered') continue;
    for (const item of order.items) {
      const key = `${order.user}-${item.product}`;
      if (reviewed.has(key)) continue;
      reviewed.add(key);

      const template = REVIEW_TEXTS[range(0, REVIEW_TEXTS.length - 1)];
      // eslint-disable-next-line no-await-in-loop
      await Review.create({
        user: order.user,
        product: item.product,
        order: order._id,
        rating: template.rating,
        title: template.title,
        comment: template.comment,
        isVerifiedPurchase: true,
        createdAt: new Date(order.createdAt.getTime() + 4 * 86400000),
      }).catch(() => {});
      reviewCount += 1;
    }
  }

  // Recalculate every product's rating from the reviews that were inserted
  await Promise.all(createdProducts.map((p) => recalculateProductRating(p._id)));

  // A few products without purchases get seeded ratings so the grid looks alive
  for (const product of createdProducts) {
    // eslint-disable-next-line no-await-in-loop
    const fresh = await Product.findById(product._id).select('numReviews rating');
    if (!fresh.numReviews) {
      const fake = range(3, 5);
      const count = range(4, 26);
      // eslint-disable-next-line no-await-in-loop
      await Product.updateOne(
        { _id: product._id },
        {
          rating: fake,
          numReviews: count,
          ratingBreakdown: { 1: 0, 2: Math.round(count * 0.04), 3: Math.round(count * 0.1), 4: Math.round(count * 0.32), 5: Math.round(count * 0.54) },
        },
      );
    }
  }
  console.log(`  \x1b[33mreviews\x1b[0m ${reviewCount} verified purchase reviews`);

  /* ---------------------------------------------------------- wishlists/cart */
  for (const user of customers.slice(0, 5)) {
    const picks = [createdProducts[range(0, 8)], createdProducts[range(9, 18)], createdProducts[range(18, 27)]];
    // eslint-disable-next-line no-await-in-loop
    await User.updateOne({ _id: user._id }, { $set: { wishlist: picks.filter(Boolean).map((p) => p._id) } });
  }

  const cart = await Cart.create({ user: primaryCustomer._id, items: [] });
  const cartProduct = createdProducts[0];
  cart.items.push({ product: cartProduct._id, variantId: cartProduct.variants[0]?._id || null, variantName: cartProduct.variants[0]?.name || '', quantity: 1 });
  await cart.save();

  /* -------------------------------------------------------------- summary */
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`
\x1b[32m  Seed complete in ${elapsed}s\x1b[0m
  ─────────────────────────────────────────────
  Categories : ${categories.length}
  Products   : ${createdProducts.length}
  Orders     : ${createdOrders.length}
  Reviews    : ${reviewCount}
  Coupons    : ${coupons.length}

  \x1b[1mAdmin sign-in\x1b[0m
    email    : ${config.seed.adminEmail}
    password : ${config.seed.adminPassword}

  \x1b[1mCustomer sign-in\x1b[0m
    email    : ${config.seed.customerEmail}
    password : ${config.seed.customerPassword}
  ─────────────────────────────────────────────
`);
}

(async () => {
  try {
    await connectDatabase();
    if (process.argv.includes('--destroy')) {
      await destroy();
    } else {
      await seed();
    }
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\x1b[31m[seed] failed\x1b[0m', error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
})();
