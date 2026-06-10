import * as SQLite from 'expo-sqlite';
import { todayKey } from '../lib/date';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('calorie.db').then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      gender TEXT NOT NULL,
      age INTEGER NOT NULL,
      heightCm REAL NOT NULL,
      weightKg REAL NOT NULL,
      calorieThreshold REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      protocol TEXT NOT NULL,
      baseUrl TEXT NOT NULL,
      model TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      kind TEXT NOT NULL,
      description TEXT NOT NULL,
      imageUri TEXT,
      calories REAL NOT NULL,
      source TEXT NOT NULL,
      items TEXT,
      createdAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_activity (
      date TEXT PRIMARY KEY,
      factor REAL NOT NULL
    );
  `);

  await migrateActivityFactor(db);
}

/**
 * v2 迁移：活动量从「个人资料固定值」改为「每日单独记录」。
 * 把旧 profile.activityFactor 写入 daily_activity 的今天一条，再从 profile 删列。
 * 用 user_version 守门，保证只跑一次。
 */
async function migrateActivityFactor(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= 2) return;

  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(profile)');
  const hasFactor = cols.some((c) => c.name === 'activityFactor');

  if (hasFactor) {
    const prof = await db.getFirstAsync<{ activityFactor: number }>(
      'SELECT activityFactor FROM profile WHERE id = 1'
    );
    if (prof) {
      await db.runAsync(
        `INSERT INTO daily_activity (date, factor) VALUES (?, ?)
         ON CONFLICT(date) DO NOTHING`,
        [todayKey(), prof.activityFactor]
      );
    }
    // SQLite 3.35+ 支持 DROP COLUMN（Expo SDK 56 内置版本满足）
    await db.execAsync('ALTER TABLE profile DROP COLUMN activityFactor');
  }

  await db.execAsync('PRAGMA user_version = 2');
}
