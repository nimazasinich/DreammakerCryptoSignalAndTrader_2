// src/controllers/AnalysisController.ts
import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { Database } from '../data/Database.js';
import { SMCAnalyzer } from '../services/SMCAnalyzer.js';
import { ElliottWaveAnalyzer } from '../services/ElliottWaveAnalyzer.js';
import { HarmonicPatternDetector } from '../services/HarmonicPatternDetector.js';
import { SentimentAnalysisService } from '../services/SentimentAnalysisService.js';
import { WhaleTrackerService } from '../services/WhaleTrackerService.js';
import { BullBearAgent } from '../ai/BullBearAgent.js';
import { FeatureEngineering } from '../ai/FeatureEngineering.js';

export class AnalysisController {
  private logger = Logger.getInstance();
  private database = Database.getInstance();
  private smcAnalyzer = SMCAnalyzer.getInstance();
  private elliottWaveAnalyzer = ElliottWaveAnalyzer.getInstance();
  private harmonicDetector = HarmonicPatternDetector.getInstance();
  private sentimentAnalysis = SentimentAnalysisService.getInstance();
  private whaleTracker = WhaleTrackerService.getInstance();
  private bullBearAgent = BullBearAgent.getInstance();
  private featureEngineering = FeatureEngineering.getInstance();

  async analyzeSignals(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, timeframe = '1h', bars = 100 } = req.body;

      if (!symbol) {
        res.status(400).json({
          error: 'Symbol is required'
        });
        return;
      }

      const marketData = await this.database.getMarketData(
        symbol.toUpperCase(),
        timeframe,
        Number(bars)
      );

      if (marketData.length < 50) {
        res.status(400).json({
          error: 'Insufficient market data',
          available: marketData.length,
          required: 50
        });
        return;
      }

      const features = this.featureEngineering.extractAllFeatures(marketData);
      const prediction = await this.bullBearAgent.predict(marketData, 'directional');
      const smcFeatures = this.smcAnalyzer.analyzeFullSMC(marketData);

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        timeframe,
        features,
        prediction,
        smc: smcFeatures,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to analyze signals', { symbol: req.body.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to analyze signals',
        message: (error as Error).message
      });
    }
  }

  async analyzeSMC(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, timeframe = '1h', bars = 100 } = req.body;

      if (!symbol) {
        res.status(400).json({
          error: 'Symbol is required'
        });
        return;
      }

      const marketData = await this.database.getMarketData(
        symbol.toUpperCase(),
        timeframe,
        Number(bars)
      );

      const smcAnalysis = this.smcAnalyzer.analyzeFullSMC(marketData);

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        timeframe,
        smc: smcAnalysis,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to analyze SMC', { symbol: req.body.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to analyze SMC',
        message: (error as Error).message
      });
    }
  }

  async analyzeElliottWave(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, timeframe = '1h', bars = 200 } = req.body;

      if (!symbol) {
        res.status(400).json({
          error: 'Symbol is required'
        });
        return;
      }

      const marketData = await this.database.getMarketData(
        symbol.toUpperCase(),
        timeframe,
        Number(bars)
      );

      const elliottAnalysis = this.elliottWaveAnalyzer.analyzeElliottWaves(marketData);

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        timeframe,
        elliottWave: elliottAnalysis,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to analyze Elliott Wave', { symbol: req.body.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to analyze Elliott Wave',
        message: (error as Error).message
      });
    }
  }

  async analyzeHarmonicPattern(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, timeframe = '1h', bars = 200 } = req.body;

      if (!symbol) {
        res.status(400).json({
          error: 'Symbol is required'
        });
        return;
      }

      const marketData = await this.database.getMarketData(
        symbol.toUpperCase(),
        timeframe,
        Number(bars)
      );

      const harmonicPatterns = this.harmonicDetector.detectHarmonicPatterns(marketData);

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        timeframe,
        patterns: harmonicPatterns,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to analyze harmonic patterns', { symbol: req.body.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to analyze harmonic patterns',
        message: (error as Error).message
      });
    }
  }

  async analyzeSentiment(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.body;

      if (!symbol) {
        res.status(400).json({
          error: 'Symbol is required'
        });
        return;
      }

      const sentiment = await this.sentimentAnalysis.analyzeSentiment(symbol.toUpperCase());

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        sentiment,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to analyze sentiment', { symbol: req.body.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to analyze sentiment',
        message: (error as Error).message
      });
    }
  }

  async analyzeWhaleActivity(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.body;

      if (!symbol) {
        res.status(400).json({
          error: 'Symbol is required'
        });
        return;
      }

      const whaleActivity = await this.whaleTracker.trackWhaleActivity(symbol.toUpperCase());

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        whaleActivity,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to analyze whale activity', { symbol: req.body.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to analyze whale activity',
        message: (error as Error).message
      });
    }
  }
}

