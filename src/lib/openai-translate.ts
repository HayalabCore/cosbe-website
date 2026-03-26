import 'server-only';

import OpenAI from 'openai';

const MAX_CHARS = 12_000;

function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey: key });
}

function model(): string {
  return process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
}

/** GPT-5 / o-series use `max_completion_tokens`; older chat models use `max_tokens`. */
function completionLimitParams(): {
  max_tokens?: number;
  max_completion_tokens?: number;
} {
  const m = model().toLowerCase();
  const useCompletionTokens =
    m.startsWith('gpt-5') ||
    m.startsWith('o1') ||
    m.startsWith('o2') ||
    m.startsWith('o3') ||
    m.startsWith('o4');
  if (useCompletionTokens) {
    return { max_completion_tokens: 4096 };
  }
  return { max_tokens: 4096 };
}

function assertLength(s: string, label: string) {
  if (s.length > MAX_CHARS) {
    throw new Error(
      `${label} exceeds maximum length (${MAX_CHARS} characters)`
    );
  }
}

/** Plain text → English. Empty input returns empty string. */
export async function translateToEnglish(text: string): Promise<string> {
  const t = text.trim();
  if (!t) return '';
  assertLength(t, 'Source text');

  const openai = getClient();
  const res = await openai.chat.completions.create({
    model: model(),
    messages: [
      {
        role: 'system',
        content:
          'You are a professional translator. Translate the user message into clear, natural English. Output only the translation, with no quotes, labels, or explanation.',
      },
      { role: 'user', content: t },
    ],
    temperature: 0.3,
    ...completionLimitParams(),
  });
  const out = res.choices[0]?.message?.content?.trim() ?? '';
  return out;
}

/** Parallel strings (e.g. list items) → English, same length. */
export async function translateStringsToEnglish(
  items: string[]
): Promise<string[]> {
  if (items.length === 0) return [];
  const payload = JSON.stringify({ items });
  assertLength(payload, 'Source list');

  const openai = getClient();
  const res = await openai.chat.completions.create({
    model: model(),
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Translate each string in the "items" array to English. Return JSON only: {"items": string[]} with exactly the same array length as the input.',
      },
      { role: 'user', content: payload },
    ],
    temperature: 0.3,
    ...completionLimitParams(),
  });
  const raw = res.choices[0]?.message?.content?.trim() ?? '{}';
  let parsed: { items?: string[] };
  try {
    parsed = JSON.parse(raw) as { items?: string[] };
  } catch {
    throw new Error('Invalid translation response for list');
  }
  const out = parsed.items ?? [];
  if (out.length !== items.length) {
    while (out.length < items.length) out.push('');
    return out.slice(0, items.length);
  }
  return out;
}
