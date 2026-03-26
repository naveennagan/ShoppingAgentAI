-- Split Voucher System Migration
-- Adds valid_till and applicable_item_type columns to the promotions table.
-- Both use defaults (NULL and 'both') so existing records are preserved without data loss.

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS valid_till INTEGER DEFAULT NULL;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS applicable_item_type TEXT DEFAULT 'both';
