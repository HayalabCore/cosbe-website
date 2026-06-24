import { describe, expect, it } from 'vitest';

import {
  isEnglishLocale,
  resolveArticleExcerpt,
  resolveArticleTitle,
  resolveBlockForLocale,
} from '@/lib/article-locale';
import type {
  CalloutBlock,
  EmbedBlock,
  HeadingBlock,
  ImageBlock,
  ListBlock,
  ParagraphBlock,
  QuoteBlock,
  TableBlock,
} from '@/types';

describe('isEnglishLocale', () => {
  it('is true only for "en"', () => {
    expect(isEnglishLocale('en')).toBe(true);
    expect(isEnglishLocale('ja')).toBe(false);
    expect(isEnglishLocale('fr')).toBe(false);
  });
});

describe('resolveArticleTitle', () => {
  const article = { title: '日本語', titleEn: 'English' };

  it('prefers English on /en', () => {
    expect(resolveArticleTitle(article, 'en')).toBe('English');
  });

  it('prefers Japanese on /ja', () => {
    expect(resolveArticleTitle(article, 'ja')).toBe('日本語');
  });

  it('falls back to Japanese on /en when titleEn is empty', () => {
    expect(resolveArticleTitle({ title: '日本語', titleEn: '  ' }, 'en')).toBe(
      '日本語'
    );
  });

  it('falls back to English on /ja when title is empty', () => {
    expect(resolveArticleTitle({ title: '', titleEn: 'English' }, 'ja')).toBe(
      'English'
    );
  });

  it('returns empty string when both sides are empty', () => {
    expect(resolveArticleTitle({ title: '', titleEn: undefined }, 'en')).toBe(
      ''
    );
  });

  it('treats an unknown locale as non-English (Japanese-first)', () => {
    expect(
      resolveArticleTitle({ title: '日本語', titleEn: 'English' }, 'fr')
    ).toBe('日本語');
  });
});

describe('resolveArticleExcerpt', () => {
  it('returns undefined when both sides are empty', () => {
    expect(
      resolveArticleExcerpt({ excerpt: '', excerptEn: '' }, 'en')
    ).toBeUndefined();
  });

  it('falls back across locales', () => {
    expect(
      resolveArticleExcerpt({ excerpt: '要約', excerptEn: undefined }, 'en')
    ).toBe('要約');
  });
});

