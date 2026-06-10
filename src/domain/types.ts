export type Gender = 'male' | 'female';

export type EntryKind = 'intake' | 'exercise';

export type EntrySource = 'ai' | 'manual' | 'thirdparty';

export type AIProtocol = 'openai' | 'anthropic';

export interface UserProfile {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  // 每日摄入卡路里阈值，超过即警告
  calorieThreshold: number;
}

export interface FoodItemBreakdown {
  name: string;
  calories: number;
}

export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD
  kind: EntryKind;
  description: string;
  imageUri?: string | null;
  calories: number; // 正数：摄入为吃进的热量，运动为消耗的热量
  source: EntrySource;
  items?: FoodItemBreakdown[] | null;
  createdAt: number; // epoch ms
}

export interface AIConfig {
  id: string;
  name: string;
  protocol: AIProtocol;
  baseUrl: string;
  model: string;
  isActive: boolean;
  // apiKey 不存数据库，单独存 expo-secure-store
}

export const ACTIVITY_LEVELS: { factor: number; label: string; desc: string }[] = [
  { factor: 1.2, label: '久坐', desc: '几乎不运动，办公室工作' },
  { factor: 1.375, label: '轻度活动', desc: '每周 1-3 天轻度运动' },
  { factor: 1.55, label: '中度活动', desc: '每周 3-5 天中等强度运动' },
  { factor: 1.725, label: '高度活动', desc: '每周 6-7 天高强度运动' },
  { factor: 1.9, label: '极高活动', desc: '体力劳动或每天高强度训练' },
];

/** 某天未单独设置活动量时的默认系数（轻度活动） */
export const DEFAULT_ACTIVITY_FACTOR = 1.375;
