import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/** A single-process persistent MVP store. Every queue transition is committed before IO. */
export class Store {
  constructor(path) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS records (bucket TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY (bucket,id));');
    this.inTransaction = false;
  }
  read(bucket, id) {
    const row = this.db.prepare('SELECT body FROM records WHERE bucket=? AND id=?').get(bucket, id);
    return row ? JSON.parse(row.body) : null;
  }
  all(bucket) {
    return this.db.prepare('SELECT body FROM records WHERE bucket=? ORDER BY rowid').all(bucket).map(row => JSON.parse(row.body));
  }
  write(bucket, id, data) {
    this.db.prepare('INSERT INTO records(bucket,id,body) VALUES(?,?,?) ON CONFLICT(bucket,id) DO UPDATE SET body=excluded.body').run(bucket, id, JSON.stringify(data));
    return data;
  }
  remove(bucket, id) { this.db.prepare('DELETE FROM records WHERE bucket=? AND id=?').run(bucket, id); }
  transaction(fn) {
    if (this.inTransaction) return fn();
    this.db.exec('BEGIN IMMEDIATE'); this.inTransaction = true;
    try { const value = fn(); this.db.exec('COMMIT'); return value; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
    finally { this.inTransaction = false; }
  }
  close() { this.db.close(); }
}
