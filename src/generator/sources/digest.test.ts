import { describe, expect, it, vi } from 'vitest';
import { jsonModel, promptOf } from '@/test/ai-mock';
import { buildDigest, digestGroup, digestGroups } from './digest';

const chunk = (ordinal: number, label = 'all') => ({
  ordinal,
  text: `本文${ordinal}`,
  label,
});

const allOrdinals = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('buildDigest', () => {
  it('groups by label and by 12 chunks, one call per group', async () => {
    const m = jsonModel([
      {
        points: [{ text: 'A', chunkOrdinals: allOrdinals(0, 11) }],
      },
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
    const m = jsonModel([
      {
        points: [
          { text: 'ok', chunkOrdinals: [0, 99] },
          { text: 'bad', chunkOrdinals: [99] },
        ],
      },
      { points: [{ text: 'for chunk 1', chunkOrdinals: [1] }] },
    ]);
    const digest = await buildDigest([chunk(0), chunk(1)], { model: m });
    expect(digest[0].points).toEqual([
      { text: 'ok', chunkOrdinals: [0] },
      { text: 'for chunk 1', chunkOrdinals: [1] },
    ]);
  });

  it('reports usage for every call', async () => {
    const onUsage = vi.fn();
    await buildDigest([chunk(0)], {
      model: jsonModel([{ points: [{ text: 'x', chunkOrdinals: [0] }] }]),
      onUsage,
    });
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 10, outputTokens: 5 });
  });
});

describe('buildDigest coverage', () => {
  it('asks again for passages no point cited, then merges', async () => {
    const m = jsonModel([
      { points: [{ text: '課題を一つに絞る', chunkOrdinals: [0] }] },
      {
        points: [
          { text: '二週間のPoCで効果を測る', chunkOrdinals: [1] },
          { text: '効果は作業時間で測る', chunkOrdinals: [2] },
        ],
      },
    ]);
    const digest = await buildDigest([chunk(0), chunk(1), chunk(2)], {
      model: m,
    });
    expect(m.doGenerateCalls).toHaveLength(2);
    expect(promptOf(m, 1)).toContain('本文1');
    expect(promptOf(m, 1)).not.toContain('本文0');
    expect(digest[0].points.map((p) => p.chunkOrdinals[0])).toEqual([0, 1, 2]);
  });

  it('makes at most one follow-up call', async () => {
    const m = jsonModel([{ points: [] }, { points: [] }, { points: [] }]);
    await buildDigest([chunk(0), chunk(1)], { model: m });
    expect(m.doGenerateCalls).toHaveLength(2);
  });

  it('skips the follow-up when every passage is covered', async () => {
    const m = jsonModel([{ points: [{ text: 'A', chunkOrdinals: [0, 1] }] }]);
    await buildDigest([chunk(0), chunk(1)], { model: m });
    expect(m.doGenerateCalls).toHaveLength(1);
  });

  it('exposes groups so ingest can digest them as separate resumable steps', async () => {
    const chunks = [
      ...Array.from({ length: 13 }, (_, i) => chunk(i, '第1章')),
      chunk(13, '第2章'),
    ];
    expect(digestGroups(chunks).map((g) => g.length)).toEqual([12, 1, 1]);
    const m = jsonModel([{ points: [{ text: 'C', chunkOrdinals: [13] }] }]);
    expect(await digestGroup([chunk(13, '第2章')], { model: m })).toEqual({
      label: '第2章',
      points: [{ text: 'C', chunkOrdinals: [13] }],
    });
  });
});
