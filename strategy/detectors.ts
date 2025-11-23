/**
 * DETECTORS MODULE
 * All detectors return {score ∈ [-1..+1], meta?: Record<string, unknown>}
 * Note: sentiment, news, and whales detectors are now async
 */

import { DetectorOutput } from '../types/index.js';
import { OHLCVData, TechnicalFeatures } from './features.js';
import { FearGreedService } from '../services/FearGreedService.js';
import { SentimentNewsService } from '../services/SentimentNewsService.js';
import { WhaleTrackerService } from '../services/WhaleTrackerService.js';
import { Logger } from '../core/Logger.js';

/** Clamp score to [-1, +1] */
function clamp(value: number, min = -1, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

/** Get last valid (non-NaN) value from array */
function lastValid(arr: number[]): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (!isNaN(arr[i])) return arr[i];
  }
  return 0;
}

// ========== ML/AI DETECTOR ==========

export function detectMLAI(candles: OHLCVData[], features: TechnicalFeatures): DetectorOutput {
  // Placeholder: In real implementation, call ML model
  // For now, use a simple heuristic combining multiple signals
  const rsi = lastValid(features.rsi);
  const macd = lastValid(features.macd.histogram);
  const roc = lastValid(features.roc);

  // Normalize each to [-1, +1]
  const rsiScore = (rsi - 50) / 50; // RSI 0-100 -> -1 to +1
  const macdScore = clamp(macd / 10, -1, 1); // Rough normalization
  const rocScore = clamp(roc / 10, -1, 1);

  const combinedScore = (rsiScore + macdScore + rocScore) / 3;

  return {
    score: clamp(combinedScore),
    meta: { rsi, macd, roc, method: 'ml_ai_placeholder' }
  };
}

// ========== RSI DETECTOR ==========

export function detectRSI(features: TechnicalFeatures): DetectorOutput {
  const rsi = lastValid(features.rsi);

  // RSI 0-100 -> score [-1, +1]
  // RSI < 30: oversold (bullish) = positive score
  // RSI > 70: overbought (bearish) = negative score
  // RSI 50: neutral = 0
  let score = 0;

  if (rsi < 30) {
    // Oversold: bullish signal
    score = 1 - (rsi / 30);
  } else if (rsi > 70) {
    // Overbought: bearish signal
    score = -(rsi - 70) / 30;
  } else {
    // Neutral zone
    score = (rsi - 50) / 20; // Scale 30-70 to roughly [-1, +1]
  }

  return {
    score: clamp(score),
    meta: { rsi, zone: rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'neutral' }
  };
}

// ========== MACD DETECTOR ==========

export function detectMACD(features: TechnicalFeatures): DetectorOutput {
  const histogram = lastValid(features.macd.histogram);
  const macd = lastValid(features.macd.macd);
  const signal = lastValid(features.macd.signal);

  // Histogram positive = bullish, negative = bearish
  // Normalize by dividing by a typical range (e.g., 10)
  const score = clamp(histogram / 10);

  return {
    score,
    meta: { histogram, macd, signal, crossover: macd > signal ? 'bullish' : 'bearish' }
  };
}

// ========== MA CROSS DETECTOR ==========

export function detectMACross(features: TechnicalFeatures): DetectorOutput {
  const sma20 = lastValid(features.sma20);
  const sma50 = lastValid(features.sma50);
  const ema12 = lastValid(features.ema12);
  const ema26 = lastValid(features.ema26);

  // Short-term above long-term = bullish
  const smaScore = sma20 > sma50 ? 1 : -1;
  const emaScore = ema12 > ema26 ? 1 : -1;

  const score = (smaScore + emaScore) / 2;

  return {
    score: clamp(score),
    meta: { sma20, sma50, ema12, ema26, smaSignal: smaScore > 0 ? 'bullish' : 'bearish', emaSignal: emaScore > 0 ? 'bullish' : 'bearish' }
  };
}

// ========== BOLLINGER BANDS DETECTOR ==========

export function detectBollinger(candles: OHLCVData[], features: TechnicalFeatures): DetectorOutput {
  const close = candles[candles.length - 1].close;
  const upper = lastValid(features.bollinger.upper);
  const lower = lastValid(features.bollinger.lower);
  const middle = lastValid(features.bollinger.middle);

  // Close near lower band = oversold (bullish)
  // Close near upper band = overbought (bearish)
  const range = upper - lower;
  const position = (close - lower) / range; // 0 to 1

  // Map: 0 (lower) -> +1 (bullish), 1 (upper) -> -1 (bearish), 0.5 (middle) -> 0
  const score = 1 - 2 * position;

  return {
    score: clamp(score),
    meta: { close, upper, lower, middle, position: position * 100 }
  };
}

