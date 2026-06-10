import { getDb } from './database';

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  factor: number;
}

/** 取某天的活动系数；未记录返回 null（调用方用默认值兜底） */
export async function getDailyActivity(date: string): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ factor: number }>(
    'SELECT factor FROM daily_activity WHERE date = ?',
    [date]
  );
  return row ? row.factor : null;
}

export async function setDailyActivity(date: string, factor: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO daily_activity (date, factor) VALUES (?, ?)
     ON CONFLICT(date) DO UPDATE SET factor = excluded.factor`,
    [date, factor]
  );
}

/** 取一组日期的活动系数，返回 date→factor 映射（用于统计页批量查询） */
export async function getActivityMap(sinceDate?: string): Promise<Record<string, number>> {
  const db = await getDb();
  const where = sinceDate ? 'WHERE date >= ?' : '';
  const params = sinceDate ? [sinceDate] : [];
  const rows = await db.getAllAsync<DailyActivity>(
    `SELECT date, factor FROM daily_activity ${where}`,
    params
  );
  const map: Record<string, number> = {};
  for (const r of rows) map[r.date] = r.factor;
  return map;
}
