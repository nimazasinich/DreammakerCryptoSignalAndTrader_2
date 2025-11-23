-- scripts/migrate/2025-11-07_optimize_timeseries_indexes.sql
-- Idempotent migration for time-series query optimization
-- Safe to run multiple times

-- Drop old index (optional, only if recreating)
-- DROP INDEX IF EXISTS idx_market_data_composite;

-- Create optimized index with DESC for time-series queries
-- This improves performance for queries like:
-- SELECT * FROM market_data WHERE symbol='BTC' AND interval='1h' ORDER BY timestamp DESC LIMIT 100
CREATE INDEX IF NOT EXISTS idx_market_data_composite_desc
  ON market_data(symbol, interval, timestamp DESC);

-- Add partial index for regime detection queries (optional)
-- This speeds up high-frequency regime lookups on hourly data
CREATE INDEX IF NOT EXISTS idx_market_data_regime_lookup
  ON market_data(symbol, timestamp DESC)
  WHERE interval = '1h';

-- Verify with EXPLAIN QUERY PLAN (uncomment to test):
-- EXPLAIN QUERY PLAN
-- SELECT * FROM market_data
-- WHERE symbol='BTCUSDT' AND interval='1h'
-- ORDER BY timestamp DESC LIMIT 100;

-- Expected output should show "USING INDEX idx_market_data_composite_desc"
