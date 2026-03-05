-- ============================================================
-- Migration: Add shipping_address to orders
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Example shape stored:
-- {
--   "full_name": "Priya Sharma",
--   "phone": "9876543210",
--   "line1": "42, MG Road",
--   "line2": "Near Metro Station",   -- optional
--   "city": "Bengaluru",
--   "state": "Karnataka",
--   "pincode": "560001"
-- }

COMMENT ON COLUMN orders.shipping_address IS
  'JSON shipping address snapshot captured at checkout time';
