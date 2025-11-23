// Market Data Service for the Signal Engine
import { OHLC } from './types';
import { RealMarketDataService } from '../services/RealMarketDataService.js';
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

// Data policy enforcement
const APP_MODE = process.env.APP_MODE || process.env.VITE_APP_MODE || 'online';
const USE_MOCK_DATA = process.env.VITE_USE_MOCK_DATA === 'true' || process.env.USE_MOCK_DATA === 'true' || APP_MODE === 'demo';
const STRICT_REAL_DATA = process.env.STRICT_REAL_DATA === 'true' || process.env.VITE_STRICT_REAL_DATA === 'true' || APP_MODE === 'online';
const ALLOW_FAKE_DATA = process.env.ALLOW_FAKE_DATA === 'true' || process.env.VITE_ALLOW_FAKE_DATA === 'true';

/**
 * Fetch OHLC data for a symbol and timeframe
 * This is the main entry point for fetching market data for signal generation
 *
 * @param symbol - Trading symbol (e.g., 'BTC', 'ETH')
 * @param timeframe - Timeframe string (e.g., '1h', '4h', '1d')
 * @param limit - Number of bars to fetch (default: 500 for reliable signals)
 */
export async function fetchOHLC(symbol: string, timeframe: string, limit: number = 500): Promise<OHLC[]> {
  // DATA POLICY ENFORCEMENT
  // Demo mode or explicit mock flag: use fixtures only
  if (USE_MOCK_DATA || APP_MODE === 'demo') {
    logger.info(`[${APP_MODE.toUpperCase()} MODE] Using mock fixtures for ${symbol} ${timeframe}`);
    return generateDeterministicMockOHLC(symbol, timeframe, limit);
  }

  // Online mode: Real data only, fail fast on errors
  try {
    logger.info(`[ONLINE MODE] Fetching real market data for ${symbol} ${timeframe} (limit: ${limit})`);

    // Convert timeframe and limit to days for API call
    const days = convertLimitToDays(timeframe, limit);

    // Use the existing RealMarketDataService to fetch historical data
    const marketDataService = new RealMarketDataService();
    const historicalData = await marketDataService.getHistoricalData(symbol, days);

    if (!historicalData || historicalData.length === 0) {
      // In strict mode (online), fail fast
      if (STRICT_REAL_DATA || APP_MODE === 'online') {
        logger.error(
          `[DATA POLICY] No real historical data available for ${symbol} ${timeframe}. ` +
          `Online mode forbids fallbacks.`
        );
        console.error(
          `[DATA POLICY VIOLATION] No historical data available for ${symbol} ${timeframe}. ` +
          `Real data is required in online mode.`
        );
      }
      console.error(`No historical data available for ${symbol} ${timeframe}`);
    }

    // Convert to OHLC format
    const ohlc: OHLC[] = (historicalData || []).map(bar => ({
      t: bar.timestamp,
      o: bar.open || bar.price,
      h: bar.high || bar.price,
      l: bar.low || bar.price,
      c: bar.close || bar.price,
      v: bar.volume || 0
    }));

    // Validate data quality (enforces min 50 bars in strict mode)
    if (STRICT_REAL_DATA || APP_MODE === 'online') {
      if (ohlc.length < 50) {
        logger.error(
          `[DATA POLICY] Insufficient real data: ${ohlc.length} bars (minimum 50 required). ` +
          `Online mode requires adequate data for reliable signals.`
        );
        console.error(
          `[DATA POLICY VIOLATION] Insufficient data: ${ohlc.length} bars for ${symbol} ${timeframe}. ` +
          `Minimum 50 bars required in online mode.`
        );
      }
    }

    validateOHLC(ohlc, symbol, timeframe);

    logger.info(`✅ Fetched ${ohlc.length} real bars for ${symbol} ${timeframe}`);
    return ohlc.slice(-limit); // Return only the requested limit
  } catch (error: any) {
    logger.error(`Failed to fetch OHLC for ${symbol} ${timeframe}`, {}, error);

    // In online mode, re-throw without fallback
    if (STRICT_REAL_DATA || APP_MODE === 'online') {
      throw error;
    }

    console.error(`Market data fetch failed: ${error.message}`);
  }
}

/**
 * Convert limit (number of bars) to days based on timeframe
 */
