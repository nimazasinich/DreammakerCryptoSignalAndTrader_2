import { Database } from 'better-sqlite3';
import { BaseRepository } from './BaseRepository.js';
import { MarketData } from '../../types/index.js';

export class MarketDataRepository extends BaseRepository<MarketData> {
  constructor(database: Database) {
    super(database, 'market_data');
  }

  protected mapRowToEntity(row: any): MarketData {
    return {
      symbol: row.symbol,
      timestamp: row.timestamp,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
      interval: row.interval
    };
  }

  protected mapEntityToRow(entity: MarketData): any {
    return {
      symbol: entity.symbol,
      timestamp: entity.timestamp,
      open: entity.open,
      high: entity.high,
      low: entity.low,
      close: entity.close,
      volume: entity.volume,
      interval: entity.interval
    };
  }

  async findBySymbolAndInterval(
    symbol: string, 
    interval: string, 
    limit: number = 1000,
    startTime?: number,
    endTime?: number
  ): Promise<MarketData[]> {
    try {
      let query = `
        SELECT * FROM ${this.tableName} 
        WHERE symbol = ? AND interval = ?
      `;
      const params: any[] = [symbol, interval];

      if (startTime) {
        query += ` AND timestamp >= ?`;
        params.push(startTime);
      }

      if (endTime) {
        query += ` AND timestamp <= ?`;
        params.push(endTime);
      }

      query += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      const rows = this.executeQuery(query, params);
      return (rows || []).map(row => this.mapRowToEntity(row));
    } catch (error) {
      this.logger.error('Failed to find market data by symbol and interval', {
        symbol,
        interval,
        limit,
        startTime,
        endTime
      }, error as Error);
      throw error;
    }
  }

  async insertOrUpdate(marketData: MarketData): Promise<MarketData> {
    try {
      const query = `
        INSERT OR REPLACE INTO ${this.tableName} 
        (symbol, timestamp, open, high, low, close, volume, interval) 
        VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, '1m'))
      `;
      
      // Guard against null interval at TS level
      const interval = marketData.interval ?? '1m';
      
      const params = [
        marketData.symbol,
        marketData.timestamp,
        marketData.open,
        marketData.high,
        marketData.low,
        marketData.close,
        marketData.volume,
        interval
      ];

      this.executeStatement(query, params);
      
      this.logger.debug('Market data inserted/updated', {
        symbol: marketData.symbol,
        timestamp: marketData.timestamp,
        interval: interval
      });

      return { ...marketData, interval };
    } catch (error) {
      this.logger.error('Failed to insert/update market data', {
        symbol: marketData.symbol,
        timestamp: marketData.timestamp,
        interval: marketData.interval
      }, error as Error);
      throw error;
    }
  }

  async getLatestTimestamp(symbol: string, interval: string): Promise<number | null> {
    try {
      const query = `
        SELECT MAX(timestamp) as latest_timestamp 
        FROM ${this.tableName} 
        WHERE symbol = ? AND interval = ?
      `;
      
      const result = this.executeQuerySingle<{ latest_timestamp: number | null }>(
        query, 
        [symbol, interval]
      );
      
      return result?.latest_timestamp || null;
    } catch (error) {
      this.logger.error('Failed to get latest timestamp', { symbol, interval }, error as Error);
      throw error;
    }
  }

  async getSymbols(): Promise<string[]> {
    try {
      const query = `SELECT DISTINCT symbol FROM ${this.tableName} ORDER BY symbol`;
      const rows = this.executeQuery<{ symbol: string }>(query);
      return (rows || []).map(row => row.symbol);
    } catch (error) {
      this.logger.error('Failed to get symbols', {}, error as Error);
      throw error;
    }
  }

  async getIntervals(symbol: string): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT interval 
        FROM ${this.tableName} 
        WHERE symbol = ? 
        ORDER BY interval
      `;
      const rows = this.executeQuery<{ interval: string }>(query, [symbol]);
      return (rows || []).map(row => row.interval);
    } catch (error) {
      this.logger.error('Failed to get intervals', { symbol }, error as Error);
      throw error;
    }
  }

  // Count null intervals for validation
  async countNullIntervals(): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM ${this.tableName} 
        WHERE interval IS NULL
      `;
      const result = this.executeQuerySingle<{ count: number }>(query);
      return result?.count || 0;
    } catch (error) {
      this.logger.error('Failed to count null intervals', {}, error as Error);
      return 0;
    }
  }

  async deleteOldData(symbol: string, interval: string, keepDays: number = 30): Promise<number> {
    try {
      const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
      const query = `
        DELETE FROM ${this.tableName} 
        WHERE symbol = ? AND interval = ? AND timestamp < ?
      `;
      
      const result = this.executeStatement(query, [symbol, interval, cutoffTime]);
      
      this.logger.info('Old market data deleted', {
        symbol,
        interval,
        deletedRows: result.changes,
        keepDays
      });

      return result.changes;
    } catch (error) {
      this.logger.error('Failed to delete old market data', {
        symbol,
        interval,
        keepDays
      }, error as Error);
      throw error;
    }
  }
}