-- ============================================================
-- Migration: Coupons & Discount Codes
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Coupons table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,           -- e.g. "SAVE10", "FLAT50"
  type         TEXT NOT NULL CHECK (type IN ('PERCENT', 'FLAT')),
  value        INTEGER NOT NULL CHECK (value > 0),
                -- PERCENT: 1-100 (percentage off), FLAT: paise off (e.g. 5000 = ₹50)
  min_order_paise  INTEGER NOT NULL DEFAULT 0, -- minimum cart value to apply
  max_uses     INTEGER,                        -- NULL = unlimited
  uses_count   INTEGER NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ,                    -- NULL = never expires
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- RLS: public can read active coupons (needed to validate at checkout)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active coupons"
  ON coupons FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'ADMIN'
    )
  );

-- ── Add discount columns to orders ──────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_code      TEXT,
  ADD COLUMN IF NOT EXISTS discount_paise   INTEGER NOT NULL DEFAULT 0;

-- ── Seed some example coupons (optional — remove if not needed) ──────────────
INSERT INTO coupons (code, type, value, min_order_paise, max_uses, expires_at)
VALUES
  ('WELCOME10', 'PERCENT', 10, 0,     NULL, NULL),   -- 10% off, always valid
  ('FLAT50',    'FLAT',  5000, 19900, 100,  NULL),   -- ₹50 off orders above ₹199
  ('SAVE20',    'PERCENT', 20, 49900, 50,   NULL)    -- 20% off orders above ₹499
ON CONFLICT (code) DO NOTHING;
