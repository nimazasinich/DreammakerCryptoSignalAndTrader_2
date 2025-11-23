import { Logger } from '../core/Logger.js';
import { MarketData } from '../types/index.js';
import { SMCAnalyzer } from '../services/SMCAnalyzer.js';
import { ElliottWaveAnalyzer } from '../services/ElliottWaveAnalyzer.js';
import { HarmonicPatternDetector } from '../services/HarmonicPatternDetector.js';

// Utility to convert Date | number to number
const toTimestamp = (ts: Date | number): number =>
  typeof ts === 'number' ? ts : ts.getTime();

export interface TechnicalIndicators {
  sma: number[];
  ema: number[];
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr: number;
  obv: number;
}

export interface SMCFeatures {
  liquidityZones: Array<{
    price: number;
    volume: number;
    strength: number;
    type: 'ACCUMULATION' | 'DISTRIBUTION';
  }>;
  orderBlocks: Array<{
    high: number;
    low: number;
    timestamp: number;
    type: 'BULLISH' | 'BEARISH';
  }>;
  fairValueGaps: Array<{
    upper: number;
    lower: number;
    timestamp: number;
    filled: boolean;
    fillProbability: number;
  }>;
  breakOfStructure: {
    detected: boolean;
    type: 'BULLISH_BOS' | 'BEARISH_BOS';
    strength: number;
    displacement: number;
  };
}

export interface ElliottWaveFeatures {
  currentWave: {
    type: 'IMPULSE' | 'CORRECTIVE';
    wave: string;
    degree: 'MINUTE' | 'MINOR' | 'INTERMEDIATE' | 'PRIMARY';
  };
  completionProbability: number;
  nextExpectedDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  waveStructure: Array<{
    wave: string;
    start: number;
    end: number;
    price: number;
    timestamp: number;
  }>;
}

export interface HarmonicFeatures {
  patterns: Array<{
    type: 'GARTLEY' | 'BAT' | 'BUTTERFLY' | 'CRAB' | 'ABCD';
    points: {
      X: { price: number; timestamp: number };
      A: { price: number; timestamp: number };
      B: { price: number; timestamp: number };
      C: { price: number; timestamp: number };
      D?: { price: number; timestamp: number };
    };
    fibonacciLevels: Array<{
      level: number;
      price: number;
      type: 'RETRACEMENT' | 'EXTENSION';
    }>;
    prz: {
      upper: number;
      lower: number;
      confluence: number;
    };
    completionProbability: number;
    reliabilityScore: number;
  }>;
}

export class FeatureEngineering {
  private static instance: FeatureEngineering;
  private logger = Logger.getInstance();
  private smcAnalyzer = SMCAnalyzer.getInstance();
  private elliottWaveAnalyzer = ElliottWaveAnalyzer.getInstance();
  private harmonicDetector = HarmonicPatternDetector.getInstance();

  private constructor() {}

  static getInstance(): FeatureEngineering {
    if (!FeatureEngineering.instance) {
      FeatureEngineering.instance = new FeatureEngineering();
    }
    return FeatureEngineering.instance;
  }

  extractAllFeatures(marketData: MarketData[]): number[] {
    if (marketData.length < 50) {
      console.error('Insufficient market data for feature extraction');
    }

    const features: number[] = [];

    // Basic price features
    features.push(...this.extractPriceFeatures(marketData));

    // Technical indicators
    const technical = this.calculateTechnicalIndicators(marketData);
    features.push(...this.encodeTechnicalIndicators(technical));

    // SMC features
    const smc = this.extractSMCFeatures(marketData);
    features.push(...this.encodeSMCFeatures(smc));

    // Elliott Wave features
    const elliott = this.extractElliottWaveFeatures(marketData);
    features.push(...this.encodeElliottWaveFeatures(elliott));

    // Harmonic pattern features
    const harmonic = this.extractHarmonicFeatures(marketData);
    features.push(...this.encodeHarmonicFeatures(harmonic));

    // Regime features
    features.push(...this.extractRegimeFeatures(marketData));

    this.logger.debug('Features extracted', {
      totalFeatures: features.length,
      dataPoints: marketData.length
    });

    return features;
  }

