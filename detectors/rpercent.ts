import { Bar, LayerScore } from '../types/signals';

export function detectRPercent(ohlcv: Bar[]): LayerScore {
  if (ohlcv.length < 14) return { score: 0.0, reasons: ['insufficient data for Williams %R'] };

  const period = 14;
  const last14 = ohlcv.slice(-period);

  const highs = (last14 || []).map(b => b.high);
  const lows = (last14 || []).map(b => b.low);
  const currentClose = last14[last14.length - 1].close;

  const highestHigh = Math.max(...highs);
  const lowestLow = Math.min(...lows);

  // Williams %R formula: (Highest High - Close) / (Highest High - Lowest Low) * -100
  const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;

  const reasons: string[] = [];
  let score = 0.0;

  if (williamsR > -20) {
    score = 0.7;
    reasons.push('overbought territory');
  } else if (williamsR < -80) {
    score = 0.7;
    reasons.push('oversold territory');
  } else if (williamsR > -50 && williamsR < -40) {
    score = 0.5;
    reasons.push('neutral zone');
  } else {
    score = 0.3;
    reasons.push('mid-range');
  }

  return { score, reasons: reasons.slice(0, 3) };
}
