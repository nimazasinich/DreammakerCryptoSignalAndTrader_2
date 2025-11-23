/**
 * Strategy Pipeline Controller
 *
 * Handles the end-to-end Strategy 1 → 2 → 3 pipeline execution
 * Returns structured data with smart scoring details
 */

import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import {
  StrategyPipelineResult,
  StrategyPipelineParams,
  Strategy1Result,
  Strategy2Result,
  Strategy3Result,
  StageMetadata,
  ScoringOverview
} from '../types/strategyPipeline.js';
import { runStrategy1 } from '../strategies/strategy1.js';
import { runStrategy2 } from '../strategies/strategy2.js';
import { runStrategy3 } from '../strategies/strategy3.js';
import { FinalDecision, CategoryScore } from '../types/signals.js';
import { TradeEngine, TradeSignal } from '../engine/trading/TradeEngine.js';
import fs from 'fs';
import path from 'path';

export class StrategyPipelineController {
  private logger = Logger.getInstance();
  private tradeEngine: TradeEngine;

  constructor() {
    this.tradeEngine = TradeEngine.getInstance();
  }

  /**
   * Run the complete Strategy 1 → 2 → 3 pipeline
   * POST /api/strategies/pipeline/run
   *
   * Body:
   * {
   *   symbols?: string[],         // Optional: specific symbols to analyze
   *   timeframes?: string[],      // Optional: timeframes to use (default: ['15m', '1h', '4h'])
   *   limit?: number,             // Optional: max symbols to process (default: 50)
   *   mode?: 'offline' | 'online' // Optional: data source mode (default: 'offline')
   * }
   */
  async runPipeline(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    this.logger.info('Strategy pipeline execution started', { body: req.body });

    try {
      const params: StrategyPipelineParams = {
        symbols: req.body.symbols,
        timeframes: req.body.timeframes || ['15m', '1h', '4h'],
        limit: req.body.limit || 50,
        mode: req.body.mode || 'offline'
      };

      // ==========================================
      // STRATEGY 1: Wide Universe Scanning
      // ==========================================
      const s1Start = Date.now();
      this.logger.info('Running Strategy 1 - Wide universe scanning');

      // Get symbol universe (use provided symbols or load from market data)
      const symbolUniverse = params.symbols
        ? params.symbols.map((sym, idx) => ({
            symbol: sym,
            rank: idx + 1,
            volumeUsd24h: 10_000_000, // Placeholder
            priceUsd: 0
          }))
        : await this.getTopSymbols(params.limit || 50);

      const strategy1Raw = await runStrategy1({
        symbols: symbolUniverse,
        timeframe: params.timeframes![0], // Use first timeframe for Strategy 1
        mode: params.mode
      });

      // Transform Strategy 1 results
      const strategy1Results: Strategy1Result[] = strategy1Raw.map((r, idx) => ({
        symbol: r.symbol,
        rank: idx + 1,
        finalStrategyScore: r.decision.finalStrategyScore || r.decision.score,
        confidence: r.decision.confidence,
        action: r.decision.action,
        categoryScores: r.decision.categoryScores || [],
        ...this.extractCategoryBreakdown(r.decision),
        priceUsd: r.priceUsd
      }));

      const s1Meta: StageMetadata = {
        totalProcessed: symbolUniverse.length,
        filteredCount: strategy1Results.length,
        avgScore: this.calculateAvgScore(strategy1Results),
        processingTimeMs: Date.now() - s1Start
      };

      this.logger.info('Strategy 1 completed', {
        processed: s1Meta.totalProcessed,
        filtered: s1Meta.filteredCount,
        avgScore: s1Meta.avgScore.toFixed(3),
        timeMs: s1Meta.processingTimeMs
      });

      // ==========================================
      // STRATEGY 2: Refined Set with ETA
      // ==========================================
      const s2Start = Date.now();
      this.logger.info('Running Strategy 2 - Refined analysis with ETA');

      const strategy2Raw = await runStrategy2({
        topFromS1: strategy1Raw,
        timeframe: params.timeframes![1] || '15m', // Use second timeframe
        mode: params.mode
      });

      const strategy2Results: Strategy2Result[] = strategy2Raw.map((r, idx) => ({
        symbol: r.symbol,
        rank: idx + 1,
        finalStrategyScore: r.decision.finalStrategyScore || r.decision.score,
        confidence: r.decision.confidence,
        action: r.decision.action,
        categoryScores: r.decision.categoryScores || [],
        ...this.extractCategoryBreakdown(r.decision),
        etaMinutes: r.etaMinutes
      }));

      const s2Meta: StageMetadata = {
        totalProcessed: strategy1Results.length,
        filteredCount: strategy2Results.length,
        avgScore: this.calculateAvgScore(strategy2Results),
        processingTimeMs: Date.now() - s2Start
      };

      this.logger.info('Strategy 2 completed', {
        processed: s2Meta.totalProcessed,
        filtered: s2Meta.filteredCount,
        avgScore: s2Meta.avgScore.toFixed(3),
        timeMs: s2Meta.processingTimeMs
      });

      // ==========================================
      // STRATEGY 3: Top Picks with Entry Plans
      // ==========================================
      const s3Start = Date.now();
      this.logger.info('Running Strategy 3 - Final picks with entry plans');

      const strategy3Raw = await runStrategy3({
        topFromS2: strategy2Raw
      });

      const strategy3Results: Strategy3Result[] = strategy3Raw.map((r, idx) => ({
        symbol: r.symbol,
        rank: idx + 1,
        finalStrategyScore: r.finalStrategyScore,
        confidence: 0.8, // Placeholder if not available
        bias: r.action === 'BUY' ? 'LONG' : r.action === 'SELL' ? 'SHORT' : 'HOLD',
        categoryScores: r.categoryScores || [],
        core: r.categoryScores?.find(c => c.name === 'core')?.rawScore || 0,
        smc: r.categoryScores?.find(c => c.name === 'smc')?.rawScore || 0,
        patterns: r.categoryScores?.find(c => c.name === 'patterns')?.rawScore || 0,
        sentiment: r.categoryScores?.find(c => c.name === 'sentiment')?.rawScore || 0,
        ml: r.categoryScores?.find(c => c.name === 'ml')?.rawScore || 0,
        entryLevels: r.entryLevels,
        risk: r.risk,
        summary: r.summary,
        telemetry: r.telemetry
      }));

      const s3Meta: StageMetadata = {
        totalProcessed: strategy2Results.length,
        filteredCount: strategy3Results.length,
        avgScore: this.calculateAvgScore(strategy3Results),
        processingTimeMs: Date.now() - s3Start
      };

      this.logger.info('Strategy 3 completed', {
        processed: s3Meta.totalProcessed,
        filtered: s3Meta.filteredCount,
        avgScore: s3Meta.avgScore.toFixed(3),
        timeMs: s3Meta.processingTimeMs
      });

      // ==========================================
      // SCORING OVERVIEW
      // ==========================================
      const scoringOverview = this.buildScoringOverview(strategy1Raw, strategy3Raw);

      // ==========================================
      // AUTO-TRADE HOOK (if enabled)
      // ==========================================
      let autoTradeResult: any = null;
      const autoTradeConfig = this.loadAutoTradeConfig();

      if (autoTradeConfig.enabled && strategy3Results.length > 0) {
        this.logger.info('Auto-trade enabled, attempting to execute top Strategy 3 pick');

        const topCandidate = strategy3Results[0];

        // Check if score meets minimum threshold and action is allowed
        if (
          topCandidate.finalStrategyScore >= autoTradeConfig.minScore &&
          autoTradeConfig.allowedActions.includes(topCandidate.bias as any)
        ) {
          // Build trade signal
          const signal: TradeSignal = {
            source: 'strategy-pipeline',
            symbol: topCandidate.symbol,
            action: topCandidate.bias === 'LONG' ? 'BUY' : topCandidate.bias === 'SHORT' ? 'SELL' : 'HOLD',
            confidence: topCandidate.confidence,
            score: topCandidate.finalStrategyScore,
            timestamp: Date.now()
          };

          try {
            const executionResult = await this.tradeEngine.executeSignal(
              signal,
              autoTradeConfig.quantityUSDT
            );

            autoTradeResult = {
              attempted: true,
              executed: executionResult.executed,
              reason: executionResult.reason || null,
              order: executionResult.order || null
            };

            this.logger.info('Auto-trade execution result', autoTradeResult);
          } catch (error) {
            this.logger.error('Auto-trade execution failed', {}, error as Error);
            autoTradeResult = {
              attempted: true,
              executed: false,
              reason: `Execution error: ${(error as Error).message}`,
              order: null
            };
          }
        } else {
          this.logger.info('Top candidate does not meet auto-trade criteria', {
            score: topCandidate.finalStrategyScore,
            minScore: autoTradeConfig.minScore,
            action: topCandidate.bias,
            allowedActions: autoTradeConfig.allowedActions
          });
          autoTradeResult = {
            attempted: false,
            reason: 'Score or action does not meet criteria'
          };
        }
      } else if (!autoTradeConfig.enabled) {
        autoTradeResult = {
          attempted: false,
          reason: 'Auto-trade disabled in config'
        };
      } else {
        autoTradeResult = {
          attempted: false,
          reason: 'No Strategy 3 results available'
        };
      }

      // ==========================================
      // BUILD FINAL RESULT
      // ==========================================
      const result: StrategyPipelineResult = {
        strategy1: {
          symbols: strategy1Results,
          meta: s1Meta
        },
        strategy2: {
          symbols: strategy2Results,
          meta: s2Meta
        },
        strategy3: {
          symbols: strategy3Results,
          meta: s3Meta
        },
        scoring: scoringOverview,
        autoTrade: autoTradeResult,
        timestamp: Date.now()
      };

      const totalTime = Date.now() - startTime;
      this.logger.info('Strategy pipeline execution completed', {
        totalTimeMs: totalTime,
        s1Count: strategy1Results.length,
        s2Count: strategy2Results.length,
        s3Count: strategy3Results.length
      });

      res.json({
        success: true,
        data: result,
        timestamp: Date.now()
      });

    } catch (error) {
      this.logger.error('Strategy pipeline execution failed', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute strategy pipeline',
        message: (error as Error).message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Extract category breakdown from FinalDecision
   */
  private extractCategoryBreakdown(decision: FinalDecision): {
    core: number;
    smc: number;
    patterns: number;
    sentiment: number;
    ml: number;
  } {
    const categoryScores = decision.categoryScores || [];

    return {
      core: categoryScores.find(c => c.name === 'core')?.rawScore || 0,
      smc: categoryScores.find(c => c.name === 'smc')?.rawScore || 0,
      patterns: categoryScores.find(c => c.name === 'patterns')?.rawScore || 0,
      sentiment: categoryScores.find(c => c.name === 'sentiment')?.rawScore || 0,
      ml: categoryScores.find(c => c.name === 'ml')?.rawScore || 0
    };
  }

  /**
   * Calculate average score from results
   */
  private calculateAvgScore(results: Array<{ finalStrategyScore: number }>): number {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + r.finalStrategyScore, 0);
    return sum / results.length;
  }

  /**
   * Build scoring overview from pipeline results
   */
  private buildScoringOverview(strategy1Raw: any[], strategy3Raw: any[]): ScoringOverview {
    // Get adaptive config status
    const adaptiveEnabled = this.loadAdaptiveConfig();

    // Extract telemetry summary from latest result
    const latestTelemetry = strategy3Raw[0]?.telemetry;

    // Get effective weights from first result
    const effectiveWeights = strategy1Raw[0]?.decision?.effectiveWeights || {
      categories: { core: 0.40, smc: 0.25, patterns: 0.20, sentiment: 0.10, ml: 0.05 },
      isAdaptive: false,
      lastUpdated: Date.now()
    };

    // Determine best category from telemetry
    let bestCategory = undefined;
    if (latestTelemetry?.bestCategory) {
      bestCategory = {
        name: latestTelemetry.bestCategory,
        winRate: latestTelemetry.winRate || 0,
        totalSignals: latestTelemetry.totalSignals || 0
      };
    }

    return {
      adaptiveEnabled,
      effectiveWeights,
      telemetrySummary: latestTelemetry,
      bestCategory
    };
  }

  /**
   * Load adaptive config status
   */
  private loadAdaptiveConfig(): boolean {
    try {
      const configPath = path.join(process.cwd(), 'config', 'scoring.config.json');
      if (fs.existsSync(configPath)) {
        const rawData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(rawData);
        return config.adaptive?.enabled || false;
      }
    } catch (error) {
      this.logger.warn('Failed to load adaptive config', {}, error as Error);
    }
    return false;
  }

  /**
   * Load auto-trade config
   */
  private loadAutoTradeConfig(): {
    enabled: boolean;
    minScore: number;
    allowedActions: string[];
    quantityUSDT: number;
  } {
    try {
      const configPath = path.join(process.cwd(), 'config', 'scoring.config.json');
      if (fs.existsSync(configPath)) {
        const rawData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(rawData);
        if (config.autoTrade) {
          return config.autoTrade;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load auto-trade config', {}, error as Error);
    }

    // Default config - disabled
    return {
      enabled: false,
      minScore: 0.80,
      allowedActions: ['BUY', 'SELL'],
      quantityUSDT: 100
    };
  }

  /**
   * Get top symbols from market (fallback if not provided)
   */
  private async getTopSymbols(limit: number): Promise<Array<{
    symbol: string;
    rank: number;
    volumeUsd24h: number;
    priceUsd: number;
  }>> {
    // Simple fallback: return top crypto symbols
    const topSymbols = [
      'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'SOL/USDT',
      'ADA/USDT', 'DOGE/USDT', 'MATIC/USDT', 'DOT/USDT', 'AVAX/USDT',
      'LINK/USDT', 'UNI/USDT', 'ATOM/USDT', 'LTC/USDT', 'ETC/USDT',
      'XLM/USDT', 'ALGO/USDT', 'VET/USDT', 'FIL/USDT', 'TRX/USDT'
    ];

    return topSymbols.slice(0, limit).map((symbol, idx) => ({
      symbol,
      rank: idx + 1,
      volumeUsd24h: 50_000_000 - (idx * 1_000_000), // Mock volume
      priceUsd: 0
    }));
  }

  /**
   * Get pipeline status (health check)
   * GET /api/strategies/pipeline/status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const adaptiveEnabled = this.loadAdaptiveConfig();

      res.json({
        success: true,
        status: 'ready',
        adaptiveScoring: adaptiveEnabled,
        availableTimeframes: ['5m', '15m', '1h', '4h', '1d'],
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get pipeline status', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pipeline status',
        timestamp: Date.now()
      });
    }
  }
}
