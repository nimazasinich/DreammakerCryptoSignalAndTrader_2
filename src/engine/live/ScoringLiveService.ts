/**
 * Live Scoring Service
 * Real-time scoring integration with live market data
 *
 * STRICT DATA POLICY:
 * - Uses ONLY real market data (no mocks, no fake values)
 * - If data is unavailable, returns null (not synthetic values)
 * - All scores computed from real candles, indicators, and detectors
 */

import { Logger } from '../../core/Logger.js';
import { ConfigManager } from '../../core/ConfigManager.js';
import { fetchOHLC } from '../MarketDataService.js';
import { analyzeSMC, analyzeElliott, analyzeHarmonic } from '../Analyzers.js';
import { SentimentAnalysisService } from '../../services/SentimentAnalysisService.js';
import { WhaleTrackerService } from '../../services/WhaleTrackerService.js';
import { RealMarketDataService } from '../../services/RealMarketDataService.js';
import { OHLC, DetectorScore } from '../types.js';
import fs from 'fs';
import path from 'path';

export interface LiveScoreResult {
  symbol: string;
  timestamp: number;
  finalScore: number | null;
  action: 'BUY' | 'SELL' | 'HOLD' | null;
  confidence: number | null;
  categoryScores: {
    core: number | null;
    smc: number | null;
    patterns: number | null;
    sentiment: number | null;
    ml: number | null;
  };
  detectorScores: {
    smartMoney: DetectorScore | null;
    elliott: DetectorScore | null;
    harmonic: DetectorScore | null;
    sentiment: number | null;
    whaleActivity: number | null;
  };
  meta: {
    candleCount: number;
    timeframe: string;
    dataSource: string;
    errors: string[];
  };
}

export class ScoringLiveService {
  private static instance: ScoringLiveService;
  private logger = Logger.getInstance();
  private configManager = ConfigManager.getInstance();
  private sentimentService = SentimentAnalysisService.getInstance();
  private whaleService = WhaleTrackerService.getInstance();
  private marketDataService = RealMarketDataService.getInstance();

  // Scoring configuration
  private scoringConfig: any = null;

  private constructor() {
    this.loadScoringConfig();
  }

  static getInstance(): ScoringLiveService {
    if (!ScoringLiveService.instance) {
      ScoringLiveService.instance = new ScoringLiveService();
    }
    return ScoringLiveService.instance;
  }

  /**
   * Load scoring configuration from scoring.config.json
   */
  private loadScoringConfig(): void {
    try {
      const configPath = path.join(process.cwd(), 'config', 'scoring.config.json');
      const configData = fs.readFileSync(configPath, 'utf-8');
      this.scoringConfig = JSON.parse(configData);
      this.logger.info('Loaded scoring configuration', {
        version: this.scoringConfig.version,
        categories: Object.keys(this.scoringConfig.categories || {})
      });
    } catch (error) {
      this.logger.error('Failed to load scoring configuration', {}, error as Error);
      // Set default weights if config load fails
      this.scoringConfig = {
        categories: {
          core: { weight: 0.40 },
          smc: { weight: 0.25 },
          patterns: { weight: 0.20 },
          sentiment: { weight: 0.10 },
          ml: { weight: 0.05 }
        },
        weights: {}
      };
    }
  }

  /**
   * Generate live score for a symbol
   * Uses ONLY real data - no synthetic values
   */
  async generateLiveScore(
    symbol: string,
    timeframe: string = '1h',
    limit: number = 200
  ): Promise<LiveScoreResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    this.logger.info(`Generating live score for ${symbol} ${timeframe}`, { symbol, timeframe, limit });

    // Initialize result with null values
    const result: LiveScoreResult = {
      symbol,
      timestamp: Date.now(),
      finalScore: null,
      action: null,
      confidence: null,
      categoryScores: {
        core: null,
        smc: null,
        patterns: null,
        sentiment: null,
        ml: null
      },
      detectorScores: {
        smartMoney: null,
        elliott: null,
        harmonic: null,
        sentiment: null,
        whaleActivity: null
      },
      meta: {
        candleCount: 0,
        timeframe,
        dataSource: 'real',
        errors: []
      }
    };