// ========== VOLUME DETECTOR ==========

export function detectVolume(features: TechnicalFeatures): DetectorOutput {
  const volumes = features.volume.slice(-20).filter(v => !isNaN(v));
  if (volumes.length === 0) {
    return { score: 0, meta: { reason: 'no_volume_data' } };
  }

  const currentVolume = volumes[volumes.length - 1];
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

  // High volume relative to average suggests strong trend
  // But direction is ambiguous, so we'll use a neutral approach
  // For simplicity, score based on volume surge (higher = more bullish if in uptrend)
  const volumeRatio = currentVolume / avgVolume;

  // Score: >2x avg = strong signal (+0.5), <0.5x avg = weak signal (-0.5)
  let score = 0;
  if (volumeRatio > 2) {
    score = 0.5;
  } else if (volumeRatio < 0.5) {
    score = -0.5;
  } else {
    score = (volumeRatio - 1) * 0.5;
  }

  return {
    score: clamp(score),
    meta: { currentVolume, avgVolume, volumeRatio }
  };
}

// ========== SUPPORT/RESISTANCE DETECTOR ==========

export function detectSupportResistance(candles: OHLCVData[], features: TechnicalFeatures): DetectorOutput {
  const close = candles[candles.length - 1].close;
  const support = lastValid(features.supportResistance.support);
  const resistance = lastValid(features.supportResistance.resistance);

  // Distance from support/resistance indicates potential
  const range = resistance - support;
  const distanceFromSupport = close - support;
  const distanceFromResistance = resistance - close;

  // Close near support = bullish, close near resistance = bearish
  const position = distanceFromSupport / range; // 0 to 1

  // Map: 0 (at support) -> +1, 1 (at resistance) -> -1
  const score = 1 - 2 * position;

  return {
    score: clamp(score),
    meta: { close, support, resistance, position: position * 100 }
  };
}

// ========== ADX DETECTOR ==========

export function detectADX(features: TechnicalFeatures): DetectorOutput {
  const adx = lastValid(features.adx);

  // ADX measures trend strength, not direction
  // High ADX (>25) with positive price movement = bullish
  // High ADX (>25) with negative price movement = bearish
  // Low ADX (<20) = weak trend (neutral)

  // For simplicity, we'll use ADX as a confidence multiplier
  // and derive direction from recent price action
  const closes = features.rsi.slice(-5).filter(v => !isNaN(v));
  const priceDirection = (closes?.length || 0) >= 2 ? (closes[closes.length - 1] > closes[0] ? 1 : -1) : 0;

  const adxStrength = Math.min(adx / 50, 1); // Normalize ADX to [0, 1]
  const score = priceDirection * adxStrength;

  return {
    score: clamp(score),
    meta: { adx, priceDirection: priceDirection > 0 ? 'up' : 'down', strength: adx }
  };
}

// ========== ROC DETECTOR ==========

export function detectROC(features: TechnicalFeatures): DetectorOutput {
  const roc = lastValid(features.roc);

  // ROC is rate of change (%)
  // Positive ROC = bullish, negative ROC = bearish
  // Normalize by dividing by typical range (e.g., 20%)
  const score = clamp(roc / 20);

  return {
    score,
    meta: { roc, trend: roc > 0 ? 'bullish' : 'bearish' }
  };
}

// ========== MARKET STRUCTURE DETECTOR ==========

export function detectMarketStructure(candles: OHLCVData[], features: TechnicalFeatures): DetectorOutput {
  // Market structure: higher highs & higher lows = bullish
  // lower highs & lower lows = bearish

  const swingHighs = features.swingHighs.slice(-5).filter(v => !isNaN(v));
  const swingLows = features.swingLows.slice(-5).filter(v => !isNaN(v));

  if (swingHighs.length < 2 || swingLows.length < 2) {
    return { score: 0, meta: { reason: 'insufficient_swing_points' } };
  }

  const higherHighs = swingHighs[swingHighs.length - 1] > swingHighs[0];
  const higherLows = swingLows[swingLows.length - 1] > swingLows[0];
  const lowerHighs = swingHighs[swingHighs.length - 1] < swingHighs[0];
  const lowerLows = swingLows[swingLows.length - 1] < swingLows[0];

  let score = 0;
  if (higherHighs && higherLows) {
    score = 1; // Bullish structure
  } else if (lowerHighs && lowerLows) {
    score = -1; // Bearish structure
  } else {
    score = 0; // Mixed/choppy
  }

  return {
    score,
    meta: { structure: score > 0 ? 'bullish' : score < 0 ? 'bearish' : 'choppy', swingHighs: swingHighs.length, swingLows: swingLows.length }
  };
}

