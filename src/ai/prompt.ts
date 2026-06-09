import { EstimateResult } from './types';
import { FoodItemBreakdown } from '../domain/types';

export const FOOD_SYSTEM_PROMPT =
  '你是营养分析助手。根据用户提供的食物照片或文字描述，估算总卡路里（单位 kcal）。' +
  '必须只返回一个 JSON 对象，不要任何额外文字、不要 markdown 代码块。' +
  'JSON 格式：{"calories": number, "items": [{"name": string, "calories": number}], "note": string}。' +
  'items 列出识别到的每种食物及其卡路里，calories 为所有 items 的总和。note 用一句话中文说明估算依据。';

export const EXERCISE_SYSTEM_PROMPT =
  '你是运动消耗分析助手。根据用户对运动的文字描述，估算消耗的卡路里（单位 kcal）。' +
  '必须只返回一个 JSON 对象，不要任何额外文字、不要 markdown 代码块。' +
  'JSON 格式：{"calories": number, "items": [{"name": string, "calories": number}], "note": string}。' +
  'items 列出每项运动及其消耗，calories 为总消耗。note 用一句话中文说明估算依据。';

/** 从模型返回文本中稳健提取 JSON 并转为 EstimateResult */
export function parseEstimate(text: string): EstimateResult {
  const jsonStr = extractJson(text);
  const raw = JSON.parse(jsonStr) as {
    calories?: number;
    items?: { name?: string; calories?: number }[];
    note?: string;
  };

  const items: FoodItemBreakdown[] = Array.isArray(raw.items)
    ? raw.items.map((it) => ({
        name: String(it.name ?? '未命名'),
        calories: Math.max(0, Math.round(Number(it.calories) || 0)),
      }))
    : [];

  let calories = Math.round(Number(raw.calories));
  if (!Number.isFinite(calories) || calories <= 0) {
    calories = items.reduce((s, it) => s + it.calories, 0);
  }

  return {
    calories: Math.max(0, calories),
    items,
    note: raw.note ? String(raw.note) : undefined,
  };
}

/** 容忍模型在 JSON 前后输出多余文字或代码块围栏 */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('模型未返回有效 JSON: ' + text.slice(0, 200));
  }
  return candidate.slice(start, end + 1);
}