    // Step 1: Fetch real OHLC data
    let ohlc: OHLC[] = [];
    try {
      ohlc = await fetchOHLC(symbol, timeframe, limit);

      if (!ohlc || ohlc.length === 0) {
        errors.push('No OHLC data available');
        this.logger.warn('No OHLC data returned for symbol', { symbol, timeframe });
        result.meta.errors = errors;
        return result;
      }

      result.meta.candleCount = ohlc.length;
      this.logger.debug(`Fetched ${ohlc.length} candles for ${symbol}`, { symbol, timeframe, count: ohlc.length });
    } catch (error) {
      const errorMsg = `Failed to fetch OHLC: ${(error as Error).message}`;
      errors.push(errorMsg);
      this.logger.error('OHLC fetch failed', { symbol, timeframe }, error as Error);
      result.meta.errors = errors;
      return result;
    }

    // Step 2: Compute detector scores (SMC, Elliott, Harmonic)
    let smcScore: DetectorScore | null = null;
    let elliottScore: DetectorScore | null = null;
    let harmonicScore: DetectorScore | null = null;

    try {
      smcScore = analyzeSMC(ohlc);
      result.detectorScores.smartMoney = smcScore;
      this.logger.debug('SMC analysis complete', { symbol, score: smcScore.score });
    } catch (error) {
      errors.push(`SMC analysis failed: ${(error as Error).message}`);
      this.logger.error('SMC analysis failed', { symbol }, error as Error);
    }

    try {
      elliottScore = analyzeElliott(ohlc);
      result.detectorScores.elliott = elliottScore;
      this.logger.debug('Elliott analysis complete', { symbol, score: elliottScore.score });
    } catch (error) {
      errors.push(`Elliott analysis failed: ${(error as Error).message}`);
      this.logger.error('Elliott analysis failed', { symbol }, error as Error);
    }

    try {
      harmonicScore = analyzeHarmonic(ohlc);
      result.detectorScores.harmonic = harmonicScore;
      this.logger.debug('Harmonic analysis complete', { symbol, score: harmonicScore.score });
    } catch (error) {
      errors.push(`Harmonic analysis failed: ${(error as Error).message}`);
      this.logger.error('Harmonic analysis failed', { symbol }, error as Error);
    }

    // Step 3: Compute sentiment score
    let sentimentScore: number | null = null;
    try {
      const sentimentData = await this.sentimentService.analyzeSentiment(symbol);

      // Normalize sentiment from -100 to 100 range to 0 to 1 range
      if (sentimentData && typeof sentimentData.overallScore === 'number') {
        sentimentScore = (sentimentData.overallScore + 100) / 200;
        result.detectorScores.sentiment = sentimentScore;
        this.logger.debug('Sentiment analysis complete', { symbol, score: sentimentScore });
      } else {
        errors.push('Sentiment data unavailable');
      }
    } catch (error) {
      errors.push(`Sentiment analysis failed: ${(error as Error).message}`);
      this.logger.error('Sentiment analysis failed', { symbol }, error as Error);
    }

    // Step 4: Compute whale activity score
    let whaleScore: number | null = null;
    try {
      const whaleActivity = await this.whaleService.trackWhaleActivity(symbol);

      if (whaleActivity && whaleActivity.onChainMetrics) {
        // Normalize whale activity based on exchange flows and large transactions
        const netFlow = whaleActivity.exchangeFlows?.netFlow || 0;
        const txCount = whaleActivity.largeTransactions?.length || 0;

        // Positive net flow (to exchanges) = bearish, negative (from exchanges) = bullish
        // Score: 0.5 = neutral, >0.5 = bullish, <0.5 = bearish
        whaleScore = 0.5 - (netFlow / 1000000); // Normalize by $1M
        whaleScore += (txCount > 0 ? 0.1 : 0); // Bonus for whale activity
        whaleScore = Math.max(0, Math.min(1, whaleScore)); // Clamp to [0, 1]

        result.detectorScores.whaleActivity = whaleScore;
        this.logger.debug('Whale analysis complete', { symbol, score: whaleScore });
      } else {
        errors.push('Whale activity data unavailable');
      }
    } catch (error) {
      errors.push(`Whale activity analysis failed: ${(error as Error).message}`);
      this.logger.error('Whale activity analysis failed', { symbol }, error as Error);
    }

