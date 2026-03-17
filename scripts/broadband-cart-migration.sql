-- ============================================================
-- Unified Cart + Split Checkout Migration
-- Run this AFTER schema.sql and broadband-schema.sql
-- ============================================================
-- Design principle:
--   One cart holds both device items and broadband service items.
--   At checkout the cart is split into two sub-orders:
--     1. device_order   → one-time payment + shipping
--     2. service_order  → appointment booking + monthly subscription
-- ============================================================

-- ============================================================
-- 1. EXTEND cart_items
--    item_type        : 'device' | 'broadband_service'
--    fulfillment_type : 'shipping' | 'installation'
--    broadband_ref    : links to user_selections for service items
--    unit_price       : snapshot of price at time of adding to cart
-- ============================================================
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS item_type        TEXT NOT NULL DEFAULT 'device'
    CHECK (item_type IN ('device', 'broadband_service')),
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT NOT NULL DEFAULT 'shipping'
    CHECK (fulfillment_type IN ('shipping', 'installation')),
  ADD COLUMN IF NOT EXISTS broadband_ref    UUID REFERENCES user_selections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_price       NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS display_name     TEXT,
  ADD COLUMN IF NOT EXISTS display_summary  TEXT;

-- broadband service items don't need a product_id — make it nullable
-- (Supabase/Postgres: drop NOT NULL constraint)
ALTER TABLE cart_items ALTER COLUMN product_id DROP NOT NULL;

-- drop the old unique index (session+product) — doesn't work for service items
DROP INDEX IF EXISTS idx_cart_items_session_product;

-- new index: one broadband service per session (can't have two broadband plans)
CREATE UNIQUE INDEX idx_cart_items_session_broadband
  ON cart_items(session_id)
  WHERE item_type = 'broadband_service';

-- ============================================================
-- 2. EXTEND orders
--    Split a checkout into device_order and/or service_order.
--    order_type       : 'device' | 'service' | 'mixed' (legacy)
--    one_time_total   : sum of device item prices + shipping
--    monthly_total    : sum of broadband subscription prices
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_type       TEXT NOT NULL DEFAULT 'device'
    CHECK (order_type IN ('device', 'service', 'mixed')),
  ADD COLUMN IF NOT EXISTS one_time_total   NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS monthly_total    NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS service_status   TEXT DEFAULT NULL
    CHECK (service_status IN ('pending_appointment', 'appointment_booked', 'installation_scheduled', 'active', 'cancelled', NULL));

-- ============================================================
-- 3. EXTEND order_items
--    item_type and fulfillment_type mirror cart_items.
--    For service items: monthly_price stored separately.
-- ============================================================
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS item_type        TEXT NOT NULL DEFAULT 'device'
    CHECK (item_type IN ('device', 'broadband_service')),
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT NOT NULL DEFAULT 'shipping'
    CHECK (fulfillment_type IN ('shipping', 'installation')),
  ADD COLUMN IF NOT EXISTS monthly_price    NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS broadband_ref    UUID REFERENCES user_selections(id) ON DELETE SET NULL;

-- ============================================================
-- 4. APPOINTMENTS table
--    Tracks installation appointment for service orders.
--    Linked to an order (service type) and a user_selection.
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_selection_id   UUID REFERENCES user_selections(id) ON DELETE SET NULL,
    session_id          TEXT NOT NULL,
    -- address snapshot (denormalised for resilience)
    install_address     TEXT NOT NULL,
    install_postcode    TEXT NOT NULL,
    -- slot chosen by user
    preferred_date      DATE,
    preferred_time_slot TEXT CHECK (preferred_time_slot IN ('morning', 'afternoon', 'evening', 'any')),
    confirmed_date      DATE,
    confirmed_time_slot TEXT,
    -- engineer details (populated after booking)
    engineer_name       TEXT,
    engineer_ref        TEXT,
    -- status lifecycle
    status              TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'booked', 'confirmed', 'completed', 'cancelled', 'rescheduled')),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_appointments_order    ON appointments(order_id);
CREATE INDEX idx_appointments_session  ON appointments(session_id);
CREATE INDEX idx_appointments_status   ON appointments(status);

-- ============================================================
-- 5. SUBSCRIPTIONS table
--    Tracks the ongoing monthly subscription after installation.
--    Created when appointment status → 'completed'.
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_selection_id   UUID REFERENCES user_selections(id) ON DELETE SET NULL,
    session_id          TEXT NOT NULL,
    plan_id             UUID REFERENCES broadband_plans(id) ON DELETE SET NULL,
    plan_name           TEXT NOT NULL,
    monthly_price       NUMERIC(10, 2) NOT NULL,
    contract_months     INTEGER NOT NULL,
    start_date          DATE,
    next_billing_date   DATE,
    end_date            DATE,
    status              TEXT NOT NULL DEFAULT 'pending_activation'
      CHECK (status IN ('pending_activation', 'active', 'suspended', 'cancelled', 'expired')),
    addons              JSONB DEFAULT '[]',
    sim_plan_id         UUID REFERENCES sim_plans(id) ON DELETE SET NULL,
    home_phone_included BOOLEAN DEFAULT false,
    tv_package          TEXT,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_order   ON subscriptions(order_id);
CREATE INDEX idx_subscriptions_session ON subscriptions(session_id);
CREATE INDEX idx_subscriptions_status  ON subscriptions(status);

-- ============================================================
-- 6. CHECKOUT_SESSIONS table
--    Tracks the split-checkout state so the frontend knows
--    which steps are pending (payment, appointment, confirmation).
-- ============================================================
CREATE TABLE IF NOT EXISTS checkout_sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              TEXT NOT NULL UNIQUE,
    -- flags for what this checkout contains
    has_devices             BOOLEAN DEFAULT false,
    has_broadband_service   BOOLEAN DEFAULT false,
    -- sub-order references (created during checkout)
    device_order_id         UUID REFERENCES orders(id) ON DELETE SET NULL,
    service_order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
    -- step tracking
    device_payment_done     BOOLEAN DEFAULT false,
    appointment_booked      BOOLEAN DEFAULT false,
    -- totals shown in checkout summary
    device_one_time_total   NUMERIC(10, 2) DEFAULT 0.00,
    broadband_monthly_total NUMERIC(10, 2) DEFAULT 0.00,
    -- overall status
    status                  TEXT NOT NULL DEFAULT 'in_progress'
      CHECK (status IN ('in_progress', 'device_paid', 'appointment_pending', 'complete', 'abandoned')),
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checkout_sessions_session ON checkout_sessions(session_id);
