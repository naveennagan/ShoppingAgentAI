-- ============================================================
-- Checkout & Billing Enhancements Migration
-- Run this AFTER broadband-cart-migration.sql / cart-broadband-patch.sql
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================

-- 1. Add customer detail columns to checkout_sessions
ALTER TABLE checkout_sessions
  ADD COLUMN IF NOT EXISTS customer_name    TEXT,
  ADD COLUMN IF NOT EXISTS customer_email   TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone   TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- 2. Add cart_item_id to appointments (links appointment to specific broadband cart item)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS cart_item_id TEXT;

-- 3. Add plan_name to subscriptions (for bills table display)
--    Existing rows that already have plan_name (from broadband-cart-migration) are unaffected.
--    This handles the case where the column doesn't exist yet.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'Broadband Plan';
