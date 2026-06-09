import { getActiveAIConfig, getApiKey } from '../db/aiConfigRepo';
import { getUseThirdParty } from '../db/settingsRepo';
import { AIEstimator } from './aiEstimator';
import { ThirdPartyEstimator } from './thirdPartyEstimator';
import { CalorieEstimator, EstimatorError } from './types';

/**
 * 解析当前应使用的卡路里估算器：
 * - 若设置里开启「使用第三方接口」→ ThirdPartyEstimator（开发者口子）
 * - 否则使用当前激活的 AI 配置 → AIEstimator
 */
export async function resolveEstimator(): Promise<CalorieEstimator> {
  if (await getUseThirdParty()) {
    return new ThirdPartyEstimator();
  }

  const cfg = await getActiveAIConfig();
  if (!cfg) {
    throw new EstimatorError('尚未配置 AI。请到「设置」添加并激活一个 AI 配置，或开启第三方接口。');
  }
  const key = await getApiKey(cfg.id);
  if (!key) {
    throw new EstimatorError(`配置「${cfg.name}」缺少 API Key，请到设置中重新填写。`);
  }
  return new AIEstimator(cfg, key);
}
