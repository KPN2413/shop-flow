# ShopFlow — India-first E-Commerce Platform

A full-stack e-commerce web app built with **Vite + React + TypeScript**, **Supabase** (Postgres + Auth + Edge Functions), and **Tailwind CSS + shadcn/ui**.

---

## Features

- **Supabase Auth** (email/password) with auto-profile creation
- **RLS-protected database** with owner-based row security
- **Role-based access**: `USER` and `ADMIN`
- **Product catalog** with search, filter, sort (INR pricing stored as integer paise)
- **Shopping cart** synced to database per user
- **Server-validated checkout** (Edge Function) — totals computed server-side
- **Payment methods**: COD and MOCK (Razorpay placeholder)
- **Admin dashboard**: manage products, categories, inventory, orders
- **Seed demo data** button in admin dashboard
- Responsive layout (mobile-first)

---

## Local Setup

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd shopflow
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Fill in your Supabase URL and anon key from:
**Supabase Dashboard → Project → Settings → API**

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migrations

Open your Supabase project's **SQL Editor** and run the full migration:

```
supabase/migrations/001_shopflow_schema.sql
```

This creates all tables, RLS policies, triggers, and helper functions.

### 4. Start Dev Server

```bash
bun dev
```

Visit [http://localhost:5173](http://localhost:5173)

---

## Create Admin User

1. Sign up normally through `/signup`
2. Go to **Supabase Dashboard → Table Editor → profiles**
3. Find your user row
4. Change the `role` column value from `USER` to `ADMIN`
5. Sign out and sign back in
6. You'll see "Admin Dashboard" in the navbar dropdown

---

## Supabase Edge Functions

The app uses 3 Edge Functions for server-side operations:

| Function | Purpose |
|---|---|
| `api-checkout` | Server-validates cart, creates order, reduces inventory |
| `api-admin` | Admin CRUD for products, inventory, orders, seed data |
| `admin-products` | Create product (also creates inventory entry) |
| `admin-product-update` | Update/archive products |

### Deploy Edge Functions (if using Supabase CLI)

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref your-project-ref

# Set secrets (service role key for admin writes)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Deploy all functions
supabase functions deploy api-checkout
supabase functions deploy api-admin
supabase functions deploy admin-products
supabase functions deploy admin-product-update
```

---

## Database Schema

### Tables

| Table | Description |
|---|---|
| `profiles` | Extends auth.users with full_name, phone, role |
| `categories` | Product categories (name, slug) |
| `products` | Products with paise pricing, status, visibility |
| `inventory` | Stock per product |
| `cart_items` | Per-user cart (max 10 qty per item) |
| `orders` | Order header (status, totals, payment method) |
| `order_items` | Snapshot of products at time of order |

### Pricing

All prices are stored as **integer paise** (1 Rupee = 100 paise):
- `₹199.00` is stored as `19900`
- Use `formatINR(paise)` utility to display
- Admin form accepts ₹ input, converts to paise on save

### Order Status Flow

```
CREATED → PAID → FULFILLED
       ↘ FAILED
       ↘ CANCELLED
```

### Payment Methods

| Method | Behavior |
|---|---|
| `MOCK` | Instant `PAID` + `SUCCESS` — demo mode |
| `COD` | `CREATED` + `NOT_INITIATED` — pay on delivery |
| `RAZORPAY_PLACEHOLDER` | Reserved for future Razorpay integration |

---

## API Reference (Edge Functions)

All endpoints require `Authorization: Bearer <user-jwt>` header.
Admin endpoints additionally require `role = 'ADMIN'` in profiles.

### Checkout
```
POST /functions/v1/api-checkout
Body: { paymentMethod: "MOCK" | "COD" }
Response: { success: true, data: { orderId, totalPaise, orderStatus, paymentStatus } }
```

### Admin — Products
```
GET    /functions/v1/api-admin/products
POST   /functions/v1/api-admin/products
PATCH  /functions/v1/api-admin/products/{id}
```

### Admin — Inventory
```
POST /functions/v1/api-admin/inventory/{productId}
Body: { stock: number }
```

### Admin — Seed Data
```
POST /functions/v1/api-admin/seed
# Inserts 3 categories + 10 demo products with inventory
```

---

## Deploy

### Blink (Recommended)
Click **Publish** in the Blink editor. Handles build and hosting automatically.

### Netlify / Vercel
```bash
bun run build
# Deploy the /dist folder
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in your hosting platform.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Routing | TanStack Router |
| Data fetching | Supabase JS SDK + React Query |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase Postgres (via Supabase JS) |
| Auth | Supabase Auth (email/password) |
| Fonts | Space Grotesk + DM Sans |
