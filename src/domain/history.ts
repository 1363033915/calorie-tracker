import { DailyTotals } from '../db/entryRepo';
import { calcBaselineBurn, KCAL_PER_KG } from './calories';
import { DEFAULT_ACTIVITY_FACTOR, UserProfile } from './types';

export interface DayStat {
  date: string; // YYYY-MM-DD
  intake: number;
  exercise: number;
  baselineBurn: number;
  totalBurn: number;
  net: number; // 摄入 − 总消耗
  weightDeltaKg: number; // 当日理论体重变化（净热量 ÷ 7700）
  overThreshold: boolean;
}

/**
 * 把每日聚合数据转成统计明细。每天的活动系数从 factorByDate 取，
 * 未记录的天用 DEFAULT_ACTIVITY_FACTOR 兜底，因此各天基础消耗可能不同。
 */
export function buildDayStats(
  totals: DailyTotals[],
  profile: UserProfile,
  factorByDate: Record<string, number>
): DayStat[] {
  return totals.map((t) => {
    const factor = factorByDate[t.date] ?? DEFAULT_ACTIVITY_FACTOR;
    const baselineBurn = calcBaselineBurn(profile, factor);
    const totalBurn = baselineBurn + t.exercise;
    const net = t.intake - totalBurn;
    return {
      date: t.date,
      intake: t.intake,
      exercise: t.exercise,
      baselineBurn,
      totalBurn,
      net,
      weightDeltaKg: net / KCAL_PER_KG,
      overThreshold: t.intake > profile.calorieThreshold,
    };
  });
}

export interface WeightPoint {
  date: string;
  weightKg: number;
}

/**
 * 由当前体重反推理论体重曲线。
 * 约定：最近一天（数组末尾）的体重 = 当前 profile 体重，
 * 再用每天的理论体重变化向前回溯：weight[i-1] = weight[i] − delta[i]。
 * stats 需按日期升序。
 */
export function buildWeightSeries(stats: DayStat[], currentWeightKg: number): WeightPoint[] {
  const n = stats.length;
  if (n === 0) return [];
  const weights = new Array<number>(n);
  weights[n - 1] = currentWeightKg;
  for (let i = n - 1; i > 0; i--) {
    weights[i - 1] = weights[i] - stats[i].weightDeltaKg;
  }
  return stats.map((s, i) => ({ date: s.date, weightKg: weights[i] }));
}

export interface HistoryRange {
  label: string;
  days: number | null; // null = 全部
}

export const HISTORY_RANGES: HistoryRange[] = [
  { label: '7 天', days: 7 },
  { label: '30 天', days: 30 },
  { label: '90 天', days: 90 },
  { label: '全部', days: null },
];

/** 返回 days 天前的 YYYY-MM-DD（含今天往前数 days 天）。 */
export function sinceDateKey(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - (days - 1));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