  /**
   * Extract features with compatibility wrapper
   * Returns both raw features and technical indicators for backward compatibility
   */
  async extractFeatures(marketData: MarketData[]): Promise<{
    rawFeatures: number[];
    technicalIndicators: Record<string, number>;
  }> {
    if (marketData.length < 50) {
      console.error('Insufficient market data for feature extraction');
    }

    const rawFeatures = this.extractAllFeatures(marketData);
    
    // Extract technical indicators separately for compatibility
    const technical = this.calculateTechnicalIndicators(marketData);
    const technicalIndicators: Record<string, number> = {
      sma5: technical.sma[0] || 0,
      sma10: technical.sma[1] || 0,
      sma20: technical.sma[2] || 0,
      sma50: technical.sma[3] || 0,
      ema12: technical.ema[0] || 0,
      ema26: technical.ema[1] || 0,
      rsi: technical.rsi,
      macd: technical.macd.macd,
      macdSignal: technical.macd.signal,
      macdHistogram: technical.macd.histogram,
      bbUpper: technical.bollingerBands.upper,
      bbMiddle: technical.bollingerBands.middle,
      bbLower: technical.bollingerBands.lower,
      atr: technical.atr,
      obv: technical.obv
    };

    return {
      rawFeatures,
      technicalIndicators
    };
  }

  private extractPriceFeatures(data: MarketData[]): number[] {
    const latest = data[data.length - 1];
    const features: number[] = [];

    // Current OHLCV
    features.push(latest.open, latest.high, latest.low, latest.close, latest.volume);

    // Returns
    if ((data?.length || 0) >= 2) {
      const prev = data[data.length - 2];
      features.push((latest.close - prev.close) / prev.close);
      features.push(Math.log(latest.close / prev.close));
    } else {
      features.push(0, 0);
    }

    // Volatility measures
    const volatility = (latest.high - latest.low) / latest.close;
    features.push(volatility);

    // Volume relative to price
    features.push(latest.volume / latest.close);

    return features;
  }

  calculateTechnicalIndicators(data: MarketData[]): TechnicalIndicators {
    const closes = (data || []).map(d => d.close);
    const highs = (data || []).map(d => d.high);
    const lows = (data || []).map(d => d.low);
    const volumes = (data || []).map(d => d.volume);

    return {
      sma: [
        this.calculateSMA(closes, 5),
        this.calculateSMA(closes, 10),
        this.calculateSMA(closes, 20),
        this.calculateSMA(closes, 50)
      ],
      ema: [
        this.calculateEMA(closes, 12),
        this.calculateEMA(closes, 26)
      ],
      rsi: this.calculateRSI(closes, 14),
      macd: this.calculateMACD(closes),
      bollingerBands: this.calculateBollingerBands(closes, 20, 2),
      atr: this.calculateATR(data, 14),
      obv: this.calculateOBV(closes, volumes)
    };
  }

