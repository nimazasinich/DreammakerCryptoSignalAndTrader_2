export class MemoryDatabase {
  private data: Map<string, any[]> = new Map();

  constructor() {
    console.log('Using in-memory database');
  }

  prepare(query: string) {
    return {
      run: (...params: any[]) => {
        console.log('DB run:', query, params);
        return { changes: 1, lastInsertRowid: Date.now() };
      },
      get: (...params: any[]) => {
        console.log('DB get:', query, params);
        const table = this.extractTable(query);
        const records = this.data.get(table) || [];
        return records[0] || null;
      },
      all: (...params: any[]) => {
        console.log('DB all:', query, params);
        const table = this.extractTable(query);
        return this.data.get(table) || [];
      }
    };
  }

  exec(query: string) {
    console.log('DB exec:', query);
    return this;
  }

  close() {
    console.log('DB close');
  }

  private extractTable(query: string): string {
    const match = query.match(/FROM\s+(\w+)/i) || query.match(/INTO\s+(\w+)/i);
    return match ? match[1] : 'default';
  }

  insert(table: string, data: any) {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    const records = this.data.get(table)!;
    records.push({ ...data, id: Date.now() });
    return { lastInsertRowid: Date.now() };
  }

  select(table: string, where?: any) {
    return this.data.get(table) || [];
  }

  update(table: string, data: any, where?: any) {
    const records = this.data.get(table) || [];
    // Simple update logic
    return { changes: records.length };
  }

  delete(table: string, where?: any) {
    this.data.delete(table);
    return { changes: 1 };
  }
}

export default new MemoryDatabase();