    // Step 5: Aggregate scores using category weights
    const categoryWeights = this.scoringConfig.categories || {};

    // Calculate category scores
    // Core: average of technical indicators (using SMC as proxy for now)
    if (smcScore) {
      result.categoryScores.core = smcScore.score;
    }

    // SMC: Smart Money Concepts
    if (smcScore) {
      result.categoryScores.smc = smcScore.score;
    }

    // Patterns: Elliott + Harmonic
    const patternScores: number[] = [];
    if (elliottScore) patternScores.push(elliottScore.score);
    if (harmonicScore) patternScores.push(harmonicScore.score);
    if (patternScores.length > 0) {
      result.categoryScores.patterns = patternScores.reduce((a, b) => a + b, 0) / patternScores.length;
    }

    // Sentiment: sentiment + whale activity
    const sentimentScores: number[] = [];
    if (sentimentScore !== null) sentimentScores.push(sentimentScore);
    if (whaleScore !== null) sentimentScores.push(whaleScore);
    if (sentimentScores.length > 0) {
      result.categoryScores.sentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;
    }

    // ML: Not implemented (would need ML model integration)
    result.categoryScores.ml = null;

    // Calculate final weighted score
    let finalScore = 0;
    let totalWeight = 0;

    if (result.categoryScores.core !== null && categoryWeights.core) {
      finalScore += result.categoryScores.core * categoryWeights.core.weight;
      totalWeight += categoryWeights.core.weight;
    }

    if (result.categoryScores.smc !== null && categoryWeights.smc) {
      finalScore += result.categoryScores.smc * categoryWeights.smc.weight;
      totalWeight += categoryWeights.smc.weight;
    }

    if (result.categoryScores.patterns !== null && categoryWeights.patterns) {
      finalScore += result.categoryScores.patterns * categoryWeights.patterns.weight;
      totalWeight += categoryWeights.patterns.weight;
    }

    if (result.categoryScores.sentiment !== null && categoryWeights.sentiment) {
      finalScore += result.categoryScores.sentiment * categoryWeights.sentiment.weight;
      totalWeight += categoryWeights.sentiment.weight;
    }

    // Normalize by total weight used
    if (totalWeight > 0) {
      result.finalScore = finalScore / totalWeight;

      // Determine action based on score
      const buyThreshold = this.scoringConfig.thresholds?.buyScore || 0.70;
      const sellThreshold = this.scoringConfig.thresholds?.sellScore || 0.30;

      if (result.finalScore >= buyThreshold) {
        result.action = 'BUY';
        result.confidence = result.finalScore;
      } else if (result.finalScore <= sellThreshold) {
        result.action = 'SELL';
        result.confidence = 1 - result.finalScore;
      } else {
        result.action = 'HOLD';
        result.confidence = 0.5;
      }
    } else {
      errors.push('No category scores available for aggregation');
    }

    // Set errors
    result.meta.errors = errors;

    const processingTime = Date.now() - startTime;
    this.logger.info(`Live score generated for ${symbol}`, {
      symbol,
      timeframe,
      finalScore: result.finalScore,
      action: result.action,
      processingTimeMs: processingTime,
      errorCount: errors.length
    });

    return result;
  }

  /**
   * Get current price for a symbol
   */
  async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const price = await this.marketDataService.getRealTimePrice(symbol.replace('USDT', ''), 'USD');
      return price;
    } catch (error) {
      this.logger.error('Failed to get current price', { symbol }, error as Error);
      return null;
    }
  }

  /**
   * Reload scoring configuration
   */
  reloadConfig(): void {
    this.loadScoringConfig();
  }
}
