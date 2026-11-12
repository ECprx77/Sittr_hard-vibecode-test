import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export function getDb(dbPath = config.databasePath): Database.Database {
  if (db && dbPath === config.databasePath) return db;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const instance = new Database(dbPath);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');

  if (dbPath === config.databasePath) {
    db = instance;
  }
  return instance;
}

export function migrate(database = getDb()): void {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  database.exec(schema);
}

export function resetDbForTests(dbPath: string): Database.Database {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  db = null;
  const database = getDb(dbPath);
  // Force test path as active db
  db = database;
  migrate(database);
  return database;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
