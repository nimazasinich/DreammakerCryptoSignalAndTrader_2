// src/interfaces/IAIService.ts
import { MarketData, PredictionData, TrainingMetrics } from '../types/index.js';

export interface IAIService {
  /**
   * Generate prediction for a symbol
   */
  predict(symbol: string, marketData: MarketData[], goal?: string): Promise<PredictionData>;

  /**
   * Train the model with new data
   */
  trainStep(batchSize?: number): Promise<TrainingMetrics>;

  /**
   * Train for a full epoch
   */
  trainEpoch(): Promise<TrainingMetrics>;

  /**
   * Extract features from market data
   */
  extractFeatures(marketData: MarketData[]): Promise<any[]>;

  /**
   * Run backtest
   */
  backtest(config: {
    symbol: string;
    marketData: MarketData[];
    initialCapital: number;
    startDate: Date;
    endDate: Date;
  }): Promise<any>;
}

