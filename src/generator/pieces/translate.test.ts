import { describe, expect, it } from 'vitest';
import { jsonModel } from '@/test/ai-mock';
import { finishArticle } from './finish';
import { translateMeta, translateSection } from './translate';
import type { Section } from './piece-types';

const section: Section = {
  outlineId: 'o1', heading: '課題', flags: [], enStale: false, en: null,
  blocks: [
    { type: 'paragraph', sentences: [{ text: '課題を絞ります。', cite: ['k'], connective: false }] },
    { type: 'list', items: [{ text: '二週間', cite: ['k'], connective: false }] },
  ],
};

describe('translateSection', () => {
  it('returns English blocks matching the Japanese structure', async () => {
    const en = await translateSection(section, {
      model: jsonModel([{ heading: 'The problem', blocks: [{ type: 'paragraph', text: 'Narrow it down.' }, { type: 'list', items: ['Two weeks'] }] }]),
    });
    expect(en.heading).toBe('The problem');
    expect(en.blocks.map((b) => b.type)).toEqual(['paragraph', 'list']);
  });

  it('fails the run without retrying when the structure does not match', async () => {
    await expect(
      translateSection(section, { model: jsonModel([{ heading: 'x', blocks: [{ type: 'paragraph', text: 'only one' }] }]) })
    ).rejects.toThrow('structure');
  });
});

describe('translateMeta and finishArticle', () => {
  it('translates title and excerpt', async () => {
    const out = await translateMeta({ title: '題', excerpt: '要約' }, { model: jsonModel([{ titleEn: 'Title', excerptEn: 'Summary' }]) });
    expect(out).toEqual({ titleEn: 'Title', excerptEn: 'Summary' });
  });

  it('builds title, excerpt and SEO from the sections', async () => {
    const out = await finishArticle([section], { goal: 'g', audience: '', keywords: [], tone: '', targetLength: 'auto' }, {
      model: jsonModel([{ title: 'T', excerpt: 'E', seo: { title: 'S', description: 'D', keywords: ['k'] } }]),
    });
    expect(out.seo.keywords).toEqual(['k']);
  });
});
