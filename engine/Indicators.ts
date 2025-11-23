// Simplified deterministic indicators for the signal engine
import { OHLC } from './types';

export const needBars = (n: number, arr: OHLC[]): boolean => (arr?.length ?? 0) >= n;

/**
 * Calculate RSI (Relative Strength Index) - deterministic implementation
 * Uses Wilder's Smoothing Method (industry standard)
 */
export function rsi(closes: number[], period: number = 14): number[] {
  const result: number[] = new Array(closes.length).fill(50);

  if (closes.length < period + 1) return result;

  let gains: number[] = [];
  let losses: number[] = [];

  // Calculate initial changes
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  // First RSI value
  result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  // Apply Wilder's smoothing for remaining periods
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    result[i + 1] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }

  return result;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence) - deterministic
 */
export function macd(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): { macd: number[]; signal: number[]; hist: number[] } {
  const result = {
    macd: new Array(closes.length).fill(0),
    signal: new Array(closes.length).fill(0),
    hist: new Array(closes.length).fill(0)
  };

  if (closes.length < slow) return result;

  // Calculate EMA for fast and slow
  const emaFast = calculateEMAArray(closes, fast);
  const emaSlow = calculateEMAArray(closes, slow);

  // Calculate MACD line
  for (let i = 0; i < closes.length; i++) {
    result.macd[i] = emaFast[i] - emaSlow[i];
  }

  // Calculate signal line (EMA of MACD)
  const macdSignal = calculateEMAArray(result.macd.slice(slow - 1), signal);
  for (let i = 0; i < macdSignal.length; i++) {
    result.signal[slow - 1 + i] = macdSignal[i];
  }

  // Calculate histogram
  for (let i = 0; i < closes.length; i++) {
    result.hist[i] = result.macd[i] - result.signal[i];
  }

  return result;
}

/**
 * Calculate ATR (Average True Range) - deterministic
 */
export function atr(ohlc: OHLC[], period: number = 14): number[] {
  const result: number[] = new Array(ohlc.length).fill(0);

  if (ohlc.length < period + 1) return result;

  const trueRanges: number[] = [];

  // Calculate true ranges
  for (let i = 1; i < ohlc.length; i++) {
    const tr = Math.max(
      ohlc[i].h - ohlc[i].l,
      Math.abs(ohlc[i].h - ohlc[i - 1].c),
      Math.abs(ohlc[i].l - ohlc[i - 1].c)
    );
    trueRanges.push(tr);
  }

  // First ATR is simple average
  let currentATR = trueRanges.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  result[period] = currentATR;

  // Subsequent ATRs use Wilder's smoothing
  for (let i = period; i < trueRanges.length; i++) {
    currentATR = (currentATR * (period - 1) + trueRanges[i]) / period;
    result[i + 1] = currentATR;
  }

  return result;
}

/**
 * Calculate Simple Moving Average - deterministic
 */
export function sma(values: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(values[i]); // Not enough data, use current value
    } else {
      const slice = values.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, val) => sum + val, 0) / period;
      result.push(avg);
    }
  }

  return result;
}

/**
 * Calculate Exponential Moving Average - deterministic
 */
export function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const multiplier = 2 / (period + 1);
  let result = values[0];

  for (let i = 1; i < values.length; i++) {
    result = (values[i] * multiplier) + (result * (1 - multiplier));
  }

  return result;
}

/**
 * Calculate EMA array (for each point) - helper function
 */
function calculateEMAArray(values: number[], period: number): number[] {
  const result: number[] = [];
  if (values.length === 0) return result;

  const multiplier = 2 / (period + 1);
  result.push(values[0]); // First value

  for (let i = 1; i < values.length; i++) {
    const emaValue = (values[i] * multiplier) + (result[i - 1] * (1 - multiplier));
    result.push(emaValue);
  }

  return result;
}

/**
 * Calculate Bollinger Bands - deterministic
 */
export function bollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(middle[i]);
      lower.push(middle[i]);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle[i], 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(middle[i] + (std * stdDev));
      lower.push(middle[i] - (std * stdDev));
    }
  }

  return { upper, middle, lower };
}
