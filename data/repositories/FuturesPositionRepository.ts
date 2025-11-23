import { Database } from 'better-sqlite3';
import { BaseRepository } from './BaseRepository.js';
import { FuturesPosition } from '../../types/futures.js';

export class FuturesPositionRepository extends BaseRepository<FuturesPosition> {
  constructor(database: Database) {
    super(database, 'futures_positions');
  }

  protected mapRowToEntity(row: any): FuturesPosition {
    return {
      id: row.id,
      symbol: row.symbol,
      side: row.side,
      size: row.size,
      entryPrice: row.entry_price,
      markPrice: row.mark_price,
      leverage: row.leverage,
      unrealizedPnl: row.unrealized_pnl,
      liquidationPrice: row.liquidation_price,
      marginMode: row.margin_mode,
      marginUsed: row.margin_used,
      marginAvailable: row.margin_available,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  protected mapEntityToRow(entity: FuturesPosition): any {
    return {
      id: entity.id,
      symbol: entity.symbol,
      side: entity.side,
      size: entity.size,
      entry_price: entity.entryPrice,
      mark_price: entity.markPrice,
      leverage: entity.leverage,
      unrealized_pnl: entity.unrealizedPnl,
      liquidation_price: entity.liquidationPrice,
      margin_mode: entity.marginMode,
      margin_used: entity.marginUsed,
      margin_available: entity.marginAvailable,
      updated_at: Date.now()
    };
  }

  async findBySymbol(symbol: string): Promise<FuturesPosition[]> {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE symbol = ?`);
      const rows = stmt.all(symbol);
      return (rows || []).map(row => this.mapRowToEntity(row));
    } catch (error) {
      this.logger.error(`Failed to find positions by symbol: ${symbol}`, { tableName: this.tableName }, error as Error);
      throw error;
    }
  }

  async findOpenPositions(): Promise<FuturesPosition[]> {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE size > 0`);
      const rows = stmt.all();
      return (rows || []).map(row => this.mapRowToEntity(row));
    } catch (error) {
      this.logger.error('Failed to find open positions', { tableName: this.tableName }, error as Error);
      throw error;
    }
  }

  async upsertPosition(position: FuturesPosition): Promise<FuturesPosition> {
    try {
      const row = this.mapEntityToRow(position);
      const stmt = this.db.prepare(`
        INSERT INTO ${this.tableName} (
          symbol, side, size, entry_price, mark_price, leverage, 
          unrealized_pnl, liquidation_price, margin_mode, 
          margin_used, margin_available, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(symbol, side) DO UPDATE SET
          size = excluded.size,
          mark_price = excluded.mark_price,
          unrealized_pnl = excluded.unrealized_pnl,
          liquidation_price = excluded.liquidation_price,
          leverage = excluded.leverage,
          margin_used = excluded.margin_used,
          margin_available = excluded.margin_available,
          updated_at = excluded.updated_at
      `);

      stmt.run(
        row.symbol,
        row.side,
        row.size,
        row.entry_price,
        row.mark_price,
        row.leverage,
        row.unrealized_pnl,
        row.liquidation_price,
        row.margin_mode,
        row.margin_used,
        row.margin_available,
        row.updated_at
      );

      return await this.findBySymbol(row.symbol).then(positions => 
        positions.find(p => p.side === row.side) || position
      );
    } catch (error) {
      this.logger.error('Failed to upsert position', { tableName: this.tableName }, error as Error);
      throw error;
    }
  }
}
