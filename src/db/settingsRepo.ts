import { getDb } from './database';

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row ? row.value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export const SETTING_USE_THIRD_PARTY = 'use_third_party';

export async function getUseThirdParty(): Promise<boolean> {
  return (await getSetting(SETTING_USE_THIRD_PARTY)) === '1';
}

export async function setUseThirdParty(on: boolean): Promise<void> {
  await setSetting(SETTING_USE_THIRD_PARTY, on ? '1' : '0');
}
