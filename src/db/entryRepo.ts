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
