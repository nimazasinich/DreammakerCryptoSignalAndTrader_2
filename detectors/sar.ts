import { Bar, LayerScore } from '../types/signals';

export function detectSAR(ohlcv: Bar[]): LayerScore {
  if (ohlcv.length < 20) return { score: 0.0, reasons: ['insufficient data for SAR'] };

  // Simplified Parabolic SAR calculation
  const acceleration = 0.02;
  const maxAcceleration = 0.2;

  const last20 = ohlcv.slice(-20);
  let af = acceleration;
  let sar = last20[0].low;
  let isUptrend = true;
  let ep = last20[0].high;

  for (let i = 1; i < last20.length; i++) {
    const bar = last20[i];

    sar = sar + af * (ep - sar);

    if (isUptrend) {
      if (bar.low < sar) {
        isUptrend = false;
        sar = ep;
        ep = bar.low;
        af = acceleration;
      } else {
        if (bar.high > ep) {
          ep = bar.high;
          af = Math.min(af + acceleration, maxAcceleration);
        }
      }
    } else {
      if (bar.high > sar) {
        isUptrend = true;
        sar = ep;
        ep = bar.high;
        af = acceleration;
      } else {
        if (bar.low < ep) {
          ep = bar.low;
          af = Math.min(af + acceleration, maxAcceleration);
        }
      }
    }
  }

  const currentPrice = last20[last20.length - 1].close;
  const distance = Math.abs(currentPrice - sar) / currentPrice;

  let score = 0.0;
  const reasons: string[] = [];

  if (isUptrend && currentPrice > sar) {
    score = Math.max(0.5, 1 - distance * 10);
    reasons.push('SAR uptrend confirmed');
  } else if (!isUptrend && currentPrice < sar) {
    score = Math.max(0.5, 1 - distance * 10);
    reasons.push('SAR downtrend confirmed');
  } else {
    score = 0.3;
    reasons.push('SAR signal unclear');
  }

  return { score: Math.min(1, score), reasons: reasons.slice(0, 3) };
}
