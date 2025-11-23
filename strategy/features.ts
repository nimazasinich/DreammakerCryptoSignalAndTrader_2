/**
 * FEATURES & INDICATORS MODULE
 * Provides derived features for detectors (RSI, MACD, MAs, Bollinger, ADX, ROC, S/R, SMC, etc.)
 */

import { CandlestickData } from '../types/index.js';

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalFeatures {
  rsi: number[];
  macd: { macd: number[]; signal: number[]; histogram: number[] };
  sma20: number[];
  sma50: number[];
  sma200: number[];
  ema12: number[];
  ema26: number[];
  bollinger: { upper: number[]; middle: number[]; lower: number[] };
  atr: number[];
  adx: number[];
  roc: number[];
  volume: number[];
  supportResistance: { support: number[]; resistance: number[] };
  swingHighs: number[];
  swingLows: number[];
  smcMarkers: { sweep: boolean[]; choch: boolean[] };
  fibonacci: { levels: number[]; prz: { upper: number; lower: number } | null };
}

/** Calculate Simple Moving Average */
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

/** Calculate Exponential Moving Average */
export function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = data[0];
  result.push(ema);

  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

/** Calculate RSI (Relative Strength Index) */
export function calculateRSI(closes: number[], period: number = 14): number[] {
  const result: number[] = [];
  const changes: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  for (let i = 0; i < changes.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const gains = changes.slice(i - period + 1, i + 1).filter(c => c > 0);
      const losses = changes.slice(i - period + 1, i + 1).filter(c => c < 0).map(c => Math.abs(c));
      const avgGain = (gains?.length || 0) > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
      const avgLoss = (losses?.length || 0) > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push(rsi);
      }
    }
  }

  return [NaN, ...result]; // Align with closes length
}

/** Calculate MACD */
export function calculateMACD(closes: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);
  const macd = (emaFast || []).map((val, idx) => val - emaSlow[idx]);
  const signal = calculateEMA(macd, signalPeriod);
  const histogram = (macd || []).map((val, idx) => val - signal[idx]);

  return { macd, signal, histogram };
}

/** Calculate Bollinger Bands */
export function calculateBollinger(closes: number[], period = 20, stdDev = 2) {
  const middle = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }

  return { upper, middle, lower };
}

/** Calculate ATR (Average True Range) */
export function calculateATR(candles: OHLCVData[], period = 14): number[] {
  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  const atr = calculateSMA(trueRanges, period);
  return [NaN, ...atr]; // Align with candles length
}

/** Calculate ADX (Average Directional Index) */
export function calculateADX(candles: OHLCVData[], period = 14): number[] {
  const result: number[] = [];

  for (let i = period; i < candles.length; i++) {
    const slice = candles.slice(i - period, i + 1);
    let plusDM = 0, minusDM = 0, tr = 0;

    for (let j = 1; j < slice.length; j++) {
      const highDiff = slice[j].high - slice[j - 1].high;
      const lowDiff = slice[j - 1].low - slice[j].low;

      if (highDiff > lowDiff && highDiff > 0) plusDM += highDiff;
      if (lowDiff > highDiff && lowDiff > 0) minusDM += lowDiff;

      tr += Math.max(
        slice[j].high - slice[j].low,
        Math.abs(slice[j].high - slice[j - 1].close),
        Math.abs(slice[j].low - slice[j - 1].close)
      );
    }

    const plusDI = (plusDM / tr) * 100;
    const minusDI = (minusDM / tr) * 100;
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI + 0.0001) * 100;
    result.push(dx);
  }

  // Fill beginning with NaN
  const padding = new Array(period).fill(NaN);
  return [...padding, ...result];
}

/** Calculate ROC (Rate of Change) */
export function calculateROC(closes: number[], period = 12): number[] {
  const result: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else {
      const roc = ((closes[i] - closes[i - period]) / closes[i - period]) * 100;
      result.push(roc);
    }
  }

  return result;
}