// ========== REVERSAL DETECTOR ==========

export function detectReversal(candles: OHLCVData[], features: TechnicalFeatures): DetectorOutput {
  // Aggregate reversal signals:
  // 1. Bollinger re-entry
  // 2. RSI OB/OS + divergences
  // 3. Reversal candles (pin bar, engulfing)
  // 4. SMC sweep + CHOCH
  // 5. Fibonacci PRZ proximity

  let reversalScore = 0;
  let signals: string[] = [];

  const close = candles[candles.length - 1].close;
  const rsi = lastValid(features.rsi);
  const bollingerUpper = lastValid(features.bollinger.upper);
  const bollingerLower = lastValid(features.bollinger.lower);
  const sweep = features.smcMarkers.sweep[features.smcMarkers.sweep.length - 1];
  const choch = features.smcMarkers.choch[features.smcMarkers.choch.length - 1];

  // 1. Bollinger re-entry
  if (close < bollingerLower) {
    reversalScore += 0.3; // Bullish reversal potential
    signals.push('bollinger_oversold');
  } else if (close > bollingerUpper) {
    reversalScore -= 0.3; // Bearish reversal potential
    signals.push('bollinger_overbought');
  }

  // 2. RSI OB/OS
  if (rsi < 30) {
    reversalScore += 0.3; // Bullish reversal
    signals.push('rsi_oversold');
  } else if (rsi > 70) {
    reversalScore -= 0.3; // Bearish reversal
    signals.push('rsi_overbought');
  }

  // 3. Reversal candles (simple pin bar detection)
  const lastCandle = candles[candles.length - 1];
  const body = Math.abs(lastCandle.close - lastCandle.open);
  const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
  const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;

  if (lowerWick > body * 2 && upperWick < body) {
    reversalScore += 0.2; // Bullish pin bar
    signals.push('bullish_pin_bar');
  } else if (upperWick > body * 2 && lowerWick < body) {
    reversalScore -= 0.2; // Bearish pin bar
    signals.push('bearish_pin_bar');
  }

  // 4. SMC sweep + CHOCH
  if (sweep) {
    reversalScore += 0.2; // Sweep suggests potential reversal
    signals.push('smc_sweep');
  }
  if (choch) {
    reversalScore += 0.2; // CHOCH confirms trend change
    signals.push('smc_choch');
  }

  // 5. Fibonacci PRZ proximity
  if (features.fibonacci.prz) {
    const { upper, lower } = features.fibonacci.prz;
    if (close >= lower && close <= upper) {
      reversalScore += 0.3; // In PRZ, reversal likely
      signals.push('fib_prz');
    }
  }

  return {
    score: clamp(reversalScore),
    meta: { signals, count: signals.length }
  };
}

// ========== SENTIMENT DETECTOR ==========

export async function detectSentiment(symbol?: string): Promise<DetectorOutput> {
  const logger = Logger.getInstance();
  const fearGreedService = FearGreedService.getInstance();

  try {
    // Fetch real Fear & Greed Index
    const fearGreedData = await fearGreedService.getFearGreedIndex();

    if (!fearGreedData) {
      logger.warn('Sentiment detector: No Fear & Greed data available, returning neutral');
      return { score: 0.5, meta: { reason: 'no_sentiment_data', source: 'neutral_fallback' } };
    }

    const fearGreed = fearGreedData.value;

    // Fear & Greed: 0 (fear) -> -1, 100 (greed) -> +1
    // But we interpret: Fear = buying opportunity (bullish), Greed = risk (bearish)
    // So we invert: low values (fear) -> positive score, high values (greed) -> negative score
    const fgScore = (50 - fearGreed) / 50; // Inverted for contrarian signal

    const score = clamp(fgScore);

    return {
      score,
      meta: {
        fearGreed,
        classification: fearGreedData.classification,
        interpretation: score > 0 ? 'opportunity' : 'caution',
        source: 'alternative.me'
      }
    };
  } catch (error: any) {
    logger.warn('Sentiment detector failed, falling back to neutral', { error: error?.message });
    return { score: 0.5, meta: { reason: 'error', error: error?.message, source: 'neutral_fallback' } };
  }
}