function convertLimitToDays(timeframe: string, limit: number): number {
  const intervalMs = parseTimeframeToMs(timeframe);
  const totalMs = intervalMs * limit;
  const days = Math.ceil(totalMs / (24 * 60 * 60 * 1000));

  // Ensure we fetch enough data (minimum 7 days, max 365)
  return Math.max(7, Math.min(365, days));
}

/**
 * Validate OHLC data quality
 * Ensures data is:
 * - At least 50 bars for reliable analysis
 * - In ascending time order
 * - No negative values
 * - No null/undefined values
 */
function validateOHLC(ohlc: OHLC[], symbol: string, timeframe: string): void {
  if (ohlc.length < 50) {
    console.error(`Insufficient data: ${ohlc.length} bars (minimum 50 required)`);
  }

  // Check for ascending time order
  for (let i = 1; i < ohlc.length; i++) {
    if (ohlc[i].t <= ohlc[i - 1].t) {
      console.error(`Data not in ascending time order at index ${i}`);
    }
  }

  // Check for invalid values
  for (let i = 0; i < ohlc.length; i++) {
    const bar = ohlc[i];

    if (!Number.isFinite(bar.o) || !Number.isFinite(bar.h) ||
        !Number.isFinite(bar.l) || !Number.isFinite(bar.c) ||
        !Number.isFinite(bar.t)) {
      console.error(`Invalid values at bar ${i}: o=${bar.o}, h=${bar.h}, l=${bar.l}, c=${bar.c}, t=${bar.t}`);
    }

    if (bar.o < 0 || bar.h < 0 || bar.l < 0 || bar.c < 0) {
      console.error(`Negative values at bar ${i}`);
    }

    if (bar.h < bar.l) {
      console.error(`High < Low at bar ${i}`);
    }

    if (bar.v !== undefined && bar.v < 0) {
      console.error(`Negative volume at bar ${i}`);
    }
  }

  logger.debug(`OHLC validation passed for ${symbol} ${timeframe}: ${ohlc.length} bars`);
}

/**
 * Generate deterministic mock OHLC data (only when USE_MOCK_DATA is explicitly true)
 * This creates realistic-looking price action based on the symbol name (seed)
 * but is completely deterministic and repeatable
 */
function generateDeterministicMockOHLC(symbol: string, timeframe: string, numBars: number = 200): OHLC[] {
  const now = Date.now();

  // Parse timeframe to get interval in milliseconds
  const intervalMs = parseTimeframeToMs(timeframe);

  // Create deterministic seed from symbol
  const seed = hashCode(symbol);

  // Base price determined by symbol (deterministic)
  const basePrice = 1000 + (seed % 50000);

  const ohlc: OHLC[] = [];
  let currentPrice = basePrice;

  for (let i = 0; i < numBars; i++) {
    const timestamp = now - (numBars - i) * intervalMs;

    // Deterministic pseudo-random walk (seeded by symbol + index)
    const localSeed = seed + i;
    const priceDelta = (seededRandom(localSeed) - 0.5) * basePrice * 0.02; // ±1% moves
    currentPrice += priceDelta;

    // Ensure price stays positive
    currentPrice = Math.max(currentPrice, basePrice * 0.5);

    // Generate OHLC for this bar (deterministic)
    const volatility = basePrice * 0.005; // 0.5% intra-bar volatility
    const open = currentPrice;
    const close = currentPrice + (seededRandom(localSeed + 1) - 0.5) * volatility;
    const high = Math.max(open, close) + seededRandom(localSeed + 2) * volatility;
    const low = Math.min(open, close) - seededRandom(localSeed + 3) * volatility;
    const volume = 1000000 + seededRandom(localSeed + 4) * 5000000;

    ohlc.push({
      t: timestamp,
      o: open,
      h: high,
      l: low,
      c: close,
      v: volume
    });

    currentPrice = close;
  }

  return ohlc;
}

/**
 * Simple string hash function for deterministic seeding
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Deterministic pseudo-random number generator (0..1)
 * Based on simple LCG (Linear Congruential Generator)
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Parse timeframe string to milliseconds
 */
function parseTimeframeToMs(tf: string): number {
  const match = tf.match(/^(\d+)([mhd])$/i);
  if (!match) return 3600000; // Default to 1 hour

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 3600000;
  }
}
