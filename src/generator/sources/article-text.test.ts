import { describe, expect, it } from 'vitest';
import type { ContentBlock } from '@/types';
import { articleToSegments } from './article-text';

const blocks = [
  {
    id: 'h1',
    type: 'heading',
    level: 2,
    content: '導入の背景',
    contentEn: 'Background',
  },
  {
    id: 'p1',
    type: 'paragraph',
    content: '<p>多くの企業が<strong>AI</strong>を検討しています。</p>',
  },
  { id: 'l1', type: 'list', listType: 'bullet', items: ['課題の定義', 'PoC'] },
  { id: 'img', type: 'image', url: 'x', alt: '図', caption: '導入の流れ' },
  { id: 'h2', type: 'heading', level: 2, content: '結果' },
  {
    id: 't1',
    type: 'table',
    headers: ['指標', '値'],
    rows: [['削減時間', '30%']],
  },
  { id: 'c1', type: 'code', language: 'ts', code: 'const x = 1' },
  { id: 'd1', type: 'divider' },
] as ContentBlock[];

describe('articleToSegments', () => {
  it('builds one segment per heading group from Japanese fields only', () => {
    const { text, segments } = articleToSegments(blocks);
    expect(segments).toHaveLength(2);
    expect(segments[0].locator).toEqual({ blockId: 'h1' });
    expect(segments[1].locator).toEqual({ blockId: 'h2' });
    expect(text).toContain('多くの企業がAIを検討しています。');
    expect(text).toContain('課題の定義');
    expect(text).toContain('導入の流れ');
    expect(text).toContain('削減時間 | 30%');
    expect(text).not.toContain('Background');
    expect(text).not.toContain('<strong>');
    expect(text).not.toContain('const x');
  });

  it('segment offsets index into the joined text', () => {
    const { text, segments } = articleToSegments(blocks);
    for (const s of segments) {
      expect(text.slice(s.start, s.start + s.text.length)).toBe(s.text);
    }
  });
});
