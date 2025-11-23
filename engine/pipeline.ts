import { Bar, FinalDecision } from '../types/signals';
import { heuristicCore } from '../lib/heuristicCore';
import { detectSMC } from '../detectors/smc';
import { detectElliott } from '../detectors/elliott';
import { detectHarmonics } from '../detectors/harmonics';
import { detectClassical } from '../detectors/classical';
import { detectFibonacci } from '../detectors/fibonacci';
import { detectSAR } from '../detectors/sar';
import { detectRPercent } from '../detectors/rpercent';
import { sentimentLayer } from '../detectors/sentiment';
import { newsLayer } from '../detectors/news';
import { whalesLayer } from '../detectors/whales';
import { mlPredict } from '../detectors/ml';
import { aggregateScores } from './scoreAggregator';
import { Logger } from '../core/Logger';
import { LayerScore } from '../types/signals';

/**
 * Main Strategy Pipeline - Orchestrates all detectors and analysis layers
 *
 * Flow:
 * 1. Core heuristic analysis (RSI, MACD, etc.)
 * 2. Smart Money Concepts (SMC) - Order Blocks, FVG, BoS
 * 3. Pattern detection (Elliott, Harmonics, Classical)
 * 4. Auxiliary indicators (Fibonacci, SAR, R%)
 * 5. Sentiment analysis (Fear&Greed, News, Whales) - ASYNC with real APIs
 * 6. ML prediction (optional AI boost)
 * 7. Score aggregation and final decision
 *
 * Error Handling:
 * - Critical failures (core, patterns): Pipeline fails
 * - Non-critical failures (sentiment, news, whales): Gracefully degrade to neutral
 * - All errors are logged for monitoring
 */
export async function runStrategyPipeline(ohlcv: Bar[], symbol: string): Promise<FinalDecision> {
  const logger = Logger.getInstance();

  logger.info('Starting strategy pipeline', { symbol, bars: ohlcv.length });

  // ========== SYNCHRONOUS DETECTORS (Technical Analysis) ==========

  // Core indicators (RSI, MACD, etc.) - CRITICAL
  const core = heuristicCore(ohlcv);

  // Smart Money Concepts - CRITICAL
  const smc = detectSMC(ohlcv, symbol);

  // Pattern detection - IMPORTANT
  const ell = detectElliott(ohlcv);
  const har = detectHarmonics(ohlcv);
  const cls = detectClassical(ohlcv);

  // Auxiliary indicators - SUPPORTING
  const fib = detectFibonacci(ohlcv);
  const sar = detectSAR(ohlcv);
  const rpr = detectRPercent(ohlcv);

  // Aggregate pattern scores
  const patternsCombinedScore = 0.5 * ell.score + 0.3 * har.score + 0.2 * cls.score;
  const patterns = {
    elliott: ell,
    harmonic: har,
    classical: cls,
    combined: {
      score: patternsCombinedScore,
      reasons: [...ell.reasons, ...har.reasons, ...cls.reasons].slice(0, 3)
    }
  };

  // ========== ASYNCHRONOUS DETECTORS (External APIs) ==========

  // Sentiment, News, Whale detectors now use real APIs
  // These are NON-CRITICAL - pipeline continues even if they fail

  let sent: LayerScore;
  let news: LayerScore;
  let whales: LayerScore;

  // Sentiment Analysis (Fear&Greed, Social, etc.)
  try {
    logger.debug('Fetching sentiment data', { symbol });
    sent = await sentimentLayer(symbol);
    logger.info('Sentiment analysis completed', { symbol, score: sent.score.toFixed(3) });
  } catch (error) {
    logger.warn('Sentiment detector failed, using neutral fallback', { symbol }, error as Error);
    sent = {
      score: 0.5,
      reasons: ['Sentiment API unavailable', 'Using neutral baseline', 'Non-critical failure']
    };
  }

  // News Sentiment Analysis (NewsAPI + HuggingFace)
  try {
    logger.debug('Fetching news data', { symbol });
    news = await newsLayer(symbol);
    logger.info('News analysis completed', { symbol, score: news.score.toFixed(3) });
  } catch (error) {
    logger.warn('News detector failed, using neutral fallback', { symbol }, error as Error);
    news = {
      score: 0.5,
      reasons: ['News API unavailable', 'Using neutral baseline', 'Non-critical failure']
    };
  }

  // Whale Activity Tracking (Blockchain APIs)
  try {
    logger.debug('Fetching whale data', { symbol });
    whales = await whalesLayer(symbol);
    logger.info('Whale tracking completed', { symbol, score: whales.score.toFixed(3) });
  } catch (error) {
    logger.warn('Whale detector failed, using neutral fallback', { symbol }, error as Error);
    whales = {
      score: 0.5,
      reasons: ['Blockchain API unavailable', 'Using neutral baseline', 'Non-critical failure']
    };
  }

  // Aggregate sentiment scores (weighted average)
  const sentimentCombined = 0.5 * sent.score + 0.3 * news.score + 0.2 * whales.score;
  const sentiment = {
    sentiment: sent,
    news,
    whales,
    combined: {
      score: sentimentCombined,
      reasons: [...sent.reasons, ...news.reasons, ...whales.reasons].slice(0, 3)
    }
  };

  logger.info('All detectors completed', {
    symbol,
    core: core.score.toFixed(3),
    smc: smc.score.toFixed(3),
    patterns: patternsCombinedScore.toFixed(3),
    sentiment: sentimentCombined.toFixed(3)
  });

  // ========== ML PREDICTION (Optional AI Boost) ==========

  let ml: LayerScore;
  try {
    ml = await mlPredict({ symbol, core, smc, patterns, sentiment, aux: { fibonacci: fib, sar, rpercent: rpr } });
  } catch (error) {
    logger.warn('ML prediction failed, using neutral', { symbol }, error as Error);
    ml = { score: 0.5, reasons: ['ML unavailable'] };
  }

  // ========== FINAL AGGREGATION ==========

  const decision = aggregateScores(core, smc, patterns, sentiment, ml);
  decision.components.aux = { fibonacci: fib, sar, rpercent: rpr };

  logger.info('Pipeline completed successfully', {
    symbol,
    action: decision.action,
    score: decision.score.toFixed(3),
    confidence: decision.confidence.toFixed(3)
  });

  return decision;
}
