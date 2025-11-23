import { Bar, LayerScore } from '../types/signals';

export function detectClassical(ohlcv: Bar[]): LayerScore {
  if (ohlcv.length < 30) return { score: 0.0, reasons: ['insufficient data for classical patterns'] };

  // Placeholder heuristic: detect H&S, Double Top/Bottom, Flags
  const last30 = ohlcv.slice(-30);
  const reasons: string[] = [];
  let score = 0.0;

  // Simple double top/bottom detection
  const highs = (last30 || []).map(b => b.high);
  const lows = (last30 || []).map(b => b.low);
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);

  // Count how many times price tested the high/low
  const highTests = highs.filter(h => h >= maxHigh * 0.995).length;
  const lowTests = lows.filter(l => l <= minLow * 1.005).length;

  if (highTests >= 2) {
    score += 0.4;
    reasons.push('potential double top');
  }

  if (lowTests >= 2) {
    score += 0.4;
    reasons.push('potential double bottom');
  }

  // Detect consolidation (flag pattern)
  const priceRange = maxHigh - minLow;
  const avgPrice = (maxHigh + minLow) / 2;
  const volatility = priceRange / avgPrice;

  if (volatility < 0.05) {
    score += 0.3;
    reasons.push('consolidation detected');
  }

  if (reasons.length === 0) {
    reasons.push('no classical pattern detected');
  }

  return { score: Math.min(1, score), reasons: reasons.slice(0, 3) };
}
