import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(dbPath?: string): Database.Database {
  const resolvedPath =
    dbPath ?? path.join(process.cwd(), 'data', 'warmama40k.db');
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables(db);
  return db;
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS owned_units (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      selected_model_count INTEGER NOT NULL DEFAULT 1,
      selected_weapons TEXT NOT NULL DEFAULT '[]',
      photo_url TEXT,
      nickname TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS army_lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      player_id TEXT NOT NULL,
      target_points INTEGER NOT NULL DEFAULT 1000,
      actual_points INTEGER NOT NULL DEFAULT 0,
      faction_groups TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      player1_id TEXT NOT NULL,
      player2_id TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'setup',
      assistance_level TEXT NOT NULL DEFAULT 'HIGH',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (player1_id) REFERENCES players(id),
      FOREIGN KEY (player2_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      faction TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_units_faction ON units(faction);
    CREATE INDEX IF NOT EXISTS idx_owned_units_player ON owned_units(player_id);
    CREATE INDEX IF NOT EXISTS idx_army_lists_player ON army_lists(player_id);
  `);
}
