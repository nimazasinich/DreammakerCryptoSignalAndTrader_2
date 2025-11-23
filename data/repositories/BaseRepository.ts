import { Database, Statement } from 'better-sqlite3';
import { Logger } from '../../core/Logger.js';

export abstract class BaseRepository<T> {
  protected db: Database;
  protected logger = Logger.getInstance();
  protected tableName: string;

  constructor(database: Database, tableName: string) {
    this.db = database;
    this.tableName = tableName;
  }

  protected abstract mapRowToEntity(row: any): T;
  protected abstract mapEntityToRow(entity: T): any;

  async findById(id: string | number): Promise<T | null> {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
      const row = stmt.get(id);
      
      if (!row) {
        return null;
      }

      return this.mapRowToEntity(row);
    } catch (error) {
      this.logger.error(`Failed to find entity by id: ${id}`, { tableName: this.tableName }, error as Error);
      throw error;
    }
  }

  async findAll(limit?: number, offset?: number): Promise<T[]> {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];

      if (limit) {
        query += ` LIMIT ?`;
        params.push(limit);
        
        if (offset) {
          query += ` OFFSET ?`;
          params.push(offset);
        }
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);
      
      return (rows || []).map(row => this.mapRowToEntity(row));
    } catch (error) {
      this.logger.error('Failed to find all entities', { tableName: this.tableName }, error as Error);
      throw error;
    }
  }

  async insert(entity: T): Promise<T> {
    try {
      const row = this.mapEntityToRow(entity);
      const columns = Object.keys(row);
      const placeholders = (columns || []).map(() => '?').join(', ');
      const values = Object.values(row);

      const query = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      const stmt = this.db.prepare(query);
      
      const result = stmt.run(...values);
      
      // For auto-increment IDs, update the entity with the new ID
      if (result.lastInsertRowid && typeof result.lastInsertRowid === 'number') {
        (entity as any).id = result.lastInsertRowid;
      }

      this.logger.info('Entity inserted successfully', { 
        tableName: this.tableName, 
        id: result.lastInsertRowid 
      });

      return entity;
    } catch (error) {
      this.logger.error('Failed to insert entity', { tableName: this.tableName }, error as Error);
      throw error;
    }
  }

  async update(id: string | number, entity: Partial<T>): Promise<T | null> {
    try {
      const row = this.mapEntityToRow(entity as T);
      const columns = Object.keys(row);
      const setClause = (columns || []).map(col => `${col} = ?`).join(', ');
      const values = [...Object.values(row), id];

      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      const stmt = this.db.prepare(query);
      
      const result = stmt.run(...values);
      
      if (result.changes === 0) {
        return null;
      }

      this.logger.info('Entity updated successfully', { 
        tableName: this.tableName, 
        id, 
        changes: result.changes 
      });

      return await this.findById(id);
    } catch (error) {
      this.logger.error(`Failed to update entity: ${id}`, { tableName: this.tableName }, error as Error);
      throw error;
    }
  }

  async delete(id: string | number): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
      const result = stmt.run(id);
      
      const deleted = result.changes > 0;
      
      if (deleted) {
        this.logger.info('Entity deleted successfully', { 
          tableName: this.tableName, 
          id 
        });
      }

      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete entity: ${id}`, { tableName: this.tableName }, error as Error);
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`);
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error) {
      this.logger.error('Failed to count entities', { tableName: this.tableName }, error as Error);
      throw error;
    }
  }

  protected executeQuery<R = any>(query: string, params: any[] = []): R[] {
    try {
      const stmt = this.db.prepare(query);
      return stmt.all(...params) as R[];
    } catch (error) {
      this.logger.error('Failed to execute query', { query, params }, error as Error);
      throw error;
    }
  }

  protected executeQuerySingle<R = any>(query: string, params: any[] = []): R | null {
    try {
      const stmt = this.db.prepare(query);
      return (stmt.get(...params) as R) || null;
    } catch (error) {
      this.logger.error('Failed to execute single query', { query, params }, error as Error);
      throw error;
    }
  }

  protected executeStatement(query: string, params: any[] = []): { changes: number; lastInsertRowid: number | bigint } {
    try {
      const stmt = this.db.prepare(query);
      return stmt.run(...params);
    } catch (error) {
      this.logger.error('Failed to execute statement', { query, params }, error as Error);
      throw error;
    }
  }
}