describe('resolveBlockForLocale', () => {
  it('heading: picks the locale content with fallback', () => {
    const block: HeadingBlock = {
      id: 'h',
      type: 'heading',
      level: 2,
      content: '見出し',
      contentEn: 'Heading',
    };
    expect((resolveBlockForLocale(block, 'en') as HeadingBlock).content).toBe(
      'Heading'
    );
    expect((resolveBlockForLocale(block, 'ja') as HeadingBlock).content).toBe(
      '見出し'
    );
  });

  it('list: uses itemsEn on /en, per-item fallback to Japanese', () => {
    const block: ListBlock = {
      id: 'l',
      type: 'list',
      listType: 'bullet',
      items: ['一', '二'],
      itemsEn: ['one', ''],
    };
    const en = resolveBlockForLocale(block, 'en') as ListBlock;
    expect(en.items).toEqual(['one', '二']);
  });

  it('list: returns Japanese items unchanged on /ja', () => {
    const block: ListBlock = {
      id: 'l',
      type: 'list',
      listType: 'numbered',
      items: ['一', '二'],
    };
    const ja = resolveBlockForLocale(block, 'ja') as ListBlock;
    expect(ja.items).toEqual(['一', '二']);
  });

  it('list: falls back per-item when itemsEn is shorter than items', () => {
    const block: ListBlock = {
      id: 'l',
      type: 'list',
      listType: 'bullet',
      items: ['一', '二', '三'],
      itemsEn: ['one'],
    };
    const en = resolveBlockForLocale(block, 'en') as ListBlock;
    expect(en.items).toEqual(['one', '二', '三']);
  });

  it('list: on /ja an empty Japanese item falls back to its English value', () => {
    const block: ListBlock = {
      id: 'l',
      type: 'list',
      listType: 'bullet',
      items: ['一', ''],
      itemsEn: ['one', 'two'],
    };
    const ja = resolveBlockForLocale(block, 'ja') as ListBlock;
    expect(ja.items).toEqual(['一', 'two']);
  });

  it('quote: resolves content and drops empty citation', () => {
    const block: QuoteBlock = {
      id: 'q',
      type: 'quote',
      content: '引用',
      contentEn: 'Quote',
      citation: '',
    };
    const en = resolveBlockForLocale(block, 'en') as QuoteBlock;
    expect(en.content).toBe('Quote');
    expect(en.citation).toBeUndefined();
  });

  it('callout: resolves title and content per locale', () => {
    const block: CalloutBlock = {
      id: 'c',
      type: 'callout',
      variant: 'info',
      title: 'タイトル',
      titleEn: 'Title',
      content: '内容',
      contentEn: 'Content',
    };
    const en = resolveBlockForLocale(block, 'en') as CalloutBlock;
    expect(en.title).toBe('Title');
    expect(en.content).toBe('Content');
  });

  it('image: resolves alt/caption with fallback', () => {
    const block: ImageBlock = {
      id: 'i',
      type: 'image',
      url: 'http://x/y.png',
      alt: '代替',
      altEn: 'Alt',
      caption: '',
    };
    const en = resolveBlockForLocale(block, 'en') as ImageBlock;
    expect(en.alt).toBe('Alt');
    expect(en.caption).toBeUndefined();
  });

  it('embed: resolves optional title', () => {
    const block: EmbedBlock = {
      id: 'e',
      type: 'embed',
      embedType: 'youtube',
      url: 'http://x',
      title: '動画',
      titleEn: 'Video',
    };
    expect((resolveBlockForLocale(block, 'en') as EmbedBlock).title).toBe(
      'Video'
    );
  });

  it('table: overlays English headers/rows per cell on /en', () => {
    const block: TableBlock = {
      id: 't',
      type: 'table',
      headers: ['列A', '列B'],
      rows: [['あ', 'い']],
      headersEn: ['Col A', ''],
      rowsEn: [['a', '']],
    };
    const en = resolveBlockForLocale(block, 'en') as TableBlock;
    expect(en.headers).toEqual(['Col A', '列B']);
    expect(en.rows).toEqual([['a', 'い']]);
  });

  it('table: tolerates a missing English row (jagged rowsEn) on /en', () => {
    const block: TableBlock = {
      id: 't',
      type: 'table',
      headers: ['A', 'B'],
      rows: [
        ['x', 'y'],
        ['z', 'w'],
      ],
      headersEn: ['EN-A', 'EN-B'],
      rowsEn: [['ex', 'why']], // only first row translated
    };
    const en = resolveBlockForLocale(block, 'en') as TableBlock;
    expect(en.rows).toEqual([
      ['ex', 'why'],
      ['z', 'w'],
    ]);
  });

  it('returns paragraph unchanged on /en when no English content exists', () => {
    const block: ParagraphBlock = {
      id: 'p',
      type: 'paragraph',
      content: '<p>本文</p>',
    };
    expect((resolveBlockForLocale(block, 'en') as ParagraphBlock).content).toBe(
      '<p>本文</p>'
    );
  });

  it('paragraph: swaps in sanitized English HTML on /en when contentEn is set', () => {
    const block: ParagraphBlock = {
      id: 'p',
      type: 'paragraph',
      content: '<p>本文</p>',
      contentEn: '<p>English body</p>',
    };
    const en = resolveBlockForLocale(block, 'en') as ParagraphBlock;
    expect(en.content).toContain('English body');
    expect(en.content).not.toContain('本文');
  });

  it('returns code and divider blocks unchanged (default branch)', () => {
    const code = {
      id: 'c',
      type: 'code' as const,
      language: 'ts',
      code: 'const x = 1;',
    };
    const divider = { id: 'd', type: 'divider' as const };
    expect(resolveBlockForLocale(code, 'en')).toEqual(code);
    expect(resolveBlockForLocale(divider, 'ja')).toEqual(divider);
  });
});
