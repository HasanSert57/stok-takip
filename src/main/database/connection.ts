import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';

let sqliteInstance: Database.Database | null = null;
let dbInstance: BetterSQLite3Database<typeof schema> | null = null;
let customDbPath: string | null = null;

export function setCustomDatabasePath(filePath: string): void {
  customDbPath = filePath;
}

export function getDatabasePath(): string {
  let dbPath = customDbPath;

  if (!dbPath) {
    let baseDir = process.cwd();
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { app } = require('electron');
      if (app && app.getPath) {
        baseDir = app.getPath('userData');
      }
    } catch {
      baseDir = path.join(process.cwd(), '.data');
    }
    dbPath = path.join(baseDir, 'data', 'kodhanem.sqlite');
  }

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dbPath;
}

export function getSqliteInstance(): Database.Database {
  if (!sqliteInstance) {
    const dbPath = getDatabasePath();
    sqliteInstance = new Database(dbPath);
    sqliteInstance.pragma('foreign_keys = ON;');
    sqliteInstance.pragma('journal_mode = WAL;');
  }
  return sqliteInstance;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!dbInstance) {
    const sqlite = getSqliteInstance();
    dbInstance = drizzle(sqlite, { schema });
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (sqliteInstance) {
    try {
      sqliteInstance.close();
    } catch (e) {
      console.error('Error closing database connection:', e);
    } finally {
      sqliteInstance = null;
      dbInstance = null;
    }
  }
}

export function reconnectDatabase(): BetterSQLite3Database<typeof schema> {
  closeDatabase();
  return getDb();
}