  private calculateSMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1] || 0;
    const slice = values.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  private calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    const multiplier = 2 / (period + 1);
    let ema = values[0];

    for (let i = 1; i < values.length; i++) {
      ema = (values[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  private calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;

    // Use Wilder's Smoothing Method for RSI (industry standard)
    let gains: number[] = [];
    let losses: number[] = [];

    // Calculate initial changes
    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate initial average gain and loss (first period)
    let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

    // Apply Wilder's smoothing for remaining periods
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
    if (closes.length < 26) {
      // Not enough data for proper MACD
      return { macd: 0, signal: 0, histogram: 0 };
    }

    // Calculate EMA12 and EMA26
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macd = ema12 - ema26;

    // Calculate MACD line over time for signal line
    const macdLine: number[] = [];
    for (let i = 26; i < closes.length; i++) {
      const periodCloses = closes.slice(0, i + 1);
      const periodEma12 = this.calculateEMA(periodCloses, 12);
      const periodEma26 = this.calculateEMA(periodCloses, 26);
      macdLine.push(periodEma12 - periodEma26);
    }

    // Calculate signal line as EMA9 of MACD line
    let signal = 0;
    if ((macdLine?.length || 0) >= 9) {
      signal = this.calculateEMA(macdLine, 9);
    } else if ((macdLine?.length || 0) > 0) {
      // Fallback: use simple average if not enough data for EMA9
      signal = macdLine.reduce((sum, val) => sum + val, 0) / macdLine.length;
    } else {
      signal = macd * 0.9; // Fallback approximation
    }

    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  private calculateBollingerBands(closes: number[], period: number, stdDev: number): { upper: number; middle: number; lower: number } {
    const middle = this.calculateSMA(closes, period);
    
    if (closes.length < period) {
      return { upper: middle, middle, lower: middle };
    }

    const slice = closes.slice(-period);
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: middle + (standardDeviation * stdDev),
      middle,
      lower: middle - (standardDeviation * stdDev)
    };
  }

  private calculateATR(data: MarketData[], period: number): number {
    if (data.length < period + 1) return 0;

    let atr = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      atr += tr;
    }

    return atr / period;
  }

  private calculateOBV(closes: number[], volumes: number[]): number {
    let obv = 0;
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) {
        obv += volumes[i];
      } else if (closes[i] < closes[i - 1]) {
        obv -= volumes[i];
      }
    }
    return obv;
  }

  private encodeTechnicalIndicators(indicators: TechnicalIndicators): number[] {
    const features: number[] = [];
    
    features.push(...indicators.sma);
    features.push(...indicators.ema);
    features.push(indicators.rsi);
    features.push(indicators.macd.macd, indicators.macd.signal, indicators.macd.histogram);
    features.push(indicators.bollingerBands.upper, indicators.bollingerBands.middle, indicators.bollingerBands.lower);
    features.push(indicators.atr);
    features.push(indicators.obv);

    return features;
  }

  extractSMCFeatures(data: MarketData[]): SMCFeatures {
    return this.smcAnalyzer.analyzeFullSMC(data);
  }

  private detectLiquidityZones(data: MarketData[]): Array<{ price: number; volume: number; strength: number; type: 'ACCUMULATION' | 'DISTRIBUTION' }> {
    const zones: Array<{ price: number; volume: number; strength: number; type: 'ACCUMULATION' | 'DISTRIBUTION' }> = [];
    
    // Simplified liquidity zone detection
    for (let i = 10; i < data.length - 10; i++) {
      const volumeWindow = data.slice(i - 5, i + 5);
      const avgVolume = volumeWindow.reduce((sum, d) => sum + d.volume, 0) / volumeWindow.length;
      
      if (data[i].volume > avgVolume * 2) {
        const priceChange = (data[i].close - data[i].open) / data[i].open;
        zones.push({
          price: data[i].close,
          volume: data[i].volume,
          strength: Math.abs(priceChange) * data[i].volume,
          type: priceChange > 0 ? 'ACCUMULATION' : 'DISTRIBUTION'
        });
      }
    }

    return zones.slice(-5); // Return last 5 zones
  }

  private detectOrderBlocks(data: MarketData[]): Array<{ high: number; low: number; timestamp: number; type: 'BULLISH' | 'BEARISH' }> {
    const blocks: Array<{ high: number; low: number; timestamp: number; type: 'BULLISH' | 'BEARISH' }> = [];
    
    // Simplified order block detection
    for (let i = 5; i < data.length - 5; i++) {
      const isHighVolume = data[i].volume > data.slice(i - 5, i + 5).reduce((sum, d) => sum + d.volume, 0) / 10 * 1.5;
      const isSignificantMove = Math.abs(data[i].close - data[i].open) / data[i].open > 0.02;
      
      if (isHighVolume && isSignificantMove) {
        blocks.push({
          high: data[i].high,
          low: data[i].low,
          timestamp: toTimestamp(data[i].timestamp),
          type: data[i].close > data[i].open ? 'BULLISH' : 'BEARISH'
        });
      }
    }

    return blocks.slice(-3); // Return last 3 blocks
  }

  private detectFairValueGaps(data: MarketData[]): Array<{ upper: number; lower: number; timestamp: number; filled: boolean; fillProbability: number }> {
    const gaps: Array<{ upper: number; lower: number; timestamp: number; filled: boolean; fillProbability: number }> = [];
    
    // Detect price gaps
    for (let i = 1; i < data.length; i++) {
      const prevHigh = data[i - 1].high;
      const prevLow = data[i - 1].low;
      const currentHigh = data[i].high;
      const currentLow = data[i].low;
      
      // Gap up
      if (currentLow > prevHigh) {
        gaps.push({
          upper: currentLow,
          lower: prevHigh,
          timestamp: toTimestamp(data[i].timestamp),
          filled: false,
          fillProbability: 0.7 // Historical probability
        });
      }
      // Gap down
      else if (currentHigh < prevLow) {
        gaps.push({
          upper: prevLow,
          lower: currentHigh,
          timestamp: toTimestamp(data[i].timestamp),
          filled: false,
          fillProbability: 0.7
        });
      }
    }

    return gaps.slice(-3); // Return last 3 gaps
  }

  private detectBreakOfStructure(data: MarketData[]): { detected: boolean; type: 'BULLISH_BOS' | 'BEARISH_BOS'; strength: number; displacement: number } {
    if (data.length < 20) {
      return { detected: false, type: 'BULLISH_BOS', strength: 0, displacement: 0 };
    }

    // Find recent highs and lows
    const recentData = data.slice(-20);
    const highs = (recentData || []).map(d => d.high);
    const lows = (recentData || []).map(d => d.low);
    
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    const currentPrice = data[data.length - 1].close;
    
    // Check for break of structure
    const highBreak = currentPrice > maxHigh * 1.01; // 1% break
    const lowBreak = currentPrice < minLow * 0.99; // 1% break
    
    if (highBreak) {
      return {
        detected: true,
        type: 'BULLISH_BOS',
        strength: (currentPrice - maxHigh) / maxHigh,
        displacement: currentPrice - maxHigh
      };
    } else if (lowBreak) {
      return {
        detected: true,
        type: 'BEARISH_BOS',
        strength: (minLow - currentPrice) / minLow,
        displacement: minLow - currentPrice
      };
    }

    return { detected: false, type: 'BULLISH_BOS', strength: 0, displacement: 0 };
  }

  private encodeSMCFeatures(smc: SMCFeatures): number[] {
    const features: number[] = [];
    
    // Liquidity zones
    features.push(smc.liquidityZones.length);
    if ((smc.liquidityZones?.length || 0) > 0) {
      const latest = smc.liquidityZones[smc.liquidityZones.length - 1];
      features.push(latest.strength, latest.type === 'ACCUMULATION' ? 1 : 0);
    } else {
      features.push(0, 0);
    }
    
    // Order blocks
    features.push(smc.orderBlocks.length);
    if ((smc.orderBlocks?.length || 0) > 0) {
      const latest = smc.orderBlocks[smc.orderBlocks.length - 1];
      features.push(latest.type === 'BULLISH' ? 1 : 0);
    } else {
      features.push(0);
    }
    
    // Fair value gaps
    features.push(smc.fairValueGaps.length);
    if ((smc.fairValueGaps?.length || 0) > 0) {
      const latest = smc.fairValueGaps[smc.fairValueGaps.length - 1];
      features.push(latest.fillProbability);
    } else {
      features.push(0);
    }
    
    // Break of structure
    features.push(smc.breakOfStructure.detected ? 1 : 0);
    features.push(smc.breakOfStructure.strength);
    features.push(smc.breakOfStructure.type === 'BULLISH_BOS' ? 1 : 0);

    return features;
  }

  extractElliottWaveFeatures(data: MarketData[]): ElliottWaveFeatures {
    return this.elliottWaveAnalyzer.analyzeElliottWaves(data);
  }

  private analyzeWaveStructure(data: MarketData[]): Array<{ wave: string; start: number; end: number; price: number; timestamp: number }> {
    // Simplified wave structure analysis
    const structure: Array<{ wave: string; start: number; end: number; price: number; timestamp: number }> = [];
    
    if ((data?.length || 0) >= 5) {
      const segment = Math.floor(data.length / 5);
      for (let i = 0; i < 5; i++) {
        const start = i * segment;
        const end = Math.min((i + 1) * segment, data.length - 1);
        structure.push({
          wave: (i + 1).toString(),
          start,
          end,
          price: data[end].close,
          timestamp: toTimestamp(data[end].timestamp)
        });
      }
    }
    
    return structure;
  }

  private encodeElliottWaveFeatures(elliott: ElliottWaveFeatures): number[] {
    const features: number[] = [];
    
    features.push(elliott.currentWave.type === 'IMPULSE' ? 1 : 0);
    features.push(parseInt(elliott.currentWave.wave) || 0);
    features.push(elliott.completionProbability);
    features.push(elliott.nextExpectedDirection === 'UP' ? 1 : (elliott.nextExpectedDirection === 'DOWN' ? -1 : 0));
    
    return features;
  }

  extractHarmonicFeatures(data: MarketData[]): HarmonicFeatures {
    const patterns = this.harmonicDetector.detectHarmonicPatterns(data);
    return { patterns };
  }

  private detectHarmonicPatterns(data: MarketData[]): Array<any> {
    // Simplified harmonic pattern detection
    const patterns: Array<any> = [];
    
    if ((data?.length || 0) >= 50) {
      // Look for potential ABCD pattern
      const pivots = this.findPivotPoints(data);
      if ((pivots?.length || 0) >= 4) {
        const [X, A, B, C] = pivots.slice(-4);
        patterns.push({
          type: 'ABCD',
          points: { X, A, B, C },
          fibonacciLevels: this.calculateFibonacciLevels(X, A, B, C),
          prz: { upper: C.price * 1.02, lower: C.price * 0.98, confluence: 0.8 },
          completionProbability: 0.7,
          reliabilityScore: 0.8
        });
      }
    }
    
    return patterns;
  }

  private findPivotPoints(data: MarketData[]): Array<{ price: number; timestamp: number }> {
    const pivots: Array<{ price: number; timestamp: number }> = [];
    const window = 5;
    
    for (let i = window; i < data.length - window; i++) {
      const slice = data.slice(i - window, i + window + 1);
      const center = slice[window];
      
      const isHigh = slice.every((d, idx) => idx === window || d.high <= center.high);
      const isLow = slice.every((d, idx) => idx === window || d.low >= center.low);
      
      if (isHigh) {
        pivots.push({ price: center.high, timestamp: toTimestamp(center.timestamp) });
      } else if (isLow) {
        pivots.push({ price: center.low, timestamp: toTimestamp(center.timestamp) });
      }
    }
    
    return pivots;
  }

  private calculateFibonacciLevels(X: any, A: any, B: any, C: any): Array<{ level: number; price: number; type: 'RETRACEMENT' | 'EXTENSION' }> {
    const levels = [0.236, 0.382, 0.5, 0.618, 0.786];
    const fibLevels: Array<{ level: number; price: number; type: 'RETRACEMENT' | 'EXTENSION' }> = [];
    
    const range = Math.abs(A.price - X.price);
    
    levels.forEach(level => {
      fibLevels.push({
        level,
        price: A.price + (range * level * (A.price > X.price ? -1 : 1)),
        type: 'RETRACEMENT'
      });
    });
    
    return fibLevels;
  }

  private encodeHarmonicFeatures(harmonic: HarmonicFeatures): number[] {
    const features: number[] = [];
    
    features.push(harmonic.patterns.length);
    if ((harmonic.patterns?.length || 0) > 0) {
      const latest = harmonic.patterns[harmonic.patterns.length - 1];
      features.push(latest.completionProbability);
      features.push(latest.reliabilityScore);
      features.push(latest.prz.confluence);
    } else {
      features.push(0, 0, 0);
    }
    
    return features;
  }

  private extractRegimeFeatures(data: MarketData[]): number[] {
    const features: number[] = [];
    
    if (data.length < 20) {
      return [0, 0, 0, 0]; // Default regime features
    }
    
    // Trend detection
    const sma20 = this.calculateSMA((data || []).map(d => d.close), 20);
    const currentPrice = data[data.length - 1].close;
    const trendStrength = (currentPrice - sma20) / sma20;
    
    // Volatility regime
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
    }
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
    
    // Volume regime
    const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
    const currentVolume = data[data.length - 1].volume;
    const volumeRatio = currentVolume / avgVolume;
    
    features.push(trendStrength);
    features.push(volatility);
    features.push(volumeRatio);
    features.push(trendStrength > 0.02 ? 1 : (trendStrength < -0.02 ? -1 : 0)); // Bull/Bear/Neutral regime
    
    return features;
  }
}