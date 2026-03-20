-- Split Voucher Seed Data
-- Run after split-voucher-migration.sql
-- Inserts broadband, device, and universal vouchers for testing the split voucher system.
-- Uses ON CONFLICT (promo_code) DO NOTHING for idempotency.

-- Broadband voucher: 10% off for 3 months
INSERT INTO promotions (name, description, discount_type, discount_value, promo_code, start_date, end_date, is_active, valid_till, applicable_item_type)
VALUES (
  'Broadband 10% Off',
  '10% discount on broadband for the first 3 months',
  'percentage',
  10,
  'BROADBAND10',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '1 year',
  true,
  3,
  'broadband'
)
ON CONFLICT (promo_code) DO NOTHING;

-- Device voucher: 10% off
INSERT INTO promotions (name, description, discount_type, discount_value, promo_code, start_date, end_date, is_active, valid_till, applicable_item_type)
VALUES (
  'Device 10% Off',
  '10% discount on device purchases',
  'percentage',
  10,
  'DEVICE10',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '1 year',
  true,
  NULL,
  'device'
)
ON CONFLICT (promo_code) DO NOTHING;

-- Universal voucher: 5% off both device and broadband
INSERT INTO promotions (name, description, discount_type, discount_value, promo_code, start_date, end_date, is_active, valid_till, applicable_item_type)
VALUES (
  'Universal 5% Off',
  '5% discount on any item type',
  'percentage',
  5,
  'SAVE5',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '1 year',
  true,
  NULL,
  'both'
)
ON CONFLICT (promo_code) DO NOTHING;
