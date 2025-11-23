/**
 * Risk Center and Portfolio Configuration
 *
 * Centralized configuration for risk metrics, refresh intervals, and thresholds.
 * Adjust these values to tune the behavior without code changes.
 */

// ========== Refresh Intervals ==========

/**
 * Base interval for auto-refresh in milliseconds
 * Used by both RiskCenterPro and PortfolioPage
 */
export const REFRESH_BASE_MS = 30000; // 30 seconds

/**
 * Maximum backoff interval for auto-refresh on errors (milliseconds)
 * Prevents infinite exponential growth
 */
export const BACKOFF_MAX_MS = 120000; // 2 minutes

/**
 * Alias for BACKOFF_MAX_MS used by data provider cascade
 */
export const REFRESH_BACKOFF_MAX_MS = BACKOFF_MAX_MS;

/**
 * Initial backoff interval on first error (milliseconds)
 */
export const BACKOFF_INITIAL_MS = 5000; // 5 seconds

// ========== Risk Metrics Thresholds ==========

/**
 * Minimum number of OHLCV bars required for volatility calculations
 * VaR and ES metrics will only be shown if this threshold is met
 */
export const MIN_BARS = 50;

/**
 * Alias for MIN_BARS used by OHLC provider cascade
 * Minimum bars required before showing OHLC-dependent metrics
 */
export const MIN_OHLC_BARS = MIN_BARS;

/**
 * VaR confidence level (as decimal, e.g., 0.95 = 95%)
 * Standard values: 0.90 (90%), 0.95 (95%), 0.99 (99%)
 */
export const VAR_CONFIDENCE = 0.95;

/**
 * Z-score for VaR at the configured confidence level
 * For 95% confidence: 1.645 (one-tailed)
 * For 99% confidence: 2.326 (one-tailed)
 */
export const VAR_Z_SCORE = 1.645; // 95% confidence

/**
 * Alias for VAR_Z_SCORE used in risk calculations
 */
export const Z_VALUE_95 = VAR_Z_SCORE;

/**
 * Expected Shortfall (CVaR) multiplier for normal distribution
 * For 95% confidence: ~2.06
 * For 99% confidence: ~2.67
 */
export const ES_MULTIPLIER = 2.06; // 95% confidence

/**
 * Default maintenance margin rate if futures info unavailable
 * Most exchanges use 0.4% - 1.0% for major pairs
 */
export const DEFAULT_MAINTENANCE_MARGIN_RATE = 0.005; // 0.5%

// ========== Liquidation Warning Thresholds ==========

/**
 * Liquidation buffer thresholds for color-coding
 */
export const LIQUIDATION_BUFFER_THRESHOLDS = {
  /** Green: Safe zone (> 10% buffer) */
  SAFE: 0.10,
  /** Orange: Warning zone (5-10% buffer) */
  WARNING: 0.05,
  /** Red: Danger zone (< 5% buffer) */
  DANGER: 0.05,
};

// ========== Hours per Day for Volatility ==========

/**
 * Number of hours in a trading day for volatility annualization
 * Crypto trades 24/7, so use 24
 */
export const HOURS_PER_DAY = 24;

// ========== Data Fetch Limits ==========

/**
 * Maximum number of history records to fetch for equity curve
 */
export const MAX_HISTORY_RECORDS = 1000;

/**
 * Maximum number of OHLCV bars to fetch per symbol
 */
export const MAX_OHLCV_BARS = 500;

/**
 * OHLCV timeframe for volatility calculations
 */
export const OHLCV_TIMEFRAME = '1h';

// ========== Export Formats ==========

/**
 * CSV export filename date format
 */
export const CSV_DATE_FORMAT = 'YYYY-MM-DD';

/**
 * Default CSV decimal places for currency values
 */
export const CSV_DECIMAL_PLACES = 2;
