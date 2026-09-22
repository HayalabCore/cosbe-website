import { describe, expect, it } from 'vitest';
import { jsonModel, promptOf } from '@/test/ai-mock';
import { writeSection } from './write-section';

const brief = { goal: 'g', audience: '', keywords: [], tone: '', targetLength: 'auto' as const };
const section = { id: 'o1', heading: '課題を絞る', intent: 'why', chunkIds: ['id-a'], estChars: 300, kind: 'source' as const, stale: false };
const chunks = [{ id: 'id-a', sourceId: 's', sourceTitle: 'メモ', ordinal: 0, text: '課題を一つに絞ります', locator: {} }];
const para = (text: string, cite: string[], connective = false) => ({ type: 'paragraph', sentences: [{ text, cite, connective }] });

describe('writeSection', () => {
  const base = { brief, template: null, outline: [section], section, chunks, previousTail: '' };

  it('maps aliases to chunk ids and returns a clean section', async () => {
    const m = jsonModel([{ blocks: [para('まず課題を一つに絞ります。', ['c1'])] }]);
    const out = await writeSection(base, { model: m });
    expect(promptOf(m)).toContain('[c1]');
    expect(out).toMatchObject({ outlineId: 'o1', heading: '課題を絞る', flags: [], en: null });
    expect(out.blocks[0]).toMatchObject({ sentences: [{ cite: ['id-a'] }] });
  });

  it('repairs once when the first draft breaks the contract', async () => {
    const m = jsonModel([
      { blocks: [para('導入で30%削減できます。', [])] },
      { blocks: [para('まず課題を一つに絞ります。', ['c1'])] },
    ]);
    const out = await writeSection(base, { model: m });
    expect(m.doGenerateCalls).toHaveLength(2);
    expect(promptOf(m, 1)).toContain('No citation');
    expect(out.flags).toEqual([]);
  });

  it('keeps remaining violations as flags after one repair', async () => {
    const bad = { blocks: [para('導入で30%削減できます。', [])] };
    const out = await writeSection(base, { model: jsonModel([bad, bad]) });
    expect(out.flags[0]).toContain('No citation');
  });

  it('passes the rewrite instruction and current text when given', async () => {
    const m = jsonModel([{ blocks: [para('短くしました。', ['c1'])] }]);
    await writeSection({ ...base, instruction: 'もっと短く', current: [para('元の文。', ['id-a']) as never] }, { model: m });
    expect(promptOf(m)).toContain('もっと短く');
    expect(promptOf(m)).toContain('元の文。');
  });
});
