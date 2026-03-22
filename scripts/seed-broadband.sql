-- Broadband Seed Data for Supabase
-- Run this after broadband-schema.sql

-- ============================================================
-- POSTCODES
-- ============================================================
INSERT INTO postcodes (id, postcode, area_name) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'SA1 6AU', 'Swansea, Wales'),
  ('a1000000-0000-0000-0000-000000000002', 'SW1A 1AA', 'Westminster, London'),
  ('a1000000-0000-0000-0000-000000000003', 'M1 1AE',  'Manchester City Centre'),
  ('a1000000-0000-0000-0000-000000000004', 'B1 1BB',  'Birmingham City Centre'),
  ('a1000000-0000-0000-0000-000000000005', 'LS1 1BA', 'Leeds City Centre'),
  ('a1000000-0000-0000-0000-000000000006', 'E1 6RF',  'Whitechapel, London'),
  ('a1000000-0000-0000-0000-000000000007', 'BS1 4DJ', 'Bristol City Centre'),
  ('a1000000-0000-0000-0000-000000000008', 'EH1 1YZ', 'Edinburgh Old Town')
ON CONFLICT (postcode) DO NOTHING;

-- ============================================================
-- ADDRESSES (derived from address.json — SA1 6AU / Swansea)
-- ============================================================
INSERT INTO addresses (postcode_id, uprn, address_line_1, address_line_2, city, full_address, technology_copper, technology_fttp, technology_sogea) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'A15099951235', 'BT Test Facility',        NULL,         'Swansea', 'BT Test Facility, Strand, Swansea, SA1 6AU',              true,  true, false),
  ('a1000000-0000-0000-0000-000000000001', 'A15099951186', 'BT Test Facility',        'Sog5bt 10',  'Swansea', 'BT Test Facility (Sog5bt 10), Strand, Swansea, SA1 6AU',  true,  false, false),
  ('a1000000-0000-0000-0000-000000000001', 'A15099951187', 'BT Test Facility',        'Sog5bt 11',  'Swansea', 'BT Test Facility (Sog5bt 11), Strand, Swansea, SA1 6AU',  true,  false, false),
  ('a1000000-0000-0000-0000-000000000001', 'A15099951188', 'BT Test Facility',        'Sog5bt 12',  'Swansea', 'BT Test Facility (Sog5bt 12), Strand, Swansea, SA1 6AU',  true,  false, false),
  ('a1000000-0000-0000-0000-000000000001', 'A15099951190', 'BT Test Facility',        'Sog5bt 14',  'Swansea', 'BT Test Facility (Sog5bt 14), Strand, Swansea, SA1 6AU',  true,  false, false),
  ('a1000000-0000-0000-0000-000000000001', 'A15099951191', 'BT Test Facility',        'Sog5bt 15',  'Swansea', 'BT Test Facility (Sog5bt 15), Strand, Swansea, SA1 6AU',  true,  false, false),
  ('a1000000-0000-0000-0000-000000000001', 'A15099951194', 'BT Test Facility',        'Sog5bt 18',  'Swansea', 'BT Test Facility (Sog5bt 18), Strand, Swansea, SA1 6AU',  true,  false, false),
  ('a1000000-0000-0000-0000-000000000001', 'A15099951196', 'BT Test Facility',        'Sog5bt 2',   'Swansea', 'BT Test Facility (Sog5bt 2), Strand, Swansea, SA1 6AU',   true,  false, false),
  -- London addresses (SW1A 1AA)
  ('a1000000-0000-0000-0000-000000000002', 'L10000000001', '10 Downing Street',       NULL,         'London',  '10 Downing Street, Westminster, London, SW1A 1AA',         false, true,  true),
  ('a1000000-0000-0000-0000-000000000002', 'L10000000002', '12 Downing Street',       NULL,         'London',  '12 Downing Street, Westminster, London, SW1A 1AA',         false, true,  true),
  ('a1000000-0000-0000-0000-000000000002', 'L10000000003', 'Flat 1, 14 Downing St',   NULL,         'London',  'Flat 1, 14 Downing Street, Westminster, London, SW1A 1AA', false, true,  true),
  -- Manchester addresses (M1 1AE)
  ('a1000000-0000-0000-0000-000000000003', 'M10000000001', '1 Piccadilly Gardens',    NULL,         'Manchester', '1 Piccadilly Gardens, Manchester, M1 1AE',              true,  true,  true),
  ('a1000000-0000-0000-0000-000000000003', 'M10000000002', '5 Piccadilly Gardens',    'Flat 2',     'Manchester', 'Flat 2, 5 Piccadilly Gardens, Manchester, M1 1AE',      true,  true,  true),
  -- Birmingham (B1 1BB)
  ('a1000000-0000-0000-0000-000000000004', 'B10000000001', '1 Corporation Street',    NULL,         'Birmingham', '1 Corporation Street, Birmingham, B1 1BB',              true,  false, true),
  ('a1000000-0000-0000-0000-000000000004', 'B10000000002', '20 Corporation Street',   'Floor 2',    'Birmingham', 'Floor 2, 20 Corporation Street, Birmingham, B1 1BB',    true,  false, true)
