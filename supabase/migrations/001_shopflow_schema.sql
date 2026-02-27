-- ============================================================
-- ShopFlow Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- -----------------------------------------------
-- TABLES
-- -----------------------------------------------

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_paise INTEGER NOT NULL CHECK (price_paise >= 0),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')),
  visibility TEXT NOT NULL DEFAULT 'HIDDEN' CHECK (visibility IN ('PUBLIC', 'HIDDEN')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_visibility ON products(visibility);
CREATE INDEX IF NOT EXISTS idx_products_status_visibility ON products(status, visibility);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL CHECK (qty > 0 AND qty <= 10),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'PAID', 'FAILED', 'CANCELLED', 'FULFILLED')),
  total_paise INTEGER NOT NULL CHECK (total_paise >= 0),
  payment_method TEXT NOT NULL DEFAULT 'MOCK' CHECK (payment_method IN ('COD', 'MOCK', 'RAZORPAY_PLACEHOLDER')),
  payment_status TEXT NOT NULL DEFAULT 'NOT_INITIATED' CHECK (payment_status IN ('NOT_INITIATED', 'PENDING', 'SUCCESS', 'FAILED')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  title_snapshot TEXT NOT NULL,
  price_paise_snapshot INTEGER NOT NULL CHECK (price_paise_snapshot >= 0),
  qty INTEGER NOT NULL CHECK (qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);


-- -----------------------------------------------
-- AUTO-CREATE PROFILE ON SIGNUP
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'USER'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- -----------------------------------------------
-- UPDATED_AT TRIGGER
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_products_updated_at ON products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_inventory_updated_at ON inventory;
CREATE TRIGGER set_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- -----------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;


-- PROFILES
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'ADMIN'
    )
  );


-- CATEGORIES (public read, admin write)
CREATE POLICY "Public can read categories"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );


-- PRODUCTS
CREATE POLICY "Public can read active visible products"
  ON products FOR SELECT USING (
    (status = 'ACTIVE' AND visibility = 'PUBLIC')
    OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );


-- INVENTORY
CREATE POLICY "Public can read inventory"
  ON inventory FOR SELECT USING (true);

CREATE POLICY "Admins can manage inventory"
  ON inventory FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- Allow service role to update inventory (for checkout edge function)
-- Service role bypasses RLS by default


-- -----------------------------------------------
-- SAFE STOCK DECREMENT FUNCTION (used by checkout)
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id UUID, p_qty INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $
BEGIN
  UPDATE inventory
  SET stock = GREATEST(0, stock - p_qty),
      updated_at = now()
  WHERE product_id = p_product_id
    AND stock >= p_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;
END;
$;


-- CART ITEMS
CREATE POLICY "Users can manage their own cart"
  ON cart_items FOR ALL USING (auth.uid() = user_id);


-- ORDERS
CREATE POLICY "Users can read their own orders"
  ON orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all orders"
  ON orders FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );


-- ORDER ITEMS
CREATE POLICY "Users can read their own order items"
  ON order_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items for their orders"
  ON order_items FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all order items"
  ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );
