import { describe, expect, it } from 'vitest';
import { estimateTokens } from '@/ai/generate';
import { ingestTokenCeiling } from '../runs/run-types';
import { digestGroups } from '../sources/digest';
import { MAX_TEXT_SOURCE_CHARS } from '../sources/source-types';
import { chunkSegments } from '../text/chunker';

const EMBED_BATCH = 64;
const OUTPUT_RESERVE = 4_096;

describe('ingest budget for the largest allowed source', () => {
  it('fits a maximum-size Japanese transcript, even if every digest group needs its follow-up pass', () => {
    const line = '今日は営業の自動化について具体的な手順を順番にお話しします';
    const text = Array.from(
      { length: Math.ceil(MAX_TEXT_SOURCE_CHARS / (line.length + 1)) },
      () => line
    )
      .join('\n')
      .slice(0, MAX_TEXT_SOURCE_CHARS);
    const chunks = chunkSegments([{ text, start: 0, locator: {} }]);

    let estimate = 0;
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      estimate += estimateTokens(
        chunks
          .slice(i, i + EMBED_BATCH)
          .map((c) => c.text)
          .join('\n')
      );
    }
    const groups = digestGroups(
      chunks.map((c) => ({ ordinal: c.ordinal, text: c.text, label: 'all' }))
    );
    for (const group of groups) {
      const prompt = group.map((c) => c.text).join('\n');
      // First pass plus a worst-case follow-up over the same passages.
      estimate += 2 * (estimateTokens(prompt) + OUTPUT_RESERVE);
    }
    expect(estimate).toBeLessThan(
      ingestTokenCeiling(MAX_TEXT_SOURCE_CHARS, {})
    );
  });
});
