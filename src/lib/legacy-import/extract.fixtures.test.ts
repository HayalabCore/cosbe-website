import { readFileSync, globSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractFromHtml } from './index';
import { normalizeForSnapshot } from './fixtures';
import type { ContentCategory } from '@/types';

const FIXTURE_ROOT = path.join(__dirname, '__fixtures__');
const files = globSync('**/*.html', { cwd: FIXTURE_ROOT });

// category dir -> a representative legacy URL prefix for slug derivation
const SEGMENT: Record<ContentCategory, string> = {
  'case-study': 'case-studies',
  'useful-info': 'useful-info',
  video: 'useful-movie',
  notice: 'news',
};

describe('extractFromHtml on real fixtures', () => {
  if (files.length === 0) {
    it('has fixtures committed', () => {
      throw new Error('No fixtures found — run yarn capture-fixture first');
    });
    return;
  }

  it.each(files)('extracts %s without falling back', (rel) => {
    const category = rel.split('/')[0] as ContentCategory;
    const slug = path.basename(rel, '.html');
    const url = `https://www.jp.cosbe.inc/${SEGMENT[category]}/${slug}/`;
    const html = readFileSync(path.join(FIXTURE_ROOT, rel), 'utf8');

    const result = extractFromHtml(html, url);

    expect(result.category).toBe(category);
    expect(result.slug).toBe(slug);
    expect(result.title.trim().length).toBeGreaterThan(0);
    expect(result.blocks.length).toBeGreaterThan(0);

    // not the lone fallback paragraph — narrow type before accessing .content
    const firstBlock = result.blocks[0];
    expect(
      result.blocks.length === 1 &&
        firstBlock.type === 'paragraph' &&
        firstBlock.content.startsWith('Imported article')
    ).toBe(false);

    if (category === 'case-study') {
      expect(result.caseStudyMeta).toBeDefined();
    }

    expect(
      normalizeForSnapshot({
        ...result,
        blocks: result.blocks as unknown as Array<Record<string, unknown>>,
      })
    ).toMatchSnapshot();
  });
});
