-- ============================================================
-- Minimal patch to enable broadband items in cart_items.
-- Run this in Supabase SQL Editor if broadband-cart-migration.sql
-- has not been applied yet, or if cart inserts are failing.
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS).
-- ============================================================

-- 1. Make product_id nullable (broadband items have no product_id)
ALTER TABLE cart_items ALTER COLUMN product_id DROP NOT NULL;

-- 2. Add item_type column
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'device'
    CHECK (item_type IN ('device', 'broadband_service'));

-- 3. Add fulfillment_type column
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT NOT NULL DEFAULT 'shipping'
    CHECK (fulfillment_type IN ('shipping', 'installation'));

-- 4. Add display/price snapshot columns
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS unit_price    NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS display_name  TEXT,
  ADD COLUMN IF NOT EXISTS display_summary TEXT;

-- 5. Add broadband_ref as plain TEXT (no FK dependency on user_selections)
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS broadband_ref TEXT;

-- 6. Drop the old unique index that requires product_id to be non-null
DROP INDEX IF EXISTS idx_cart_items_session_product;

-- 7. One broadband service per session
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_session_broadband
  ON cart_items(session_id)
  WHERE item_type = 'broadband_service';

-- ============================================================
-- Extend orders table for split checkout
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'device'
    CHECK (order_type IN ('device', 'service', 'mixed')),
  ADD COLUMN IF NOT EXISTS one_time_total  NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS monthly_total   NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS service_status  TEXT DEFAULT NULL
    CHECK (service_status IN ('pending_appointment', 'appointment_booked', 'installation_scheduled', 'active', 'cancelled', NULL));

-- ============================================================
-- Appointments table
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    session_id          TEXT NOT NULL,
    install_address     TEXT NOT NULL DEFAULT 'TBD',
    install_postcode    TEXT NOT NULL DEFAULT 'TBD',
    preferred_date      DATE,
    preferred_time_slot TEXT CHECK (preferred_time_slot IN ('morning', 'afternoon', 'evening', 'any')),
    confirmed_date      DATE,
    confirmed_time_slot TEXT,
    engineer_name       TEXT,
    engineer_ref        TEXT,
    status              TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'booked', 'confirmed', 'completed', 'cancelled', 'rescheduled')),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_order   ON appointments(order_id);
CREATE INDEX IF NOT EXISTS idx_appointments_session ON appointments(session_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status  ON appointments(status);

-- ============================================================
-- Subscriptions table
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    session_id       TEXT NOT NULL,
    plan_name        TEXT NOT NULL,
    monthly_price    NUMERIC(10, 2) NOT NULL,
    contract_months  INTEGER NOT NULL DEFAULT 24,
    start_date       DATE,
    next_billing_date DATE,
    end_date         DATE,
    status           TEXT NOT NULL DEFAULT 'pending_activation'
      CHECK (status IN ('pending_activation', 'active', 'suspended', 'cancelled', 'expired')),
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_order   ON subscriptions(order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_session ON subscriptions(session_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions(status);

-- ============================================================
-- Checkout sessions table
-- ============================================================
CREATE TABLE IF NOT EXISTS checkout_sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              TEXT NOT NULL UNIQUE,
    has_devices             BOOLEAN DEFAULT false,
    has_broadband_service   BOOLEAN DEFAULT false,
    device_order_id         UUID REFERENCES orders(id) ON DELETE SET NULL,
    service_order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
    device_payment_done     BOOLEAN DEFAULT false,
    appointment_booked      BOOLEAN DEFAULT false,
    device_one_time_total   NUMERIC(10, 2) DEFAULT 0.00,
    broadband_monthly_total NUMERIC(10, 2) DEFAULT 0.00,
    status                  TEXT NOT NULL DEFAULT 'in_progress'
      CHECK (status IN ('in_progress', 'device_paid', 'appointment_pending', 'complete', 'abandoned')),
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_session ON checkout_sessions(session_id);
