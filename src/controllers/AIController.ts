// src/controllers/AIController.ts
import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { TrainingEngine } from '../ai/TrainingEngine.js';
import { BullBearAgent } from '../ai/BullBearAgent.js';
import { BacktestEngine } from '../ai/BacktestEngine.js';
import { FeatureEngineering } from '../ai/FeatureEngineering.js';
import { Database } from '../data/Database.js';

export class AIController {
  private logger = Logger.getInstance();
  private trainingEngine = TrainingEngine.getInstance();
  private bullBearAgent = BullBearAgent.getInstance();
  private backtestEngine = BacktestEngine.getInstance();
  private featureEngineering = FeatureEngineering.getInstance();
  private database = Database.getInstance();

  async trainStep(req: Request, res: Response): Promise<void> {
    try {
      const { batchSize = 32 } = req.body;

      const bufferStats = this.trainingEngine.getExperienceBufferStatistics();
      if (bufferStats.size < batchSize) {
        res.status(400).json({
          error: 'Insufficient experiences in buffer',
          required: batchSize,
          available: bufferStats.size
        });
        return;
      }

      const batch = this.trainingEngine.sampleExperienceBatch(batchSize);
      const metrics = await this.trainingEngine.trainStep(batch.experiences);

      res.json({
        success: true,
        metrics,
        bufferStats,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to perform training step', {}, error as Error);
      res.status(500).json({
        error: 'Failed to perform training step',
        message: (error as Error).message
      });
    }
  }

  async trainEpoch(req: Request, res: Response): Promise<void> {
    try {
      const epochMetrics = await this.trainingEngine.trainEpoch();

      res.json({
        success: true,
        epochMetrics,
        trainingState: this.trainingEngine.getTrainingState(),
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to train epoch', {}, error as Error);
      res.status(500).json({
        error: 'Failed to train epoch',
        message: (error as Error).message
      });
    }
  }

  async predict(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, goal } = req.body;

      if (!symbol) {
        res.status(400).json({
          error: 'Symbol is required'
        });
        return;
      }

      const marketData = await this.database.getMarketData(symbol.toUpperCase(), '1h', 100);

      if (marketData.length < 50) {
        res.status(400).json({
          error: 'Insufficient market data for prediction',
          available: marketData.length,
          required: 50
        });
        return;
      }

      const prediction = await this.bullBearAgent.predict(marketData, goal);

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        prediction,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to generate prediction', { symbol: req.body.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to generate prediction',
        message: (error as Error).message
      });
    }
  }

  async extractFeatures(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.body;

      if (!symbol) {
        res.status(400).json({
          error: 'Symbol is required'
        });
        return;
      }

      const marketData = await this.database.getMarketData(symbol.toUpperCase(), '1h', 100);
      const features = this.featureEngineering.extractAllFeatures(marketData);

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        features,
        featureCount: features.length,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to extract features', { symbol: req.body.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to extract features',
        message: (error as Error).message
      });
    }
  }

  async backtest(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, startDate, endDate, initialCapital = 10000 } = req.body;

      if (!symbol || !startDate || !endDate) {
        res.status(400).json({
          error: 'Symbol, startDate, and endDate are required'
        });
        return;
      }

      const marketData = await this.database.getMarketData(
        symbol.toUpperCase(),
        '1h',
        1000
      );

      if (marketData.length < 100) {
        res.status(400).json({
          error: 'Insufficient market data for backtest',
          available: marketData.length,
          required: 100
        });
        return;
      }

      const result = await this.backtestEngine.runBacktest(marketData, {
        symbol: symbol.toUpperCase(),
        initialCapital,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime()
      });

      res.json({
        success: true,
        backtest: result,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to run backtest', { body: req.body }, error as Error);
      res.status(500).json({
        error: 'Failed to run backtest',
        message: (error as Error).message
      });
    }
  }
}

