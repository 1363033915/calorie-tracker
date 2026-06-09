import { AIConfig } from '../../domain/types';

export interface ProviderRequest {
  system: string;
  text: string;
  imageBase64?: string;
  imageMime?: string;
}

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path;
}

/** OpenAI 风格：POST {baseUrl}/chat/completions（兼容大多数国内外 OpenAI 协议网关） */
export async function callOpenAI(
  cfg: AIConfig,
  apiKey: string,
  req: ProviderRequest
): Promise<string> {
  const content: any[] = [{ type: 'text', text: req.text }];
  if (req.imageBase64) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${req.imageMime ?? 'image/jpeg'};base64,${req.imageBase64}` },
    });
  }

  const resp = await fetch(joinUrl(cfg.baseUrl, '/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content },
      ],
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`OpenAI 请求失败 ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error('OpenAI 返回结构异常');
  }
  return text;
}
