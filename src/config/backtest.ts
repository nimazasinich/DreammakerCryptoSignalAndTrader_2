/**
 * Backtest Configuration
 *
 * Toggle for LastChance server-side backtest integration
 */

/**
 * Enable LastChance server-side backtest API
 * Set to true to use the backend /signals/backtest endpoint
 * Set to false to use local backtest engine
 */
export const USE_LASTCHANCE_BACKTEST = false; // Default: false (use local for now)

/**
 * Default strategy for backtests when not specified
 */
export const DEFAULT_BACKTEST_STRATEGY = 'default';
