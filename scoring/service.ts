/**
 * QUANTUM SCORING SERVICE
 * Main orchestration service for the Quantum Scoring System
 */

import { 
  ScoringSnapshot, 
  StrategicVerdict, 
  TFResult,
  DetectorName,
  ConstitutionalDetectorOutput,
  MarketContext
} from './types.js';
import { ConstitutionalConverter } from './converter.js';
import { SupremeJudicialCombiner } from './combiner.js';
import { WeightParliament } from './weights.js';
import { Logger } from '../core/Logger.js';
import { MarketData } from '../types/index.js';

// Import detector services
import { HarmonicPatternDetector } from '../services/HarmonicPatternDetector.js';
import { ElliottWaveAnalyzer } from '../services/ElliottWaveAnalyzer.js';
import { SMCAnalyzer } from '../services/SMCAnalyzer.js';
import { SentimentAnalysisService } from '../services/SentimentAnalysisService.js';
import { WhaleTrackerService } from '../services/WhaleTrackerService.js';

/**
 * Quantum Scoring Service
 * Orchestrates all detectors and combines scores
 */
export class QuantumScoringService {
  private static instance: QuantumScoringService;
  private logger = Logger.getInstance();
  private converter = ConstitutionalConverter;
  private combiner = SupremeJudicialCombiner.getInstance();
  private weightParliament = WeightParliament.getInstance();

  // Detector instances
  private harmonicDetector = HarmonicPatternDetector.getInstance();
  private elliottAnalyzer = ElliottWaveAnalyzer.getInstance();
  private smcAnalyzer = SMCAnalyzer.getInstance();
  private sentimentService = SentimentAnalysisService.getInstance();
  private whaleTracker = WhaleTrackerService.getInstance();

  private constructor() {}

  static getInstance(): QuantumScoringService {
    if (!QuantumScoringService.instance) {
      QuantumScoringService.instance = new QuantumScoringService();
    }
    return QuantumScoringService.instance;
  }

  /**
   * Generate complete scoring snapshot
   */
  async generateSnapshot(
    symbol: string,
    marketData: Map<string, MarketData[]>, // timeframe -> data[]
    marketContext?: MarketContext
  ): Promise<ScoringSnapshot> {
    const startTime = Date.now();

    try {
      // Collect detector scores for each timeframe
      const timeframeResults: TFResult[] = [];
      const timeframeKeys = Array.from(marketData.keys());

      for (const timeframe of timeframeKeys) {
        const data = marketData.get(timeframe);
        if (!data || data.length === 0) continue;

        const detectorScores = await this.collectDetectorScores(symbol, data, timeframe);
        const tfResult = this.combiner.combineOneTF(timeframe, detectorScores);
        timeframeResults.push(tfResult);
      }

      // Generate supreme verdict
      const verdict = this.combiner.deliverVerdict(timeframeResults, marketContext);

      // Generate detector performance metrics
      const detectorPerformance = await this.calculateDetectorPerformance(symbol);

      // Generate snapshot
      const snapshot: ScoringSnapshot = {
        timestamp: new Date().toISOString(),
        symbol,
        marketConditions: {
          volatility: marketContext?.volatility || 0,
          trend: marketContext?.trend || 'SIDEWAYS',
          volume: marketContext?.volume || 0
        },
        judicialProceedings: {
          timeframeCourts: timeframeResults,
          supremeVerdict: verdict,
          dissentingOpinions: (verdict.dissentingOpinions || []).map(d => ({
            detector: d.detector,
            timeframe: d.timeframe,
            opinion: d.opinion
          }))
        },
        detectorPerformance,
        systemHealth: {
          weightsVersion: this.weightParliament.getWeightsMetadata().version,
          lastConstitutionalAmendment: this.weightParliament.getWeightsMetadata().lastAmendment,
          detectorUptime: await this.getDetectorUptime()
        }
      };

      const duration = Date.now() - startTime;
      this.logger.debug('Scoring snapshot generated', {
        symbol,
        duration,
        verdict: verdict.action,
        score: verdict.quantumScore
      });

      return snapshot;
    } catch (error) {
      this.logger.error('Failed to generate scoring snapshot', { symbol }, error as Error);
      throw error;
    }
  }

  /**
   * Get quick verdict (single timeframe)
   */
  async getQuickVerdict(
    symbol: string,
    timeframe: string,
    marketData: MarketData[]
  ): Promise<StrategicVerdict> {
    const detectorScores = await this.collectDetectorScores(symbol, marketData, timeframe);
    const tfResult = this.combiner.combineOneTF(timeframe, detectorScores);
    return this.combiner.deliverVerdict([tfResult]);
  }

