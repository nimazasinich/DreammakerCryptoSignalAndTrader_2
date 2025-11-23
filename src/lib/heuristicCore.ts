import { Bar, CoreSignal } from '../types/signals';
import { ema, rsi } from '../engine/Indicators';

/**
 * Heuristic core signal engine
 * Implements EMA trend bias, RSI exhaustion, momentum, and relative volume analysis
 */
export function heuristicCore(ohlcv: Bar[]): CoreSignal {
  if (ohlcv.length < 50) {
    return {
      action: 'HOLD',
      strength: 0.1,
      confidence: 0.1,
      score: 0.1,
      reasons: ['insufficient data']
    };
  }

  const closes = (ohlcv || []).map(b => b.close);
  const volumes = (ohlcv || []).map(b => b.volume);

  // Calculate indicators
  const ema20 = ema(closes.slice(-20), 20);
  const ema50 = ema(closes.slice(-50), 50);
  const rsiValues = rsi(closes, 14);
  const currentRsi = rsiValues[rsiValues.length - 1];
  const currentPrice = closes[closes.length - 1];

  // Calculate momentum (rate of change over 10 periods)
  const momentum = (closes[closes.length - 1] - closes[closes.length - 10]) / closes[closes.length - 10];

  // Calculate relative volume (current volume vs average of last 20 bars)
  const avgVolume = volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20;
  const currentVolume = volumes[volumes.length - 1];
  const relativeVolume = avgVolume > 0 ? currentVolume / avgVolume : 1;

  const reasons: string[] = [];
  let score = 0.5;
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

  // EMA trend bias (30% weight)
  let emaBias = 0;
  if (currentPrice > ema20 && ema20 > ema50) {
    emaBias = 0.7;
    reasons.push('bullish EMA trend');
  } else if (currentPrice < ema20 && ema20 < ema50) {
    emaBias = -0.7;
    reasons.push('bearish EMA trend');
  } else {
    emaBias = 0;
    reasons.push('neutral EMA trend');
  }

  // RSI exhaustion (25% weight)
  let rsiScore = 0;
  if (currentRsi < 30) {
    rsiScore = 0.7; // oversold
    reasons.push('RSI oversold');
  } else if (currentRsi > 70) {
    rsiScore = -0.7; // overbought
    reasons.push('RSI overbought');
  } else {
    rsiScore = 0;
    reasons.push('RSI neutral');
  }

  // Momentum (25% weight)
  let momentumScore = 0;
  if (momentum > 0.03) {
    momentumScore = 0.6;
    reasons.push('strong positive momentum');
  } else if (momentum < -0.03) {
    momentumScore = -0.6;
    reasons.push('strong negative momentum');
  }

  // Relative volume (20% weight)
  let volumeScore = 0;
  if (relativeVolume > 1.5) {
    volumeScore = 0.5;
    reasons.push('high relative volume');
  } else if (relativeVolume < 0.5) {
    volumeScore = -0.3;
    reasons.push('low relative volume');
  }

  // Combine scores with weights
  const combinedScore = (
    emaBias * 0.30 +
    rsiScore * 0.25 +
    momentumScore * 0.25 +
    volumeScore * 0.20
  );

  // Normalize to 0..1 range (combined score is in -1..1 range)
  score = (combinedScore + 1) / 2;

  // Determine action based on score
  if (combinedScore > 0.3) {
    action = 'BUY';
  } else if (combinedScore < -0.3) {
    action = 'SELL';
  } else {
    action = 'HOLD';
  }

  const strength = Math.abs(combinedScore);
  const confidence = Math.min(0.95, Math.max(0.1, strength * 0.8 + 0.2));

  return {
    action,
    strength,
    confidence,
    score,
    reasons: reasons.slice(0, 5)
  };
}
