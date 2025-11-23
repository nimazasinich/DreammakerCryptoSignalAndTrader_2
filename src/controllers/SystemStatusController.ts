/**
 * SystemStatusController
 *
 * Provides GET /api/system/status endpoint
 * Aggregates REAL status from all subsystems:
 * - Feature flags
 * - Live scoring status
 * - Trading health
 * - Tuning results
 *
 * NO FAKE DATA - Only reports actual system state
 */

import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { getSystemConfig, isFeatureEnabled, getTradingMode, getTradingMarket } from '../config/systemConfig.js';
import { ScoreStreamGateway } from '../ws/ScoreStreamGateway.js';
import { TuningStorage } from '../engine/tuning/TuningStorage.js';
import { ExchangeClient } from '../services/exchange/ExchangeClient.js';
import { SystemStatusResponse } from '../types/index.js';
import { getDataSourceConfig } from '../config/dataSource.js';

export class SystemStatusController {
  private logger = Logger.getInstance();
  private scoreStreamGateway = ScoreStreamGateway.getInstance();
  private tuningStorage = TuningStorage.getInstance();
  private exchangeClient = ExchangeClient.getInstance();

  /**
   * GET /api/system/status
   *
   * Returns comprehensive system status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:34',message:'getStatus entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      // 1. Load system config
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:37',message:'before getSystemConfig',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const systemConfig = getSystemConfig();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:40',message:'after getSystemConfig',data:{hasConfig:!!systemConfig},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // 2. Get live scoring status
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:42',message:'before scoreStreamGateway',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const liveScoreStatus = this.scoreStreamGateway.getStatus();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:44',message:'after getStatus',data:{hasStatus:!!liveScoreStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const latestScores = this.scoreStreamGateway.getAllLatestScores();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:46',message:'after getAllLatestScores',data:{scoresCount:latestScores?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const lastScoreTimestamp =
        latestScores.length > 0 && latestScores[0].timestamp
          ? latestScores[0].timestamp
          : null;

      // 3. Get tuning status
      let tuningHasRun = false;
      let tuningLastMetric: { metric: 'sharpe' | 'winRate' | 'pnl' | null; value: number | null } = {
        metric: null,
        value: null
      };

      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:57',message:'before tuningStorage.getLatest',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        const latestTuning = await this.tuningStorage.getLatest();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:59',message:'after tuningStorage.getLatest',data:{hasTuning:!!latestTuning},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (latestTuning) {
          tuningHasRun = true;
          if (latestTuning.bestCandidate && latestTuning.bestCandidate.metrics) {
            const metrics = latestTuning.bestCandidate.metrics;
            tuningLastMetric.metric = latestTuning.metric;
            tuningLastMetric.value = metrics[latestTuning.metric] ?? null;
          }
        }
      } catch (error) {
        this.logger.error('Failed to get tuning status', {}, error as Error);
        // Continue - tuning status is not critical
      }

      // 4. Get trading health
      let tradingHealth: 'ok' | 'unreachable' | 'off' | 'unknown' = 'unknown';
      const tradingMode = systemConfig.modes.trading;

      if (tradingMode === 'OFF') {
        tradingHealth = 'off';
      } else if (tradingMode === 'DRY_RUN') {
        // DRY_RUN doesn't connect to exchange, so mark as ok (simulated)
        tradingHealth = 'ok';
      } else if (tradingMode === 'TESTNET') {
        // Try to ping exchange
        try {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:83',message:'before exchangeClient.getAccountInfo',data:{tradingMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          await this.exchangeClient.getAccountInfo();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:85',message:'after exchangeClient.getAccountInfo',data:{tradingHealth:'ok'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          tradingHealth = 'ok';
        } catch (error) {
          this.logger.warn('Exchange health check failed', {}, error as Error);
          tradingHealth = 'unreachable';
        }
      }

      // 5. Build response
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:92',message:'before getTradingMarket and getDataSourceConfig',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      const tradingMarket = getTradingMarket();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:94',message:'after getTradingMarket',data:{tradingMarket},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      const dataSourceConfig = getDataSourceConfig();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:96',message:'after getDataSourceConfig',data:{hasConfig:!!dataSourceConfig},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      const response: SystemStatusResponse = {
        environment: systemConfig.modes.environment,
        features: systemConfig.features,
        trading: {
          mode: tradingMode,
          market: tradingMarket,
          health: tradingHealth
        },
        dataSource: {
          primarySource: dataSourceConfig.primarySource,
          availableSources: dataSourceConfig.availableSources,
          overrides: dataSourceConfig.overrides
        },
        liveScoring: {
          enabled: systemConfig.features.liveScoring,
          streaming: liveScoreStatus.isStreaming,
          lastScoreTimestamp
        },
        tuning: {
          hasRun: tuningHasRun,
          lastMetric: tuningLastMetric
        }
      };

      this.logger.debug('System status retrieved', {
        environment: response.environment,
        tradingMode: response.trading.mode,
        tradingMarket: response.trading.market,
        tradingHealth: response.trading.health
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:127',message:'before res.json',data:{hasResponse:!!response},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      res.json(response);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:129',message:'after res.json',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:133',message:'error caught',data:{errorMessage:(error as Error)?.message,errorName:(error as Error)?.name,errorStack:(error as Error)?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
      this.logger.error('Failed to get system status', {}, error as Error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:136',message:'before res.status(500).json',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
      res.status(500).json({
        error: 'Failed to retrieve system status',
        message: (error as Error).message
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33bac052-4aff-42d9-800b-7f592babc1fb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemStatusController.ts:141',message:'after res.status(500).json',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
    }
  }
}
