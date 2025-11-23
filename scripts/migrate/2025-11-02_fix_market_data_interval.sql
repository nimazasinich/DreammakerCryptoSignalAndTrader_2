-- scripts/migrate/2025-11-02_fix_market_data_interval.sql
-- Safe backfill: Set interval to '1m' for any NULL intervals
-- This is idempotent and safe to run multiple times

UPDATE market_data SET interval = '1m' WHERE interval IS NULL;

-- Verify: This should return 0 rows after backfill
-- SELECT COUNT(*) FROM market_data WHERE interval IS NULL;

