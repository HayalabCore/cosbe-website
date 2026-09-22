import { describe, expect, it } from 'vitest';
import { toArticleBlocks } from './to-article-blocks';
import type { Section } from './piece-types';

let n = 0;
const id = () => `b${++n}`;
const s = (text: string) => ({ text, cite: ['secret-chunk-id'], connective: false });

const section: Section = {
  outlineId: 'o1', heading: '課題', flags: [], enStale: false,
  blocks: [
    { type: 'paragraph', sentences: [s('A&Bを<比較>します。'), s('次へ。')] },
    { type: 'list', items: [s('一つ目')] },
    { type: 'table', headers: ['指標'], rows: [['30%']], cite: ['secret-chunk-id'] },
  ],
  en: { heading: 'Problem', blocks: [
    { type: 'paragraph', text: 'Compare A&B.' },
    { type: 'list', items: ['First'] },
    { type: 'table', headers: ['Metric'], rows: [['30%']] },
  ] },
};

describe('toArticleBlocks', () => {
  it('emits a heading per section and escaped paragraphs with English', () => {
    n = 0;
    const blocks = toArticleBlocks([section], id);
    expect(blocks[0]).toEqual({ id: 'b1', type: 'heading', level: 2, content: '課題', contentEn: 'Problem' });
    expect(blocks[1]).toMatchObject({
      type: 'paragraph',
      content: '<p>A&amp;Bを&lt;比較&gt;します。次へ。</p>',
      contentEn: '<p>Compare A&amp;B.</p>',
    });
    expect(blocks[2]).toMatchObject({ type: 'list', items: ['一つ目'], itemsEn: ['First'] });
    expect(blocks[3]).toMatchObject({ type: 'table', headersEn: ['Metric'] });
  });

  it('never leaks citation data', () => {
    expect(JSON.stringify(toArticleBlocks([section], id))).not.toContain('secret-chunk-id');
  });

  it('omits English when the translation is missing or stale', () => {
    const blocks = toArticleBlocks([{ ...section, enStale: true }], id);
    expect(blocks[0]).not.toHaveProperty('contentEn');
    expect(blocks[1]).not.toHaveProperty('contentEn');
  });
});
