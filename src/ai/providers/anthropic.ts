import { AIConfig } from '../../domain/types';
import { ProviderRequest } from './openai';

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path;
}

/** Anthropic 风格：POST {baseUrl}/v1/messages */
export async function callAnthropic(
  cfg: AIConfig,
  apiKey: string,
  req: ProviderRequest
): Promise<string> {
  const content: any[] = [];
  if (req.imageBase64) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: req.imageMime ?? 'image/jpeg',
        data: req.imageBase64,
      },
    });
  }
  content.push({ type: 'text', text: req.text });

  const resp = await fetch(joinUrl(cfg.baseUrl, '/v1/messages'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 1024,
      system: req.system,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Anthropic 请求失败 ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json();
  const block = Array.isArray(data?.content)
    ? data.content.find((b: any) => b.type === 'text')
    : null;
  if (!block || typeof block.text !== 'string') {
    throw new Error('Anthropic 返回结构异常');
  }
  return block.text;
}
