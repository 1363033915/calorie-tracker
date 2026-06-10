import { UserProfile } from '../domain/types';
import { getDb } from './database';

interface ProfileRow {
  gender: string;
  age: number;
  heightCm: number;
  weightKg: number;
  calorieThreshold: number;
}

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  if (!row) return null;
  return {
    gender: row.gender as UserProfile['gender'],
    age: row.age,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    calorieThreshold: row.calorieThreshold,
  };
}

export async function saveProfile(p: UserProfile): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO profile (id, gender, age, heightCm, weightKg, calorieThreshold)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       gender = excluded.gender,
       age = excluded.age,
       heightCm = excluded.heightCm,
       weightKg = excluded.weightKg,
       calorieThreshold = excluded.calorieThreshold`,
    [p.gender, p.age, p.heightCm, p.weightKg, p.calorieThreshold]
  );
}
