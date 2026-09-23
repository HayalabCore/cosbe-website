import { describe, expect, it } from 'vitest';
import { jsonModel, promptOf } from '@/test/ai-mock';
import { finishArticle } from './finish';
import { translateMeta, translateSection } from './translate';
import type { Section } from './piece-types';
import { NonRetryableRunError } from '../runs/run-types';

const section: Section = {
  outlineId: 'o1',
  heading: '課題',
  flags: [],
  enStale: false,
  en: null,
  blocks: [
    {
      type: 'paragraph',
      sentences: [{ text: '課題を絞ります。', cite: ['k'], connective: false }],
    },
    {
      type: 'list',
      items: [{ text: '二週間', cite: ['k'], connective: false }],
    },
  ],
};

describe('translateSection', () => {
  it('returns English blocks matching the Japanese structure', async () => {
    const en = await translateSection(section, {
      model: jsonModel([
        {
          heading: 'The problem',
          blocks: [
            { type: 'paragraph', text: 'Narrow it down.' },
            { type: 'list', items: ['Two weeks'] },
          ],
        },
      ]),
    });
    expect(en.heading).toBe('The problem');
    expect(en.blocks.map((b) => b.type)).toEqual(['paragraph', 'list']);
  });

  it('repairs once when list items do not line up, then succeeds', async () => {
    const m = jsonModel([
      {
        heading: 'x',
        blocks: [
          { type: 'paragraph', text: 'a' },
          { type: 'list', items: [] },
        ],
      },
      {
        heading: 'x',
        blocks: [
          { type: 'paragraph', text: 'a' },
          { type: 'list', items: ['Two weeks'] },
        ],
      },
    ]);
    const en = await translateSection(section, { model: m });
    expect(m.doGenerateCalls).toHaveLength(2);
    expect(en.blocks[1]).toEqual({ type: 'list', items: ['Two weeks'] });
  });

  it('fails without retrying the run when the repair still does not match', async () => {
    const bad = {
      heading: 'x',
      blocks: [{ type: 'paragraph', text: 'only one' }],
    };
    await expect(
      translateSection(section, { model: jsonModel([bad, bad]) })
    ).rejects.toThrow(NonRetryableRunError);
  });

  it('detects a table row that lost a cell', async () => {
    const table: Section = {
      ...section,
      blocks: [
        { type: 'table', headers: ['a', 'b'], rows: [['1', '2']], cite: ['k'] },
      ],
    };
    const short = {
      heading: 'x',
      blocks: [{ type: 'table', headers: ['A', 'B'], rows: [['1']] }],
    };
    await expect(
      translateSection(table, { model: jsonModel([short, short]) })
    ).rejects.toThrow(NonRetryableRunError);
  });
});

describe('translateMeta and finishArticle', () => {
  it('translates title and excerpt', async () => {
    const out = await translateMeta(
      { title: '題', excerpt: '要約' },
      { model: jsonModel([{ titleEn: 'Title', excerptEn: 'Summary' }]) }
    );
    expect(out).toEqual({ titleEn: 'Title', excerptEn: 'Summary' });
  });

  it('gives finish the brief keywords for SEO', async () => {
    const m = jsonModel([
      {
        title: 'T',
        excerpt: 'E',
        seo: { title: 'S', description: 'D', keywords: [] },
      },
    ]);
    await finishArticle(
      [section],
      {
        goal: 'g',
        audience: '',
        keywords: ['DX'],
        tone: '',
        targetLength: 'auto',
      },
      { model: m }
    );
    expect(promptOf(m)).toContain('Keywords: DX');
  });

  it('builds title, excerpt and SEO from the sections', async () => {
    const out = await finishArticle(
      [section],
      { goal: 'g', audience: '', keywords: [], tone: '', targetLength: 'auto' },
      {
        model: jsonModel([
          {
            title: 'T',
            excerpt: 'E',
            seo: { title: 'S', description: 'D', keywords: ['k'] },
          },
        ]),
      }
    );
    expect(out.seo.keywords).toEqual(['k']);
  });
});
