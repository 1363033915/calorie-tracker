import { AIConfig } from '../domain/types';
import { callAnthropic } from './providers/anthropic';
import { callOpenAI, ProviderRequest } from './providers/openai';
import {
  EXERCISE_SYSTEM_PROMPT,
  FOOD_SYSTEM_PROMPT,
  parseEstimate,
} from './prompt';
import { CalorieEstimator, EstimateResult, EstimatorError, FoodInput } from './types';

/** 基于用户配置的 AI 厂商实现卡路里估算 */
export class AIEstimator implements CalorieEstimator {
  readonly id = 'ai';

  constructor(private cfg: AIConfig, private apiKey: string) {}

  private async call(req: ProviderRequest): Promise<string> {
    if (this.cfg.protocol === 'anthropic') {
      return callAnthropic(this.cfg, this.apiKey, req);
    }
    return callOpenAI(this.cfg, this.apiKey, req);
  }

  async estimateFood(input: FoodInput): Promise<EstimateResult> {
    if (!input.text && !input.imageBase64) {
      throw new EstimatorError('请提供食物照片或文字描述');
    }
    const text =
      input.text && input.text.trim().length > 0
        ? `食物描述：${input.text}`
        : '请根据图片识别食物并估算卡路里。';
    const raw = await this.call({
      system: FOOD_SYSTEM_PROMPT,
      text,
      imageBase64: input.imageBase64,
      imageMime: input.imageMime,
    });
    return parseEstimate(raw);
  }

  async estimateExercise(description: string): Promise<EstimateResult> {
    if (!description.trim()) {
      throw new EstimatorError('请描述你的运动');
    }
    const raw = await this.call({
      system: EXERCISE_SYSTEM_PROMPT,
      text: `运动描述：${description}`,
    });
    return parseEstimate(raw);
  }
}
