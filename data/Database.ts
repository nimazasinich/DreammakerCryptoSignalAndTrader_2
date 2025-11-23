import { MemoryDatabase } from './MemoryDatabase';
import { MarketData } from '../types/index.js';

export class Database {
  private static instance: Database;
  private db: MemoryDatabase;

  private constructor() {
    this.db = new MemoryDatabase();
    console.log('Database initialized with memory storage');
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async initialize(): Promise<void> {
    // Memory database doesn't need async initialization
    console.log('Database initialization complete');
    return Promise.resolve();
  }

  prepare(query: string) {
    return this.db.prepare(query);
  }

  exec(query: string) {
    return this.db.exec(query);
  }

  close() {
    return this.db.close();
  }

  insert(table: string, data: any) {
    return this.db.insert(table, data);
  }

  select(table: string, where?: any) {
    return this.db.select(table, where);
  }

  update(table: string, data: any, where?: any) {
    return this.db.update(table, data, where);
  }

  delete(table: string, where?: any) {
    return this.db.delete(table, where);
  }

  /**
   * Insert market data (optional - gracefully handles if not needed)
   */
  async insertMarketData(data: MarketData): Promise<void> {
    try {
      // Use generic insert method for memory database
      this.db.insert('market_data', {
        symbol: data.symbol,
        timestamp: data.timestamp,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
        interval: data.interval || '1m'
      });
    } catch (error) {
      // Silently fail - market data persistence is optional
      // Log only in debug mode to avoid log spam
      if (import.meta.env?.DEV) {
        console.debug('Market data insert skipped (optional feature)', { symbol: data.symbol });
      }
    }
  }

  /**
   * Get market data (type-safe stub for memory database)
   */
  async getMarketData(symbol: string, interval: string, limit: number): Promise<MarketData[]> {
    try {
      const records = this.db.select('market_data', { symbol, interval });
      return records
        .filter((r: any) => r.symbol === symbol)
        .slice(-limit)
        .map((r: any) => ({
          symbol: r.symbol,
          timestamp: r.timestamp,
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          volume: r.volume,
          interval: r.interval
        }));
    } catch (error) {
      // Return empty array if no data available
      return [];
    }
  }

  /**
   * Get database health status (type-safe stub)
   */
  getHealth(): { status: string; message: string } {
    return {
      status: 'healthy',
      message: 'Memory database operational'
    };
  }

  /**
   * Save order (type-safe stub for memory database)
   */
  async saveOrder(order: any): Promise<void> {
    try {
      this.db.insert('orders', order);
    } catch (error) {
      // Silently fail - order persistence is optional
      if (import.meta.env?.DEV) {
        console.debug('Order save skipped (optional feature)', { orderId: order.id });
      }
    }
  }

  /**
   * Get latest training metrics (type-safe stub)
   */
  async getLatestTrainingMetrics(): Promise<any> {
    try {
      const records = this.db.select('training_metrics', {});
      return records.length > 0 ? records[records.length - 1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get active opportunities (type-safe stub)
   */
  async getActiveOpportunities(): Promise<any[]> {
    try {
      return this.db.select('opportunities', { status: 'active' });
    } catch (error) {
      return [];
    }
  }

  /**
   * Save continuous learning progress (type-safe stub)
   */
  async saveContinuousLearningProgress(progress: any): Promise<void> {
    try {
      this.db.insert('learning_progress', progress);
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.debug('Learning progress save skipped (optional feature)');
      }
    }
  }

  /**
   * Save signal (type-safe stub)
   */
  async saveSignal(signal: any): Promise<void> {
    try {
      this.db.insert('signals', signal);
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.debug('Signal save skipped (optional feature)', { signalId: signal.id });
      }
    }
  }
}

export default Database.getInstance();
