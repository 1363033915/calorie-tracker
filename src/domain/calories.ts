import { Entry, UserProfile } from './types';

// 每公斤脂肪约等于 7700 kcal（营养学常用换算）
export const KCAL_PER_KG = 7700;

/**
 * 基础代谢率 BMR — Mifflin-St Jeor 公式（kcal/天）
 * 男: 10·体重(kg) + 6.25·身高(cm) - 5·年龄 + 5
 * 女: 10·体重(kg) + 6.25·身高(cm) - 5·年龄 - 161
 */
export function calcBMR(p: Pick<UserProfile, 'gender' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.gender === 'male' ? base + 5 : base - 161;
}

/**
 * 每日基础消耗 = BMR × 当日活动系数（不含刻意运动，运动记录额外叠加）。
 * 活动系数按天单独记录，由调用方传入。
 */
export function calcBaselineBurn(p: UserProfile, activityFactor: number): number {
  return calcBMR(p) * activityFactor;
}

export interface DailySummary {
  intake: number; // 今日摄入总卡路里
  exercise: number; // 今日运动消耗总卡路里
  baselineBurn: number; // 今日基础代谢消耗
  totalBurn: number; // 基础代谢 + 运动
  net: number; // 净热量 = 摄入 - 总消耗
  weightDeltaKg: number; // 理论体重变化（正=增，负=减）
  overThreshold: boolean; // 摄入是否超过阈值
  thresholdRemaining: number; // 距阈值还剩多少（负数表示超出）
}

export function summarizeDay(
  entries: Entry[],
  profile: UserProfile,
  activityFactor: number
): DailySummary {
  let intake = 0;
  let exercise = 0;
  for (const e of entries) {
    if (e.kind === 'intake') intake += e.calories;
    else exercise += e.calories;
  }
  const baselineBurn = calcBaselineBurn(profile, activityFactor);
  const totalBurn = baselineBurn + exercise;
  const net = intake - totalBurn;
  return {
    intake,
    exercise,
    baselineBurn,
    totalBurn,
    net,
    weightDeltaKg: net / KCAL_PER_KG,
    overThreshold: intake > profile.calorieThreshold,
    thresholdRemaining: profile.calorieThreshold - intake,
  };
}

/** 把卡路里净值换算为理论体重变化（kg） */
export function caloriesToWeightKg(netCalories: number): number {
  return netCalories / KCAL_PER_KG;
}
