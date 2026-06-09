import * as SecureStore from 'expo-secure-store';
import { AIConfig } from '../domain/types';
import { getDb } from './database';

interface AIConfigRow {
  id: string;
  name: string;
  protocol: string;
  baseUrl: string;
  model: string;
  isActive: number;
}

// SecureStore 的 key 只允许字母数字、'.'、'-'、'_'
function keyStoreId(configId: string): string {
  return `ai_key_${configId.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

function rowToConfig(r: AIConfigRow): AIConfig {
  return {
    id: r.id,
    name: r.name,
    protocol: r.protocol as AIConfig['protocol'],
    baseUrl: r.baseUrl,
    model: r.model,
    isActive: r.isActive === 1,
  };
}

export async function listAIConfigs(): Promise<AIConfig[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AIConfigRow>('SELECT * FROM ai_configs ORDER BY name');
  return rows.map(rowToConfig);
}

export async function getActiveAIConfig(): Promise<AIConfig | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AIConfigRow>(
    'SELECT * FROM ai_configs WHERE isActive = 1 LIMIT 1'
  );
  return row ? rowToConfig(row) : null;
}

export async function getApiKey(configId: string): Promise<string | null> {
  return SecureStore.getItemAsync(keyStoreId(configId));
}

export async function upsertAIConfig(cfg: AIConfig, apiKey: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO ai_configs (id, name, protocol, baseUrl, model, isActive)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       protocol = excluded.protocol,
       baseUrl = excluded.baseUrl,
       model = excluded.model,
       isActive = excluded.isActive`,
    [cfg.id, cfg.name, cfg.protocol, cfg.baseUrl, cfg.model, cfg.isActive ? 1 : 0]
  );
  if (apiKey != null && apiKey.length > 0) {
    await SecureStore.setItemAsync(keyStoreId(cfg.id), apiKey);
  }
}

export async function setActiveAIConfig(configId: string): Promise<void> {
  const db = await getDb();
  await db.execAsync('UPDATE ai_configs SET isActive = 0');
  await db.runAsync('UPDATE ai_configs SET isActive = 1 WHERE id = ?', [configId]);
}

export async function deleteAIConfig(configId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM ai_configs WHERE id = ?', [configId]);
  await SecureStore.deleteItemAsync(keyStoreId(configId)).catch(() => {});
}
