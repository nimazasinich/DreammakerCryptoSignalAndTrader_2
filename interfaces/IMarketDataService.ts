// src/interfaces/IMarketDataService.ts
import { MarketData } from '../types/index.js';

export interface PriceData {
  symbol: string;
  price: number;
  volume: number;
  change24h: number;
  source: string;
  timestamp: number;
}

export type UpdateCallback = (data: MarketData) => void;

export interface IMarketDataService {
  /**
   * Get current price for a symbol
   */
  getPrice(symbol: string): Promise<PriceData>;

  /**
   * Get prices for multiple symbols
   */
  getMultiplePrices(symbols: string[]): Promise<PriceData[]>;

  /**
   * Get historical data
   */
  getHistoricalData(symbol: string, days?: number): Promise<any[]>;

  /**
   * Subscribe to real-time updates
   */
  subscribeToUpdates(callback: UpdateCallback): void;

  /**
   * Unsubscribe from updates
   */
  unsubscribeFromUpdates(callback: UpdateCallback): void;

  /**
   * Get latest news
   */
  getLatestNews(): Promise<any[]>;

  /**
   * Get market sentiment
   */
  getMarketSentiment(): Promise<any>;
}

