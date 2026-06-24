import { describe, expect, it } from 'vitest';

import { articleCreateApiMetadata } from '@/lib/api/article-create-metadata';
import {
  createArticleSchema,
  toCreateArticlePayload,
  updateArticleSchema,
  zodErrorDetails,
} from '@/lib/validation/article';

/** Minimal valid create payload, reused and mutated per-case. */
function validBody() {
  return {
    slug: 'my-article',
    title: 'タイトル',
    status: 'draft',
    category: 'useful-info',
    tags: ['tag1'],
    author: { name: 'Author', designation: 'Role' },
    blocks: [{ id: 'blk-1', type: 'paragraph', content: '<p>本文</p>' }],
  };
}

/**
 * Mirrors the shape `PostEditor.buildPayload` sends to the admin server actions,
 * including editor-only fields (author.id, populated toc, caseStudy) and a
 * `table` block — proving the schema (now guarding those actions) accepts real
 * editor output and won't reject live saves.
 */
function fullEditorPayload() {
  return {
    slug: 'case-1',
    title: '事例タイトル',
    titleEn: 'Case Title',
    excerpt: '概要',
    excerptEn: 'Summary',
    featuredImage: '',
    status: 'published',
    category: 'case-study',
    tags: ['ai', 'llm'],
    author: { id: 'author-uuid', name: 'Author', designation: 'Role' },
    blocks: [
      { id: 'h1', type: 'heading', level: 2, content: '見出し' },
      { id: 'p1', type: 'paragraph', content: '<p>本文</p>' },
      {
        id: 't1',
        type: 'table',
        headers: ['A', 'B'],
        rows: [['1', '2']],
      },
    ],
    toc: [{ id: 'h1', level: 2, text: '見出し' }],
    seo: { metaTitle: 'SEO' },
    relatedArticleIds: [],
    publishedAt: new Date().toISOString(),
    viewCount: 0,
    caseStudy: {
      clientName: 'Acme',
      clientLocation: 'Tokyo',
      aiModels: ['LLM'],
      mainChallenges: 'Scaling',
    },
  };
}

describe('createArticleSchema', () => {
  it('accepts a minimal valid body', () => {
    expect(createArticleSchema.safeParse(validBody()).success).toBe(true);
  });

  it('accepts the documented API example', () => {
    const result = createArticleSchema.safeParse(
      articleCreateApiMetadata.example
    );
    expect(result.success).toBe(true);
  });

  it('accepts a full admin-editor payload (table block, caseStudy, toc)', () => {
    const result = createArticleSchema.safeParse(fullEditorPayload());
    expect(result.success).toBe(true);
  });

  it('rejects a non-object body', () => {
    expect(createArticleSchema.safeParse(null).success).toBe(false);
    expect(createArticleSchema.safeParse('nope').success).toBe(false);
  });

  it('rejects a missing/blank title', () => {
    const body = { ...validBody(), title: '   ' };
    expect(createArticleSchema.safeParse(body).success).toBe(false);
  });

  it('rejects an invalid status (e.g. archived on create)', () => {
    const body = { ...validBody(), status: 'archived' };
    expect(createArticleSchema.safeParse(body).success).toBe(false);
  });

  it('rejects an unknown category', () => {
    const body = { ...validBody(), category: 'blog' };
    expect(createArticleSchema.safeParse(body).success).toBe(false);
  });

  it('rejects non-string tags', () => {
    const body = { ...validBody(), tags: ['ok', 5] };
    expect(createArticleSchema.safeParse(body).success).toBe(false);
  });

  it('rejects an author missing name/designation', () => {
    const body = { ...validBody(), author: { name: 'Only Name' } };
    expect(createArticleSchema.safeParse(body).success).toBe(false);
  });

  it('rejects a block missing id or type', () => {
    const body = { ...validBody(), blocks: [{ type: 'paragraph' }] };
    expect(createArticleSchema.safeParse(body).success).toBe(false);
  });

  it('rejects an unparseable publishedAt', () => {
    const body = { ...validBody(), publishedAt: 'not-a-date' };
    expect(createArticleSchema.safeParse(body).success).toBe(false);
  });

  it('accepts null publishedAt', () => {
    const body = { ...validBody(), publishedAt: null };
    expect(createArticleSchema.safeParse(body).success).toBe(true);
  });

  it('rejects a negative viewCount', () => {
    const body = { ...validBody(), viewCount: -1 };
    expect(createArticleSchema.safeParse(body).success).toBe(false);
  });

  it('rejects a non-integer viewCount', () => {
    const body = { ...validBody(), viewCount: 1.5 };
    expect(createArticleSchema.safeParse(body).success).toBe(false);
  });

  it('rejects an empty object (all required fields missing)', () => {
    const result = createArticleSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects a whitespace-only slug', () => {
    expect(
      createArticleSchema.safeParse({ ...validBody(), slug: '   ' }).success
    ).toBe(false);
  });

  it('rejects a body with no tags field (tags are required)', () => {
    const body = validBody() as Partial<ReturnType<typeof validBody>>;
    delete body.tags;
    expect(createArticleSchema.safeParse(body).success).toBe(false);
  });

  it('rejects non-string relatedArticleIds', () => {
    const body = { ...validBody(), relatedArticleIds: ['ok', 7] };
    expect(createArticleSchema.safeParse(body).success).toBe(false);
  });

  it('accepts an empty tags array', () => {
    expect(
      createArticleSchema.safeParse({ ...validBody(), tags: [] }).success
    ).toBe(true);
  });

  it('accepts an empty blocks array (parity with the original contract)', () => {
    expect(
      createArticleSchema.safeParse({ ...validBody(), blocks: [] }).success
    ).toBe(true);
  });

  it('accepts seo: null', () => {
    expect(
      createArticleSchema.safeParse({ ...validBody(), seo: null }).success
    ).toBe(true);
  });
});

