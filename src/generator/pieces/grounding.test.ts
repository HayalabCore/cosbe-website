import { describe, expect, it } from 'vitest';
import { validateSection } from './grounding';
import type { StudioBlock } from './piece-types';

const s = (text: string, cite: string[] = [], connective = false) => ({ text, cite, connective });
const allowed = new Set(['k1', 'k2']);

describe('validateSection', () => {
  it('accepts cited and fact-free connective sentences', () => {
    const blocks: StudioBlock[] = [
      { type: 'paragraph', sentences: [s('課題を一つに絞ります。', ['k1']), s('では、次の段階を見ていきましょう。', [], true)] },
      { type: 'list', items: [s('二週間で試す', ['k2'])] },
    ];
    expect(validateSection(blocks, { allowedIds: allowed, kind: 'source' })).toEqual([]);
  });

  it('flags uncited sentences in source sections', () => {
    const v = validateSection([{ type: 'paragraph', sentences: [s('導入で30%削減できます。')] }], { allowedIds: allowed, kind: 'source' });
    expect(v).toEqual([expect.stringContaining('No citation')]);
  });

  it('flags citations outside the provided chunks', () => {
    const v = validateSection([{ type: 'paragraph', sentences: [s('本文', ['k9'])] }], { allowedIds: allowed, kind: 'source' });
    expect(v[0]).toContain('Unknown citation');
  });

  it('flags connective sentences that state numbers or names', () => {
    const v = validateSection(
      [{ type: 'paragraph', sentences: [s('効果は30%でした。', [], true), s('Acme社も導入しています。', [], true)] }],
      { allowedIds: allowed, kind: 'source' }
    );
    expect(v).toHaveLength(2);
    expect(v.every((x) => x.includes('Connective'))).toBe(true);
  });

  it('requires citations on tables in source sections', () => {
    const v = validateSection([{ type: 'table', headers: ['a'], rows: [['1']], cite: [] }], { allowedIds: allowed, kind: 'source' });
    expect(v[0]).toContain('table');
  });

  it('does not require citations in boilerplate sections but still rejects unknown ones', () => {
    expect(validateSection([{ type: 'paragraph', sentences: [s('お問い合わせください。')] }], { allowedIds: allowed, kind: 'boilerplate' })).toEqual([]);
    expect(validateSection([{ type: 'paragraph', sentences: [s('x', ['zz'])] }], { allowedIds: allowed, kind: 'boilerplate' })).toHaveLength(1);
  });

  it('flags an empty section', () => {
    expect(validateSection([], { allowedIds: allowed, kind: 'source' })).toEqual(['The section is empty.']);
  });
});
