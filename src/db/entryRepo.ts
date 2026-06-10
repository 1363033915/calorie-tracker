import { Entry, FoodItemBreakdown } from '../domain/types';
import { getDb } from './database';

interface EntryRow {
  id: string;
  date: string;
  kind: string;
  description: string;
  imageUri: string | null;
  calories: number;
  source: string;
  items: string | null;
  createdAt: number;
}

function rowToEntry(r: EntryRow): Entry {
  let items: FoodItemBreakdown[] | null = null;
  if (r.items) {
    try {
      items = JSON.parse(r.items);
    } catch {
      items = null;
    }
  }
  return {
    id: r.id,
    date: r.date,
    kind: r.kind as Entry['kind'],
    description: r.description,
    imageUri: r.imageUri,
    calories: r.calories,
    source: r.source as Entry['source'],
    items,
    createdAt: r.createdAt,
  };
}

export async function listEntriesByDate(date: string): Promise<Entry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries WHERE date = ? ORDER BY createdAt DESC',
    [date]
  );
  return rows.map(rowToEntry);
}

export interface DailyTotals {
  date: string; // YYYY-MM-DD
  intake: number; // 当日摄入总卡路里
  exercise: number; // 当日运动消耗总卡路里
}

/** 按日期聚合每日摄入/运动总量，日期升序。可选只取 sinceDate（含）之后的数据。 */
export async function listDailyTotals(sinceDate?: string): Promise<DailyTotals[]> {
  const db = await getDb();
  const where = sinceDate ? 'WHERE date >= ?' : '';
  const params = sinceDate ? [sinceDate] : [];
  return db.getAllAsync<DailyTotals>(
    `SELECT date,
            SUM(CASE WHEN kind = 'intake' THEN calories ELSE 0 END) AS intake,
            SUM(CASE WHEN kind = 'exercise' THEN calories ELSE 0 END) AS exercise
     FROM entries
     ${where}
     GROUP BY date
     ORDER BY date ASC`,
    params
  );
}

export async function insertEntry(e: Entry): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO entries (id, date, kind, description, imageUri, calories, source, items, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      e.id,
      e.date,
      e.kind,
      e.description,
      e.imageUri ?? null,
      e.calories,
      e.source,
      e.items ? JSON.stringify(e.items) : null,
      e.createdAt,
    ]
  );
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM entries WHERE id = ?', [id]);
}
