import { Bar, LayerScore } from '../types/signals';

export function detectFibonacci(ohlcv: Bar[]): LayerScore {
  if (ohlcv.length < 50) return { score: 0.0, reasons: ['insufficient data for Fibonacci analysis'] };

  const last50 = ohlcv.slice(-50);
  const highs = (last50 || []).map(b => b.high);
  const lows = (last50 || []).map(b => b.low);
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  const currentPrice = last50[last50.length - 1].close;

  // Calculate Fibonacci retracement levels
  const range = maxHigh - minLow;
  const fib236 = maxHigh - range * 0.236;
  const fib382 = maxHigh - range * 0.382;
  const fib500 = maxHigh - range * 0.500;
  const fib618 = maxHigh - range * 0.618;
  const fib786 = maxHigh - range * 0.786;

  const reasons: string[] = [];
  let score = 0.0;

  // Check proximity to key Fibonacci levels
  const tolerance = range * 0.02; // 2% tolerance

  if (Math.abs(currentPrice - fib382) < tolerance) {
    score += 0.5;
    reasons.push('near 38.2% retracement');
  } else if (Math.abs(currentPrice - fib500) < tolerance) {
    score += 0.4;
    reasons.push('near 50% retracement');
  } else if (Math.abs(currentPrice - fib618) < tolerance) {
    score += 0.6;
    reasons.push('near 61.8% golden ratio');
  } else if (Math.abs(currentPrice - fib236) < tolerance) {
    score += 0.3;
    reasons.push('near 23.6% retracement');
  } else if (Math.abs(currentPrice - fib786) < tolerance) {
    score += 0.5;
    reasons.push('near 78.6% retracement');
  }

  if (reasons.length === 0) {
    reasons.push('no Fibonacci level proximity');
    score = 0.2;
  }

  return { score: Math.min(1, score), reasons: reasons.slice(0, 3) };
}
