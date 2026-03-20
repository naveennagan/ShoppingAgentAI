-- Broadband Purchase Journey Migration
-- Run this after broadband-schema.sql and seed-broadband.sql

-- ============================================================
-- NEW TABLE: tv_packages
-- ============================================================
CREATE TABLE tv_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    monthly_price NUMERIC(10, 2) NOT NULL,
    channel_count INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NEW TABLE: home_phone_services
-- ============================================================
CREATE TABLE home_phone_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    monthly_price NUMERIC(10, 2) NOT NULL,
    includes_calls_to TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NEW TABLE: plan_addon_compatibility
-- ============================================================
CREATE TABLE plan_addon_compatibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_type TEXT NOT NULL CHECK (plan_type IN ('Core', 'Standard', 'Premium', 'Ultimate')),
    addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
    UNIQUE (plan_type, addon_id)
);

CREATE INDEX idx_pac_plan_type ON plan_addon_compatibility(plan_type);
CREATE INDEX idx_pac_addon_id ON plan_addon_compatibility(addon_id);

-- ============================================================
-- ALTER TABLE: user_selections
-- Drop old columns, add new FK columns
-- ============================================================
ALTER TABLE user_selections DROP COLUMN IF EXISTS selected_tv_package;
ALTER TABLE user_selections DROP COLUMN IF EXISTS selected_home_phone;

ALTER TABLE user_selections
    ADD COLUMN selected_tv_package_id UUID REFERENCES tv_packages(id),
    ADD COLUMN selected_home_phone_service_id UUID REFERENCES home_phone_services(id);


-- ============================================================
-- SEED DATA: TV Packages
-- ============================================================
INSERT INTO tv_packages (name, description, monthly_price, channel_count) VALUES
  ('Entertainment',      'Freeview channels plus catch-up TV apps',                          0.00,  80),
  ('Big Entertainment',  'Sky Atlantic, Comedy Central, MTV and 100+ channels',             12.00, 150),
  ('VIP',                'All channels including Sky Sports, Cinema, and BT Sport',         25.00, 230)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED DATA: Home Phone Services
-- ============================================================
INSERT INTO home_phone_services (name, description, monthly_price, includes_calls_to) VALUES
  ('Pay As You Go',                  'Pay per call with no monthly commitment',                                0.00, 'N/A — charged per call'),
  ('Unlimited UK Calls',             'Unlimited calls to UK landlines and mobiles',                             8.00, 'UK landlines and mobiles'),
  ('Unlimited UK & International',   'Unlimited calls to UK and 50+ international destinations',              12.00, 'UK landlines, mobiles, and 50+ countries')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED DATA: Plan-Addon Compatibility
-- WiFi Extender, Complete WiFi, Norton Security, International Calls → all plan types
-- BT Sport, EE TV, Static IP Address → Premium and Ultimate only
-- ============================================================
INSERT INTO plan_addon_compatibility (plan_type, addon_id)
SELECT pt.plan_type, a.id
FROM (VALUES ('Core'), ('Standard'), ('Premium'), ('Ultimate')) AS pt(plan_type)
CROSS JOIN addons a
WHERE a.name IN ('WiFi Extender', 'Complete WiFi', 'Norton Security', 'International Calls')
ON CONFLICT (plan_type, addon_id) DO NOTHING;

INSERT INTO plan_addon_compatibility (plan_type, addon_id)
SELECT pt.plan_type, a.id
FROM (VALUES ('Premium'), ('Ultimate')) AS pt(plan_type)
CROSS JOIN addons a
WHERE a.name IN ('BT Sport', 'EE TV', 'Static IP Address')
ON CONFLICT (plan_type, addon_id) DO NOTHING;
