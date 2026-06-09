import { FoodItemBreakdown } from '../domain/types';

export interface EstimateResult {
  calories: number;
  items: FoodItemBreakdown[];
  // 模型/数据源给出的简短说明，便于用户核对
  note?: string;
}

export interface FoodInput {
  text?: string;
  // 图片的 base64（不含 data: 前缀）
  imageBase64?: string;
  imageMime?: string; // e.g. 'image/jpeg'
}

/**
 * 卡路里估算器统一接口。
 * AI 是其中一种实现；开发者可提供调用第三方营养数据库 API 的实现并通过注册表替换。
 */
export interface CalorieEstimator {
  readonly id: string;
  estimateFood(input: FoodInput): Promise<EstimateResult>;
  estimateExercise(description: string): Promise<EstimateResult>;
}

export class EstimatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EstimatorError';
  }
}
