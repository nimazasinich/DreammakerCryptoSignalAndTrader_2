/**
 * SCORING CONTROLLER
 * API endpoints for Quantum Scoring System
 */

import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { Database } from '../data/Database.js';
import { QuantumScoringService } from '../scoring/service.js';
import { WeightParliament } from '../scoring/weights.js';
import { MarketContext } from '../scoring/types.js';
import { ScoringLiveService } from '../engine/live/ScoringLiveService.js';
import { ScoreStreamGateway } from '../ws/ScoreStreamGateway.js';

export class ScoringController {
  private logger = Logger.getInstance();
  private database = Database.getInstance();
  private scoringService = QuantumScoringService.getInstance();
  private weightParliament = WeightParliament.getInstance();
  private liveScoring = ScoringLiveService.getInstance();
  private scoreStreamGateway = ScoreStreamGateway.getInstance();

  /**
   * Get enhanced snapshot with confluence, entry plan, and context
   * GET /api/scoring/snapshot-enhanced?symbol=BTCUSDT&tfs=15m&tfs=1h&tfs=4h
   */
  async getSnapshotEnhanced(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.query;
      const tfs = Array.isArray(req.query.tfs) ? req.query.tfs as string[] : (req.query.tfs ? [req.query.tfs as string] : ['15m', '1h', '4h']);

      if (!symbol || typeof symbol !== 'string') {
        res.status(400).json({
          error: 'Symbol parameter is required',
          example: '/api/scoring/snapshot-enhanced?symbol=BTCUSDT&tfs=15m&tfs=1h&tfs=4h'
        });
        return;
      }

      const upperSymbol = symbol.toUpperCase();

      // Import strategy engine dynamically
      const { runStrategyEngine } = await import('../strategy/engine.js');

      // Collect market data for requested timeframes
      const candlesMap = new Map<string, any[]>();

      for (const tf of tfs) {
        try {
          const data = await this.database.getMarketData(upperSymbol, tf, 100);
          if ((data?.length || 0) > 0) {
            // Convert to OHLCVData format
            const candles = (data || []).map((d: any) => ({
              timestamp: typeof d.timestamp === 'number' ? d.timestamp : new Date(d.timestamp).getTime(),
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
              volume: d.volume || 0
            }));
            candlesMap.set(tf, candles);
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch ${tf} data for ${upperSymbol}`, {}, error as Error);
        }
      }

      if (candlesMap.size === 0) {
        res.status(400).json({
          error: 'No market data available for symbol',
          symbol: upperSymbol
        });
        return;
      }

      // Optional: gather context data (sentiment, news, whales)
      const contextData = undefined;

      // Run strategy engine
      const snapshot = await runStrategyEngine(upperSymbol, candlesMap, contextData);

      res.json({
        success: true,
        snapshot,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get enhanced snapshot', { symbol: req.query.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to get enhanced snapshot',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get scoring snapshot
   * GET /api/scoring/snapshot?symbol=BTCUSDT
   */
  async getSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.query;

      if (!symbol || typeof symbol !== 'string') {
        res.status(400).json({
          error: 'Symbol parameter is required',
          example: '/api/scoring/snapshot?symbol=BTCUSDT'
        });
        return;
      }

      const upperSymbol = symbol.toUpperCase();
      const timeframes = ['5m', '15m', '1h', '4h', '1d'];
      
      // Collect market data for all timeframes
      const marketDataMap = new Map<string, any[]>();
      
      for (const tf of timeframes) {
        try {
          const data = await this.database.getMarketData(upperSymbol, tf, 100);
          if ((data?.length || 0) > 0) {
            marketDataMap.set(tf, data);
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch ${tf} data for ${upperSymbol}`, {}, error as Error);
        }
      }

      if (marketDataMap.size === 0) {
        res.status(400).json({
          error: 'No market data available for symbol',
          symbol: upperSymbol
        });
        return;
      }

      // Get market context
      const latestData = marketDataMap.get('1h') || marketDataMap.values().next().value;
      const marketContext: MarketContext = {
        symbol: upperSymbol,
        currentPrice: latestData[latestData.length - 1].close,
        volatility: 0, // Would calculate from data
        trend: 'SIDEWAYS',
        volume: latestData[latestData.length - 1].volume || 0,
        volume24h: latestData.reduce((sum, d) => sum + (d.volume || 0), 0)
      };

      // Generate snapshot
      const snapshot = await this.scoringService.generateSnapshot(
        upperSymbol,
        marketDataMap,
        marketContext
      );

      res.json({
        success: true,
        snapshot,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get scoring snapshot', { symbol: req.query.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to get scoring snapshot',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get quick verdict (single timeframe)
   * GET /api/scoring/verdict?symbol=BTCUSDT&timeframe=1h
   */
  async getVerdict(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, timeframe = '1h' } = req.query;

      if (!symbol || typeof symbol !== 'string') {
        res.status(400).json({
          error: 'Symbol parameter is required'
        });
        return;
      }

      const upperSymbol = symbol.toUpperCase();
      const marketData = await this.database.getMarketData(
        upperSymbol,
        timeframe as string,
        100
      );

      if (marketData.length < 50) {
        res.status(400).json({
          error: 'Insufficient market data',
          available: marketData.length,
          required: 50
        });
        return;
      }

      const verdict = await this.scoringService.getQuickVerdict(
        upperSymbol,
        timeframe as string,
        marketData
      );

      res.json({
        success: true,
        symbol: upperSymbol,
        timeframe,
        verdict,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get verdict', { symbol: req.query.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to get verdict',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get current weights configuration
   * GET /api/scoring/weights
   */
  async getWeights(req: Request, res: Response): Promise<void> {
    try {
      const detectorWeights = this.weightParliament.getDetectorWeights();
      const timeframeWeights = this.weightParliament.getTimeframeWeights();
      const limits = this.weightParliament.getConstitutionalLimits();
      const metadata = this.weightParliament.getWeightsMetadata();

      res.json({
        success: true,
        detectorWeights,
        timeframeWeights,
        limits,
        metadata,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get weights', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get weights',
        message: (error as Error).message
      });
    }
  }

  /**
   * Update weights configuration
   * POST /api/scoring/weights
   */
  async updateWeights(req: Request, res: Response): Promise<void> {
    try {
      const { detectorWeights, timeframeWeights, reason, authority = 'PRESIDENTIAL' } = req.body;

      if (!detectorWeights && !timeframeWeights) {
        res.status(400).json({
          error: 'Either detectorWeights or timeframeWeights must be provided'
        });
        return;
      }

      const result = this.weightParliament.enactWeightAmendment({
        detectorWeights,
        timeframeWeights,
        reason,
        authority: authority as 'PRESIDENTIAL' | 'JUDICIAL' | 'LEGISLATIVE' | 'EMERGENCY'
      });

      if (!result.success) {
        res.status(400).json({
          error: 'Weight amendment failed',
          errors: result.errors
        });
        return;
      }

      const metadata = this.weightParliament.getWeightsMetadata();

      res.json({
        success: true,
        message: 'Weights updated successfully',
        metadata,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to update weights', {}, error as Error);
      res.status(500).json({
        error: 'Failed to update weights',
        message: (error as Error).message
      });
    }
  }

  /**
   * Reset weights to defaults
   * POST /api/scoring/weights/reset
   */
  async resetWeights(req: Request, res: Response): Promise<void> {
    try {
      this.weightParliament.resetToDefaults();

      res.json({
        success: true,
        message: 'Weights reset to defaults',
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to reset weights', {}, error as Error);
      res.status(500).json({
        error: 'Failed to reset weights',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get amendment history
   * GET /api/scoring/weights/history?limit=10
   */
  async getAmendmentHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const history = this.weightParliament.getAmendmentHistory(limit);

      res.json({
        success: true,
        history,
        count: history.length,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get amendment history', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get amendment history',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get live scoring for a symbol
   * GET /api/scoring/live/:symbol?timeframe=1h
   */
  async getLiveScore(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const { timeframe = '1h' } = req.query;

      if (!symbol) {
        res.status(400).json({
          error: 'Symbol parameter is required',
          example: '/api/scoring/live/BTCUSDT?timeframe=1h'
        });
        return;
      }

      const upperSymbol = symbol.toUpperCase();

      this.logger.info('Generating live score', { symbol: upperSymbol, timeframe });

      const liveScore = await this.liveScoring.generateLiveScore(
        upperSymbol,
        timeframe as string,
        200
      );

      res.json({
        success: true,
        data: liveScore,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get live score', { symbol: req.params.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to get live score',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get WebSocket stream status
   * GET /api/scoring/stream-status
   */
  async getStreamStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = this.scoreStreamGateway.getStatus();
      const latestScores = this.scoreStreamGateway.getAllLatestScores();

      res.json({
        success: true,
        status,
        latestScores,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get stream status', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get stream status',
        message: (error as Error).message
      });
    }
  }
}