ON CONFLICT (uprn) DO NOTHING;

-- ============================================================
-- BROADBAND PLANS (from broadband_plans.json + variations)
-- ============================================================
INSERT INTO broadband_plans (plan_ref, name, download_speed_mbps, upload_speed_mbps, plan_type, technology_type, monthly_price, contract_length_months, promotional_label, includes_router, router_name, speed_guarantee_mbps, activation_fee, out_of_contract_price) VALUES
  -- Core plans (SOGEA/Copper)
  ('N0001054', 'Fibre 36 Essentials',    36,   9,    'Core',     'SOGEA',  27.99, 24, NULL,                        true, 'Smart Hub 6 Plus', 36,   0.00, 36.99),
  ('N0001055', 'Fibre 36 Standard',      36,   9,    'Standard', 'SOGEA',  31.99, 24, NULL,                        true, 'Smart Hub 6 Plus', 36,   0.00, 38.99),
  ('N0001056', 'Fibre 36 Essentials 12', 36,   9,    'Core',     'SOGEA',  30.99, 12, NULL,                        true, 'Smart Hub 6 Plus', 36,   0.00, 36.99),
  -- Standard plans (FTTC)
  ('N0001060', 'Fibre 100 Standard',     100,  20,   'Standard', 'FTTC',   34.99, 24, NULL,                        true, 'Smart Hub 6 Plus', 100,  0.00, 42.99),
  ('N0001061', 'Fibre 100 Premium',      100,  20,   'Premium',  'FTTC',   39.99, 24, 'Most Popular',              true, 'Smart Hub 6 Plus', 100,  0.00, 46.99),
  ('N0001062', 'Fibre 100 Standard 12',  100,  20,   'Standard', 'FTTC',   37.99, 12, NULL,                        true, 'Smart Hub 6 Plus', 100,  0.00, 42.99),
  -- Premium plans (FTTP)
  ('N0001070', 'Full Fibre 500',         500,  75,   'Premium',  'FTTP',   44.99, 24, NULL,                        true, 'Smart Hub 6 Plus', 500,  0.00, 52.99),
  ('N0001071', 'Full Fibre 500 Plus',    500,  75,   'Premium',  'FTTP',   49.99, 24, 'Best Value',                true, 'Smart Hub 6 Plus', 500,  0.00, 56.99),
  ('N0001072', 'Full Fibre 500 12mo',    500,  75,   'Premium',  'FTTP',   47.99, 12, NULL,                        true, 'Smart Hub 6 Plus', 500,  0.00, 52.99),
  -- Ultimate plans (FTTP)
  ('N0001080', 'Full Fibre 900',         900,  110,  'Ultimate', 'FTTP',   54.99, 24, NULL,                        true, 'Smart Hub 6 Plus', 900,  0.00, 62.99),
  ('N0001081', 'Full Fibre 900 Plus',    900,  110,  'Ultimate', 'FTTP',   59.99, 24, 'Fastest Available',         true, 'Smart Hub 6 Plus', 900,  0.00, 68.99),
  ('N0001082', 'Full Fibre 1Gbps',       1000, 115,  'Ultimate', 'FTTP',   64.99, 24, 'Ultrafast',                 true, 'Smart Hub 6 Plus', 1000, 0.00, 74.99)
ON CONFLICT (plan_ref) DO NOTHING;

-- ============================================================
-- ADD-ONS
-- ============================================================
INSERT INTO addons (name, monthly_price, description) VALUES
  ('WiFi Extender',          5.00,  'Extends your WiFi coverage to hard-to-reach areas of your home'),
  ('Complete WiFi',          8.00,  'Whole-home WiFi with multiple discs for guaranteed coverage in every room'),
  ('BT Sport',              15.00,  'Access to BT Sport channels including Premier League and Champions League'),
  ('EE TV',                 10.00,  'EE TV box with access to streaming apps and live TV'),
  ('Norton Security',        4.00,  'Protect up to 10 devices with Norton 360 antivirus and VPN'),
  ('Static IP Address',      5.00,  'Fixed IP address for remote working or hosting services'),
  ('International Calls',    7.50,  'Unlimited calls to 50+ countries including USA, Australia and Europe')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SIM PLANS
-- ============================================================
INSERT INTO sim_plans (name, monthly_price, max_speed, description, is_unlimited) VALUES
  ('Unlimited No Frills',   10.00, '10Mbps',   'Unlimited data at 10Mbps — great for browsing and social media',          true),
  ('Unlimited Standard',    15.00, '60Mbps',   'Unlimited data at 60Mbps — ideal for streaming and video calls',          true),
  ('Unlimited Premium',     20.00, '150Mbps',  'Unlimited data at 150Mbps — perfect for gaming and 4K streaming',         true),
  ('Unlimited Max',         25.00, '300Mbps',  'Unlimited data at full 5G speeds — for power users and heavy streamers',  true),
  ('5GB Data',               5.00, 'Full 5G',  '5GB data per month — suitable for light users',                           false),
  ('20GB Data',              8.00, 'Full 5G',  '20GB data per month — good for moderate usage',                           false)
ON CONFLICT (name) DO NOTHING;
