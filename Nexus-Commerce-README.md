# Nexus Commerce

A full-stack e-commerce platform built with **React, Vite, Tailwind CSS, Node.js, Express, and MongoDB**.

Nexus Commerce provides a complete shopping experience for customers and a role-protected administration dashboard for managing products, inventory, orders, users, reviews, categories, and coupons.

## ✨ Features

### Customer Storefront
- Responsive e-commerce storefront
- Product browsing and category pages
- Product search
- Product details with variants
- Product gallery and reviews
- Shopping cart and cart drawer
- Wishlist
- Address management
- Checkout flow
- Order confirmation and order history
- Help and error pages

### Authentication & Accounts
- User registration and login
- Protected routes
- JWT-based authentication
- Secure authentication cookies
- Forgot-password flow
- Password reset flow
- Customer profile management
- Saved addresses
- Customer order history
- Customer reviews

### Admin Dashboard
- Admin-only protected routes
- Dashboard and store statistics
- Product management
- Add/edit product forms
- Category management
- Inventory management
- Order management
- Order detail pages
- User management
- Review management
- Coupon management
- Product media/upload support

### Payments
- Built-in mock/sandbox payment provider for local development
- Optional Stripe integration
- Payment callback handling
- Webhook signature verification
- Configurable payment provider

### Backend & Security
- REST API with Express
- MongoDB with Mongoose
- Request validation with `express-validator`
- JWT authentication
- Password hashing with `bcryptjs`
- Helmet security headers
- CORS configuration
- API rate limiting
- HTTP compression
- Centralized error handling
- Request logging with Morgan
- Graceful server/database shutdown

## 🛠️ Tech Stack

### Frontend
- React 18
- React Router 6
- Vite
- Tailwind CSS
- Axios

### Backend
- Node.js 18+
- Express.js
- Mongoose
- MongoDB
- JWT
- bcryptjs
- Stripe (optional)
- express-validator
- Helmet
- CORS
- Morgan
- Compression
- Express Rate Limit

## 📁 Project Structure

```text
ecommerce/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   └── user/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite configuration
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── seed/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── scripts/
├── .env.example
├── package.json
└── README.md
```

## ⚙️ Requirements

Before running the project, install:

- **Node.js 18 or newer**
- **npm**
- **MongoDB** running locally, or a MongoDB Atlas connection
- Git (optional, for version control)

Check Node.js and npm:

```bash
node -v
npm -v
```

## 🚀 Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd ecommerce
```

Install both frontend and backend dependencies:

```bash
npm run install:all
```

If you prefer to install them separately:

```bash
cd server
npm install

cd ../client
npm install

cd ..
```

## 🔐 Environment Configuration

Create the root environment file:

```bash
copy .env.example .env
```

For the frontend:

```bash
copy client\.env.example client\.env
```

### Important environment variables

The default local configuration uses:

```env
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000

MONGO_URI=mongodb://127.0.0.1:27017/nexus_commerce

PAYMENT_PROVIDER=mock
CURRENCY=INR
```

The included mock payment provider allows the application to run locally without a Stripe account.

> **Security:** Never commit real `.env` files, JWT secrets, Stripe keys, database passwords, or other credentials to GitHub.

## 🗄️ Database Setup

Make sure MongoDB is running.

The application uses:

```text
mongodb://127.0.0.1:27017/nexus_commerce
```

By default.

You can use MongoDB Community Server locally or change `MONGO_URI` to a MongoDB Atlas connection string.

## 🌱 Seed Demo Data

After MongoDB is running, populate the database:

```bash
npm run seed
```

The seed process creates demo categories, products, users, and related catalogue data.

Default demo credentials from `.env.example` are:

### Admin

```text
Email: admin@nexus.dev
Password: Admin@12345
```

### Customer

```text
Email: customer@nexus.dev
Password: Customer@123
```

**Change these credentials before using the project outside local development.**

## ▶️ Run the Application

### Recommended development command

From the project root:

```bash
npm run dev
```

This starts:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:5000
```

The API is available under:

```text
http://localhost:5000/api
```

API documentation:

```text
http://localhost:5000/api/docs
```

Health check:

```text
http://localhost:5000/api/health
```

### Run frontend and backend separately

Frontend:

```bash
npm run dev:client
```

Backend:

```bash
npm run dev:server
```

Or:

```bash
cd client
npm run dev
```

and in another terminal:

```bash
cd server
npm run dev
```

## 🪟 Windows Note

The repository contains MongoDB start/stop scripts that use Bash:

```bash
npm run db:start
npm run db:stop
```

On Windows, these commands may not work if Bash is unavailable.

If MongoDB is already installed as a Windows service, start MongoDB using Windows Services or your MongoDB installation, then run:

```bash
npm run seed
npm run dev
```

## 💳 Payment Configuration

### Mock Payment Provider

The default provider is:

```env
PAYMENT_PROVIDER=mock
```

This is intended for local development and testing.

### Stripe

To use Stripe, configure:

```env
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

Use Stripe test credentials while developing.

## 🧪 Available Scripts

From the project root:

| Command | Description |
|---|---|
| `npm run install:all` | Install frontend and backend dependencies |
| `npm run dev` | Start frontend and backend together |
| `npm run dev:server` | Start Express API |
| `npm run dev:client` | Start React/Vite frontend |
| `npm run build` | Build the frontend |
| `npm run start` | Start the backend |
| `npm run seed` | Seed demo database data |
| `npm run seed:destroy` | Remove seeded data |
| `npm run test:smoke` | Run smoke tests |
| `npm run lint` | Lint frontend and backend |

Backend commands:

```bash
cd server
npm run dev
npm start
npm run seed
npm run seed:destroy
npm run lint
```

Frontend commands:

```bash
cd client
npm run dev
npm run build
npm run preview
npm run lint
```

## 🔒 Authentication Flow

Nexus Commerce uses JWT authentication with protected routes.

Customer routes such as:

```text
/checkout
/account
/account/orders
/account/wishlist
/account/addresses
```

require authentication.

Admin routes such as:

```text
/admin
/admin/products
/admin/orders
/admin/inventory
/admin/users
/admin/reviews
/admin/coupons
```

require an authenticated administrator account.

## 🛒 Main Application Routes

### Store

```text
/
/products
/product/:slug
/search
/categories
/category/:slug
/cart
/checkout
```

### Authentication

```text
/login
/register
/forgot-password
/reset-password
```

### Customer Account

```text
/account
/account/edit
/account/orders
/account/orders/:orderId
/account/wishlist
/account/addresses
/account/reviews
```

### Admin

```text
/admin
/admin/orders
/admin/orders/:orderId
/admin/products
/admin/products/new
/admin/products/:productId/edit
/admin/inventory
/admin/categories
/admin/users
/admin/reviews
/admin/coupons
```

## 🧩 Backend Architecture

The server follows a layered structure:

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Models
  ↓
MongoDB
```

Supporting layers include:

- Middleware for authentication, validation, rate limiting, and errors
- Validators for request validation
- Utility functions for tokens, pricing, media, and queries
- Payment services for mock and Stripe providers

## 📦 Main Data Models

The backend includes models for:

- User
- Product
- Category
- Cart
- Order
- Payment
- Review
- Coupon
- Address-related data
- Counters

## 📸 Product Media

Product images can be served through the backend upload directory:

```text
server/public/uploads/
```

The API exposes uploaded media through:

```text
/uploads
```

The demo seed data is designed to work without requiring a large collection of binary image files.

## 🏗️ Production Build

Build the React frontend:

```bash
npm run build
```

The generated frontend is placed in:

```text
client/dist/
```

When running the backend in production, the Express application can serve the built SPA from `client/dist`.

Set:

```env
NODE_ENV=production
```

and provide real production environment variables and secrets.

## 🧹 Reset Demo Data

To destroy seeded data:

```bash
npm run seed:destroy
```

Then seed it again:

```bash
npm run seed
```

> Use destructive database commands only against a development/test database.

## 🔐 Production Checklist

Before deploying:

- [ ] Replace all default JWT secrets
- [ ] Replace demo admin/customer passwords
- [ ] Use a production MongoDB database
- [ ] Set `NODE_ENV=production`
- [ ] Configure HTTPS
- [ ] Set `COOKIE_SECURE=true`
- [ ] Configure production CORS origins
- [ ] Configure Stripe production/test credentials as appropriate
- [ ] Configure webhook secrets
- [ ] Review rate limits
- [ ] Remove or change all development credentials
- [ ] Never commit `.env` files
- [ ] Verify uploaded media storage and backups

## 📌 Project Status

Nexus Commerce is a full-stack e-commerce project designed for development, demonstration, and further production hardening.

The project can be extended with features such as:

- Real shipping-provider integration
- Additional payment gateways
- Product recommendations
- Advanced analytics
- Email notifications
- Cloud image storage
- Automated tests
- CI/CD deployment
- Product reviews moderation workflows

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Test the application.
5. Commit your changes:

```bash
git add .
git commit -m "Add your feature"
```

6. Push the branch:

```bash
git push origin feature/your-feature
```

7. Open a pull request.

## 📄 License

Add the project's license here if one is selected.

---

**Nexus Commerce** — A modern full-stack e-commerce platform built with React, Express, MongoDB, and Node.js.