  /**
   * Collect detector scores for a timeframe
   */
  private async collectDetectorScores(
    symbol: string,
    marketData: MarketData[],
    timeframe: string
  ): Promise<Map<DetectorName, ConstitutionalDetectorOutput>> {
    const scores = new Map<DetectorName, ConstitutionalDetectorOutput>();

    try {
      // Harmonic Patterns
      try {
        const patterns = this.harmonicDetector.detectHarmonicPatterns(marketData);
        const converted = this.converter.convertHarmonic(patterns);
        scores.set('harmonic', converted);
      } catch (error) {
        this.logger.warn('Harmonic detector failed', { symbol, timeframe }, error as Error);
        scores.set('harmonic', this.getNeutralScore('harmonic'));
      }

      // Elliott Waves
      try {
        const analysis = this.elliottAnalyzer.analyzeElliottWaves(marketData);
        const converted = this.converter.convertElliott(analysis);
        scores.set('elliott', converted);
      } catch (error) {
        this.logger.warn('Elliott detector failed', { symbol, timeframe }, error as Error);
        scores.set('elliott', this.getNeutralScore('elliott'));
      }

      // SMC
      try {
        const smcFeatures = this.smcAnalyzer.analyzeFullSMC(marketData);
        const converted = this.converter.convertSMC(smcFeatures);
        scores.set('smc', converted);
      } catch (error) {
        this.logger.warn('SMC detector failed', { symbol, timeframe }, error as Error);
        scores.set('smc', this.getNeutralScore('smc'));
      }

      // Sentiment (async)
      try {
        const sentiment = await this.sentimentService.analyzeSentiment(symbol);
        const converted = this.converter.convertSentiment(sentiment);
        scores.set('sentiment', converted);
      } catch (error) {
        this.logger.warn('Sentiment detector failed', { symbol, timeframe }, error as Error);
        scores.set('sentiment', this.getNeutralScore('sentiment'));
      }

      // News (from sentiment)
      try {
        const sentiment = await this.sentimentService.analyzeSentiment(symbol);
        const converted = this.converter.convertNews(sentiment.newsImpact || []);
        scores.set('news', converted);
      } catch (error) {
        this.logger.warn('News detector failed', { symbol, timeframe }, error as Error);
        scores.set('news', this.getNeutralScore('news'));
      }

      // Whales
      try {
        const whaleActivity = await this.whaleTracker.trackWhaleActivity(symbol);
        const converted = this.converter.convertWhales(whaleActivity);
        scores.set('whales', converted);
      } catch (error) {
        this.logger.warn('Whale detector failed', { symbol, timeframe }, error as Error);
        scores.set('whales', this.getNeutralScore('whales'));
      }

      // Price Action (simple trend detection)
      try {
        const isBullish = this.detectPriceActionTrend(marketData);
        const converted = this.converter.convertPriceAction(isBullish, 0.7);
        scores.set('price_action', converted);
      } catch (error) {
        this.logger.warn('Price action detector failed', { symbol, timeframe }, error as Error);
        scores.set('price_action', this.getNeutralScore('price_action'));
      }

      // Fibonacci (placeholder - would need actual Fibonacci analysis)
      scores.set('fibonacci', this.getNeutralScore('fibonacci'));
      
      // SAR (placeholder - would need actual SAR calculation)
      scores.set('sar', this.getNeutralScore('sar'));

    } catch (error) {
      this.logger.error('Failed to collect detector scores', { symbol, timeframe }, error as Error);
    }

    return scores;
  }

  /**
   * Detect price action trend
   */
  private detectPriceActionTrend(marketData: MarketData[]): boolean {
    if (marketData.length < 2) return true;

    const recent = marketData.slice(-20);
    const firstPrice = recent[0].close;
    const lastPrice = recent[recent.length - 1].close;

    return lastPrice > firstPrice;
  }

  /**
   * Calculate detector performance metrics
   */
  private async calculateDetectorPerformance(symbol: string): Promise<Array<{
    detector: DetectorName;
    currentScore: number;
    historicalAccuracy: number;
    confidenceLevel: number;
  }>> {
    // In a real implementation, this would query historical performance
    // For now, return placeholder data
    return [
      { detector: 'harmonic', currentScore: 0, historicalAccuracy: 0.65, confidenceLevel: 0.7 },
      { detector: 'elliott', currentScore: 0, historicalAccuracy: 0.60, confidenceLevel: 0.65 },
      { detector: 'smc', currentScore: 0, historicalAccuracy: 0.70, confidenceLevel: 0.75 },
      { detector: 'sentiment', currentScore: 0, historicalAccuracy: 0.55, confidenceLevel: 0.60 },
      { detector: 'news', currentScore: 0, historicalAccuracy: 0.50, confidenceLevel: 0.55 },
      { detector: 'whales', currentScore: 0, historicalAccuracy: 0.65, confidenceLevel: 0.70 },
      { detector: 'price_action', currentScore: 0, historicalAccuracy: 0.68, confidenceLevel: 0.72 },
      { detector: 'fibonacci', currentScore: 0, historicalAccuracy: 0.62, confidenceLevel: 0.65 },
      { detector: 'sar', currentScore: 0, historicalAccuracy: 0.58, confidenceLevel: 0.60 }
    ];
  }

  /**
   * Get detector uptime statistics
   */
  private async getDetectorUptime(): Promise<Record<DetectorName, number>> {
    // In a real implementation, this would track actual uptime
    // For now, return 100% for all
    return {
      harmonic: 100,
      elliott: 100,
      fibonacci: 100,
      price_action: 100,
      smc: 100,
      sar: 100,
      sentiment: 100,
      news: 100,
      whales: 100,
      ml_ai: 100,
      rsi: 100,
      macd: 100,
      ma_cross: 100,
      bollinger: 100,
      volume: 100,
      support_resistance: 100,
      adx: 100,
      roc: 100,
      market_structure: 100,
      reversal: 100
    };
  }

  /**
   * Get neutral score for failed detectors
   */
  private getNeutralScore(detector: DetectorName): ConstitutionalDetectorOutput {
    return {
      score: 0,
      meta: { error: 'Detector unavailable' },
      detector,
      timestamp: Date.now(),
      confidence: 0
    };
  }
}
