import { describe, expect, it, vi } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import { buildDigest } from './digest';

function model(responses: object[]) {
  return new MockLanguageModelV4({
    doGenerate: responses.map((r) => ({
      content: [{ type: 'text' as const, text: JSON.stringify(r) }],
      finishReason: { unified: 'stop' as const, raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 5, reasoning: 0 },
      },
      warnings: [],
    })),
  });
}

const chunk = (ordinal: number, label = 'all') => ({
  ordinal,
  text: `本文${ordinal}`,
  label,
});

describe('buildDigest', () => {
  it('groups by label and by 12 chunks, one call per group', async () => {
    const m = model([
      { points: [{ text: 'A', chunkOrdinals: [0, 1] }] },
      { points: [{ text: 'B', chunkOrdinals: [12] }] },
      { points: [{ text: 'C', chunkOrdinals: [13] }] },
    ]);
    const chunks = [
      ...Array.from({ length: 13 }, (_, i) => chunk(i, '第1章')),
      chunk(13, '第2章'),
    ];
    const digest = await buildDigest(chunks, { model: m });
    expect(m.doGenerateCalls).toHaveLength(3);
    expect(digest.map((d) => d.label)).toEqual(['第1章', '第1章', '第2章']);
  });

  it('drops citations outside the group and empty points', async () => {
    const m = model([
      {
        points: [
          { text: 'ok', chunkOrdinals: [0, 99] },
          { text: 'bad', chunkOrdinals: [99] },
        ],
      },
    ]);
    const digest = await buildDigest([chunk(0), chunk(1)], { model: m });
    expect(digest[0].points).toEqual([{ text: 'ok', chunkOrdinals: [0] }]);
  });

  it('reports usage for every call', async () => {
    const onUsage = vi.fn();
    await buildDigest([chunk(0)], {
      model: model([{ points: [] }]),
      onUsage,
    });
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 10, outputTokens: 5 });
  });
});
