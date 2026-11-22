// Node's built-in SQLite behind the expo-sqlite async subset used by SQLiteCatalogStore.
import { DatabaseSync } from 'node:sqlite';
export function nodeSQLite(path = ':memory:') {
  const db = new DatabaseSync(path);
  const api = {
    async execAsync(sql) { db.exec(sql); },
    async runAsync(sql, ...params) { return db.prepare(sql).run(...params); },
    async getAllAsync(sql, ...params) { return db.prepare(sql).all(...params); },
    async getFirstAsync(sql, ...params) { return db.prepare(sql).get(...params) ?? null; },
    async withExclusiveTransactionAsync(task) {
      db.exec('BEGIN EXCLUSIVE');
      try { await task(api); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    raw: db,
  };
  return api;
}
