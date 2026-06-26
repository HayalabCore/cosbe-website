import { parseLegacyUrl } from './index';

export function parseBulkUrls(text: string): {
  valid: string[];
  invalid: Array<{ line: string; reason: string }>;
} {
  const valid: string[] = [];
  const invalid: Array<{ line: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    try {
      parseLegacyUrl(line);
    } catch (e) {
      invalid.push({
        line,
        reason: e instanceof Error ? e.message : 'Invalid URL',
      });
      continue;
    }
    if (seen.has(line)) continue;
    seen.add(line);
    valid.push(line);
  }

  return { valid, invalid };
}