/** Detect Support and Resistance levels */
export function detectSupportResistance(candles: OHLCVData[], lookback = 20): { support: number[]; resistance: number[] } {
  const support: number[] = [];
  const resistance: number[] = [];

  for (let i = lookback; i < candles.length; i++) {
    const slice = candles.slice(i - lookback, i);
    const lows = (slice || []).map(c => c.low);
    const highs = (slice || []).map(c => c.high);

    support.push(Math.min(...lows));
    resistance.push(Math.max(...highs));
  }

  const padding = new Array(lookback).fill(NaN);
  return {
    support: [...padding, ...support],
    resistance: [...padding, ...resistance]
  };
}

/** Detect Swing Highs and Lows */
export function detectSwingPoints(candles: OHLCVData[], lookback = 5): { highs: number[]; lows: number[] } {
  const highs: number[] = [];
  const lows: number[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const window = candles.slice(i - lookback, i + lookback + 1);
    const current = candles[i];

    const isSwingHigh = window.every((c, idx) => idx === lookback || c.high <= current.high);
    const isSwingLow = window.every((c, idx) => idx === lookback || c.low >= current.low);

    highs.push(isSwingHigh ? current.high : NaN);
    lows.push(isSwingLow ? current.low : NaN);
  }

  const padding = new Array(lookback).fill(NaN);
  const endPadding = new Array(lookback).fill(NaN);
  return {
    highs: [...padding, ...highs, ...endPadding],
    lows: [...padding, ...lows, ...endPadding]
  };
}

/** Detect SMC (Smart Money Concepts) markers - Sweeps and CHOCH */
export function detectSMCMarkers(candles: OHLCVData[], lookback = 10): { sweep: boolean[]; choch: boolean[] } {
  const sweep: boolean[] = [];
  const choch: boolean[] = [];

  for (let i = lookback; i < candles.length; i++) {
    const slice = candles.slice(i - lookback, i + 1);
    const prevHigh = Math.max(...slice.slice(0, -1).map(c => c.high));
    const prevLow = Math.min(...slice.slice(0, -1).map(c => c.low));
    const current = candles[i];

    // Sweep: price moves beyond recent high/low then reverses quickly
    const isSweep = (current.high > prevHigh && current.close < prevHigh) ||
                    (current.low < prevLow && current.close > prevLow);

    // CHOCH (Change of Character): trend shift detection
    const prevTrend = slice[slice.length - 2].close > slice[0].close ? 'up' : 'down';
    const currentTrend = current.close > slice[0].close ? 'up' : 'down';
    const isChoch = prevTrend !== currentTrend;

    sweep.push(isSweep);
    choch.push(isChoch);
  }

  const padding = new Array(lookback).fill(false);
  return {
    sweep: [...padding, ...sweep],
    choch: [...padding, ...choch]
  };
}

/** Calculate Fibonacci levels and PRZ (Potential Reversal Zone) */
export function calculateFibonacci(candles: OHLCVData[], lookback = 50): { levels: number[]; prz: { upper: number; lower: number } | null } {
  if (candles.length < lookback) {
    return { levels: [], prz: null };
  }

  const slice = candles.slice(-lookback);
  const high = Math.max(...(slice || []).map(c => c.high));
  const low = Math.min(...(slice || []).map(c => c.low));
  const range = high - low;

  const levels = [
    low,
    low + range * 0.236,
    low + range * 0.382,
    low + range * 0.5,
    low + range * 0.618,
    low + range * 0.786,
    high
  ];

  // PRZ is typically around 0.618-0.786 retracement
  const prz = {
    upper: low + range * 0.786,
    lower: low + range * 0.618
  };

  return { levels, prz };
}

/** Generate all technical features for a given OHLCV dataset */
export function generateFeatures(candles: OHLCVData[]): TechnicalFeatures {
  const closes = (candles || []).map(c => c.close);
  const volumes = (candles || []).map(c => c.volume);

  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const bollinger = calculateBollinger(closes);
  const atr = calculateATR(candles);
  const adx = calculateADX(candles);
  const roc = calculateROC(closes);
  const supportResistance = detectSupportResistance(candles);
  const swingPoints = detectSwingPoints(candles);
  const smcMarkers = detectSMCMarkers(candles);
  const fibonacci = calculateFibonacci(candles);

  return {
    rsi,
    macd,
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    bollinger,
    atr,
    adx,
    roc,
    volume: volumes,
    supportResistance,
    swingHighs: swingPoints.highs,
    swingLows: swingPoints.lows,
    smcMarkers,
    fibonacci
  };
}
