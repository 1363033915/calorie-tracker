import { CalorieEstimator, EstimateResult, EstimatorError, FoodInput } from './types';

/**
 * ============================================================
 * 开发者扩展口子：不依赖大模型的卡路里估算实现。
 * ------------------------------------------------------------
 * 这里默认是一个未实现的 stub。开发者可以在此接入任意第三方
 * 营养/运动数据库 API（如 USDA FoodData、Nutritionix、薄荷等），
 * 只要实现 CalorieEstimator 接口即可被 App 无缝调用。
 *
 * 接入步骤：
 *   1. 在下面的 estimateFood / estimateExercise 中调用你的 API；
 *   2. 把返回结果整理成 EstimateResult { calories, items[], note }；
 *   3. 在 src/ai/registry.ts 中把 thirdPartyEnabled 逻辑接好
 *      （设置页有「使用第三方接口」开关控制是否启用本实现）。
 *
 * 示例（伪代码）：
 *   const res = await fetch('https://your-nutrition-api/lookup', {
 *     method: 'POST',
 *     headers: { Authorization: `Bearer ${YOUR_KEY}` },
 *     body: JSON.stringify({ query: input.text }),
 *   });
 *   const data = await res.json();
 *   return { calories: data.total, items: data.foods.map(...), note: '来自第三方数据库' };
 * ============================================================
 */
export class ThirdPartyEstimator implements CalorieEstimator {
  readonly id = 'thirdparty';

  // 可注入开发者自定义配置（base url、key 等）
  constructor(private options: Record<string, string> = {}) {}

  async estimateFood(_input: FoodInput): Promise<EstimateResult> {
    throw new EstimatorError(
      '第三方接口尚未实现。请在 src/ai/thirdPartyEstimator.ts 中接入你的营养数据库 API。'
    );
  }

  async estimateExercise(_description: string): Promise<EstimateResult> {
    throw new EstimatorError(
      '第三方接口尚未实现。请在 src/ai/thirdPartyEstimator.ts 中接入你的运动消耗 API。'
    );
  }
}
