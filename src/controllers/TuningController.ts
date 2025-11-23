/**
 * TUNING CONTROLLER
 * API endpoints for Auto-Tuning Engine
 *
 * Provides endpoints to:
 * - Start tuning runs
 * - Get tuning results
 * - Get latest tuning summary
 *
 * ALL RESPONSES ARE HONEST - NO FAKE DATA
 */

import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { ScoringTuner } from '../engine/tuning/ScoringTuner.js';
import { TuningStorage } from '../engine/tuning/TuningStorage.js';
import { TuningConfig } from '../types/index.js';
import { isFeatureEnabled } from '../config/systemConfig.js';

export class TuningController {
  private logger = Logger.getInstance();
  private tuner = ScoringTuner.getInstance();
  private storage = TuningStorage.getInstance();

  /**
   * POST /api/tuning/run
   * Start a new tuning run
   *
   * Body (optional overrides):
   * {
   *   "mode": "grid" | "ga",
   *   "metric": "sharpe" | "winRate" | "pnl",
   *   "symbolUniverse"?: string[],
   *   "timeframe"?: string,
   *   "lookbackDays"?: number,
   *   "initialBalance"?: number
   * }
   */
  async runTuning(req: Request, res: Response): Promise<void> {
    try {
      // Check system-level feature flag first
      if (!isFeatureEnabled('autoTuning')) {
        res.status(403).json({
          success: false,
          error: 'Auto-tuning is disabled in system configuration. Set features.autoTuning = true in system.config.json'
        });
        return;
      }

      // Load base tuning config
      const baseTuningConfig = this.tuner.loadTuningConfig();

      if (!baseTuningConfig.enabled) {
        res.status(400).json({
          success: false,
          error: 'Tuning is disabled in config. Set tuning.enabled = true in scoring.config.json'
        });
        return;
      }

      // Merge with request overrides
      const overrides = req.body || {};

      const tuningConfig: TuningConfig = {
        ...baseTuningConfig,
        mode: overrides.mode || baseTuningConfig.mode,
        metric: overrides.metric || baseTuningConfig.metric,
        backtestDefaults: {
          symbolUniverse: overrides.symbolUniverse || baseTuningConfig.backtestDefaults.symbolUniverse,
          timeframe: overrides.timeframe || baseTuningConfig.backtestDefaults.timeframe,
          lookbackDays: overrides.lookbackDays || baseTuningConfig.backtestDefaults.lookbackDays,
          initialBalance: overrides.initialBalance || baseTuningConfig.backtestDefaults.initialBalance
        }
      };

      // Validate inputs
      if (!['grid', 'ga'].includes(tuningConfig.mode)) {
        res.status(400).json({
          success: false,
          error: 'Invalid mode. Must be "grid" or "ga"'
        });
        return;
      }

      if (!['sharpe', 'winRate', 'pnl'].includes(tuningConfig.metric)) {
        res.status(400).json({
          success: false,
          error: 'Invalid metric. Must be "sharpe", "winRate", or "pnl"'
        });
        return;
      }

      this.logger.info('Starting tuning run via API', {
        mode: tuningConfig.mode,
        metric: tuningConfig.metric
      });

      // Load base scoring config
      const baseConfig = this.tuner.loadScoringConfig();

      // Start tuning (async - this may take a while)
      // For now, we'll run it synchronously, but in production this should be queued
      const result = await this.tuner.runTuning(tuningConfig, baseConfig);

      // Save result
      await this.storage.saveResult(result);

      // Return response
      res.json({
        success: true,
        id: result.id,
        status: result.finishedAt ? 'completed' : 'in_progress',
        mode: result.mode,
        metric: result.metric,
        message: result.error
          ? `Tuning completed with error: ${result.error}`
          : 'Tuning run completed successfully'
      });

    } catch (error) {
      this.logger.error('Failed to run tuning', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to start tuning run',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/tuning/result/:id
   * Get a specific tuning run result
   */
  async getResult(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Run ID is required'
        });
        return;
      }

      const result = await this.storage.getResult(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: `Tuning run not found: ${id}`
        });
        return;
      }

      res.json({
        success: true,
        result
      });

    } catch (error) {
      this.logger.error('Failed to get tuning result', { id: req.params.id }, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tuning result',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/tuning/latest
   * Get the most recent tuning run summary
   */
  async getLatest(req: Request, res: Response): Promise<void> {
    try {
      const latest = await this.storage.getLatest();

      if (!latest) {
        res.json({
          success: true,
          result: null,
          message: 'No tuning runs found'
        });
        return;
      }

      res.json({
        success: true,
        result: latest
      });

    } catch (error) {
      this.logger.error('Failed to get latest tuning result', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve latest tuning result',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/tuning/all
   * Get all tuning run summaries
   */
  async getAllSummaries(req: Request, res: Response): Promise<void> {
    try {
      const summaries = await this.storage.getAllSummaries();

      res.json({
        success: true,
        summaries,
        count: summaries.length
      });

    } catch (error) {
      this.logger.error('Failed to get tuning summaries', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tuning summaries',
        message: (error as Error).message
      });
    }
  }

  /**
   * DELETE /api/tuning/result/:id
   * Delete a specific tuning run
   */
  async deleteResult(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Run ID is required'
        });
        return;
      }

      const deleted = await this.storage.deleteResult(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: `Tuning run not found: ${id}`
        });
        return;
      }

      res.json({
        success: true,
        message: `Tuning run ${id} deleted successfully`
      });

    } catch (error) {
      this.logger.error('Failed to delete tuning result', { id: req.params.id }, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete tuning result',
        message: (error as Error).message
      });
    }
  }
}