describe('createArticleSchema — data integrity & injection', () => {
  it('strips unknown top-level keys (no mass-assignment into the payload)', () => {
    const parsed = createArticleSchema.parse({
      ...validBody(),
      id: 'attacker-supplied',
      viewCount: 9999,
      createdAt: '2000-01-01T00:00:00.000Z',
      isAdmin: true,
    });
    expect('id' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
    expect('isAdmin' in parsed).toBe(false);
  });

  it('preserves block-specific fields through loose validation', () => {
    const parsed = createArticleSchema.parse({
      ...validBody(),
      blocks: [
        { id: 'h', type: 'heading', level: 3, content: '見出し' },
        { id: 't', type: 'table', headers: ['A'], rows: [['1']] },
      ],
    });
    const heading = parsed.blocks[0] as Record<string, unknown>;
    const table = parsed.blocks[1] as Record<string, unknown>;
    expect(heading.level).toBe(3);
    expect(heading.content).toBe('見出し');
    expect(table.headers).toEqual(['A']);
    expect(table.rows).toEqual([['1']]);
  });
});

describe('updateArticleSchema', () => {
  it('accepts an empty patch (all fields optional)', () => {
    expect(updateArticleSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a partial patch', () => {
    expect(updateArticleSchema.safeParse({ title: 'New' }).success).toBe(true);
  });

  it('allows archived as a status', () => {
    expect(updateArticleSchema.safeParse({ status: 'archived' }).success).toBe(
      true
    );
  });

  it('accepts a full editor payload', () => {
    expect(updateArticleSchema.safeParse(fullEditorPayload()).success).toBe(
      true
    );
  });

  it('still rejects an invalid field in a patch', () => {
    expect(updateArticleSchema.safeParse({ status: 'bogus' }).success).toBe(
      false
    );
  });
});

describe('zodErrorDetails', () => {
  it('returns dotted-path messages for each issue', () => {
    const result = createArticleSchema.safeParse({ ...validBody(), title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const details = zodErrorDetails(result.error);
      expect(details.length).toBeGreaterThan(0);
      expect(details.some((d) => d.startsWith('title'))).toBe(true);
    }
  });
});

describe('toCreateArticlePayload', () => {
  it('drops client toc, defaults author id, and normalizes empties', () => {
    const parsed = createArticleSchema.parse({
      ...validBody(),
      titleEn: '   ',
      featuredImage: '   ',
      toc: [{ id: 'x', level: 2, text: 'ignored' }],
    });
    const payload = toCreateArticlePayload(parsed);

    expect(payload.toc).toEqual([]);
    expect(payload.author.id).toBe('');
    expect(payload.titleEn).toBeUndefined();
    expect(payload.featuredImage).toBeUndefined();
    expect(payload.publishedAt).toBeNull();
  });

  it('preserves provided values', () => {
    const parsed = createArticleSchema.parse({
      ...validBody(),
      titleEn: 'English',
      tags: ['a', 'b'],
    });
    const payload = toCreateArticlePayload(parsed);

    expect(payload.titleEn).toBe('English');
    expect(payload.tags).toEqual(['a', 'b']);
    expect(payload.slug).toBe('my-article');
  });
});
