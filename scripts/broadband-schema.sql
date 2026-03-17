-- Broadband Checker Schema for Supabase
-- Run this in the Supabase SQL Editor after schema.sql

-- 1. Postcodes
CREATE TABLE postcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postcode TEXT NOT NULL UNIQUE,
    area_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_postcodes_postcode ON postcodes(postcode);

-- 2. Addresses
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postcode_id UUID NOT NULL REFERENCES postcodes(id) ON DELETE CASCADE,
    uprn TEXT NOT NULL UNIQUE,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city TEXT NOT NULL,
    full_address TEXT NOT NULL,
    technology_copper BOOLEAN DEFAULT false,
    technology_fttp BOOLEAN DEFAULT false,
    technology_sogea BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_addresses_postcode_id ON addresses(postcode_id);
CREATE INDEX idx_addresses_uprn ON addresses(uprn);

-- 3. Broadband Plans
CREATE TABLE broadband_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_ref TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    download_speed_mbps INTEGER NOT NULL,
    upload_speed_mbps INTEGER NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('Core', 'Standard', 'Premium', 'Ultimate')),
    technology_type TEXT NOT NULL,
    monthly_price NUMERIC(10, 2) NOT NULL,
    contract_length_months INTEGER NOT NULL CHECK (contract_length_months IN (12, 24)),
    promotional_label TEXT,
    includes_router BOOLEAN DEFAULT true,
    router_name TEXT,
    speed_guarantee_mbps INTEGER,
    activation_fee NUMERIC(10, 2) DEFAULT 0.00,
    out_of_contract_price NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_broadband_plans_type ON broadband_plans(plan_type);
CREATE INDEX idx_broadband_plans_price ON broadband_plans(monthly_price);

-- 4. Add-ons
CREATE TABLE addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    monthly_price NUMERIC(10, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. SIM Plans
CREATE TABLE sim_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    monthly_price NUMERIC(10, 2) NOT NULL,
    max_speed TEXT,
    description TEXT,
    is_unlimited BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. User Selections
CREATE TABLE user_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    postcode_id UUID REFERENCES postcodes(id),
    address_id UUID REFERENCES addresses(id),
    selected_plan_id UUID REFERENCES broadband_plans(id),
    selected_addons JSONB DEFAULT '[]',
    selected_sim_plan_id UUID REFERENCES sim_plans(id),
    selected_tv_package TEXT,
    selected_home_phone BOOLEAN DEFAULT false,
    phone_number TEXT,
    total_monthly_price NUMERIC(10, 2),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'confirmed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_selections_session ON user_selections(session_id);
CREATE INDEX idx_user_selections_postcode ON user_selections(postcode_id);