// ========== NEWS DETECTOR ==========

export async function detectNews(symbol?: string): Promise<DetectorOutput> {
  const logger = Logger.getInstance();
  const newsService = SentimentNewsService.getInstance();

  try {
    // Fetch real crypto news (limit to recent 10 articles)
    const newsData = await newsService.getCryptoNews(10);

    if (!newsData || newsData.length === 0) {
      logger.warn('News detector: No news data available, returning neutral');
      return { score: 0.5, meta: { reason: 'no_news_data', source: 'neutral_fallback' } };
    }

    // Simple sentiment scoring based on keywords
    let totalScore = 0;
    let count = 0;

    const bullishKeywords = ['bullish', 'surge', 'rally', 'gain', 'breakthrough', 'adoption', 'pump'];
    const bearishKeywords = ['bearish', 'crash', 'dump', 'decline', 'fall', 'drop', 'sell-off'];

    for (const news of newsData) {
      const text = (news.title || '').toLowerCase();
      let polarity = 0;

      // Count keyword matches
      const bullishCount = bullishKeywords.filter(kw => text.includes(kw)).length;
      const bearishCount = bearishKeywords.filter(kw => text.includes(kw)).length;

      if (bullishCount > bearishCount) {
        polarity = 0.3 * bullishCount;
      } else if (bearishCount > bullishCount) {
        polarity = -0.3 * bearishCount;
      }

      totalScore += polarity;
      count++;
    }

    const avgScore = count > 0 ? totalScore / count : 0;

    return {
      score: clamp(avgScore),
      meta: { newsCount: count, avgPolarity: avgScore, source: 'real_news_api' }
    };
  } catch (error: any) {
    logger.warn('News detector failed, falling back to neutral', { error: error?.message });
    return { score: 0.5, meta: { reason: 'error', error: error?.message, source: 'neutral_fallback' } };
  }
}

// ========== WHALES DETECTOR ==========

export async function detectWhales(symbol?: string): Promise<DetectorOutput> {
  const logger = Logger.getInstance();
  const whaleService = WhaleTrackerService.getInstance();

  try {
    // Fetch real whale activity data
    const whaleData = await whaleService.trackWhaleActivity(symbol || 'BTC');

    if (!whaleData || !whaleData.largeTransactions || whaleData.largeTransactions.length === 0) {
      logger.warn('Whales detector: No whale data available, returning neutral');
      return { score: 0.5, meta: { reason: 'no_whale_data', source: 'neutral_fallback' } };
    }

    // Calculate net flow from recent transactions
    let netFlow = 0;
    let txCount = 0;

    for (const tx of whaleData.largeTransactions.slice(0, 20)) {
      // IN direction = inflow to exchange = distribution (bearish)
      // OUT direction = outflow from exchange = accumulation (bullish)
      if (tx.direction === 'IN') {
        netFlow += (tx.amount || 0); // Inflow to exchange (distribution)
      } else if (tx.direction === 'OUT') {
        netFlow -= (tx.amount || 0); // Outflow from exchange (accumulation)
      }
      txCount++;
    }

    // Inflow to exchanges (positive netFlow) = bearish (they might sell)
    // Outflow from exchanges (negative netFlow) = bullish (accumulation)
    const normalizedFlow = netFlow / 1000000; // Normalize by typical flow size
    const score = clamp(-normalizedFlow);

    return {
      score,
      meta: {
        netFlow,
        txCount,
        interpretation: score > 0 ? 'accumulation' : score < 0 ? 'distribution' : 'neutral',
        source: 'whale_tracker'
      }
    };
  } catch (error: any) {
    logger.warn('Whales detector failed, falling back to neutral', { error: error?.message });
    return { score: 0.5, meta: { reason: 'error', error: error?.message, source: 'neutral_fallback' } };
  }
}

// ========== DETECTOR REGISTRY ==========

export const DETECTORS = {
  ml_ai: detectMLAI,
  rsi: detectRSI,
  macd: detectMACD,
  ma_cross: detectMACross,
  bollinger: detectBollinger,
  volume: detectVolume,
  support_resistance: detectSupportResistance,
  adx: detectADX,
  roc: detectROC,
  market_structure: detectMarketStructure,
  reversal: detectReversal,
  sentiment: detectSentiment,
  news: detectNews,
  whales: detectWhales
};

export type DetectorKey = keyof typeof DETECTORS;
