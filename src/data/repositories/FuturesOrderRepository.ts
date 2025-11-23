import { Database } from 'better-sqlite3';
import { BaseRepository } from './BaseRepository.js';
import { FuturesOrder } from '../../types/futures.js';

export class FuturesOrderRepository extends BaseRepository<FuturesOrder> {
  constructor(database: Database) {
    super(database, 'futures_orders');
  }

  protected mapRowToEntity(row: any): FuturesOrder {
    return {
      id: row.id,
      orderId: row.order_id,
      symbol: row.symbol,
      side: row.side,
      type: row.type,
      qty: row.qty,
      price: row.price,
      leverage: row.leverage,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      reduceOnly: row.reduce_only === 1,
      status: row.status,
      filledQty: row.filled_qty,
      avgFillPrice: row.avg_fill_price,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  protected mapEntityToRow(entity: FuturesOrder): any {
    return {
      id: entity.id,
      order_id: entity.orderId,
      symbol: entity.symbol,
      side: entity.side,
      type: entity.type,
      qty: entity.qty,
      price: entity.price,
      leverage: entity.leverage,
      stop_loss: entity.stopLoss,
      take_profit: entity.takeProfit,
      reduce_only: entity.reduceOnly ? 1 : 0,
      status: entity.status || 'pending',
      filled_qty: entity.filledQty || 0,
      avg_fill_price: entity.avgFillPrice,
      updated_at: Date.now()
    };
  }

  async findByOrderId(orderId: string): Promise<FuturesOrder | null> {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE order_id = ? OR exchange_order_id = ?`);
      const row = stmt.get(orderId, orderId);
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      this.logger.error(`Failed to find order by ID: ${orderId}`, { tableName: this.tableName }, error as Error);
      throw error;
    }
  }

  async findBySymbol(symbol: string, status?: string): Promise<FuturesOrder[]> {
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE symbol = ?`;
      const params: any[] = [symbol];
      
      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }
      
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);
      return (rows || []).map(row => this.mapRowToEntity(row));
    } catch (error) {
      this.logger.error(`Failed to find orders by symbol: ${symbol}`, { tableName: this.tableName }, error as Error);
      throw error;
    }
  }

  async findOpenOrders(): Promise<FuturesOrder[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM ${this.tableName} 
        WHERE status IN ('pending', 'active')
      `);
      const rows = stmt.all();
      return (rows || []).map(row => this.mapRowToEntity(row));
    } catch (error) {
      this.logger.error('Failed to find open orders', { tableName: this.tableName }, error as Error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string, filledQty?: number, avgFillPrice?: number): Promise<boolean> {
    try {
      const updates: string[] = ['status = ?', 'updated_at = ?'];
      const params: any[] = [status, Date.now()];
      
      if (filledQty !== undefined) {
        updates.push('filled_qty = ?');
        params.push(filledQty);
      }
      
      if (avgFillPrice !== undefined) {
        updates.push('avg_fill_price = ?');
        params.push(avgFillPrice);
      }
      
      params.push(orderId);
      
      const stmt = this.db.prepare(`
        UPDATE ${this.tableName} 
        SET ${updates.join(', ')} 
        WHERE order_id = ? OR exchange_order_id = ?
      `);
      
      const result = stmt.run(...params, orderId);
      return result.changes > 0;
    } catch (error) {
      this.logger.error(`Failed to update order status: ${orderId}`, { tableName: this.tableName }, error as Error);
      throw error;
    }
  }
}
