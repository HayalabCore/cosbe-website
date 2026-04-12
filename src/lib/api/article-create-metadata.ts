/**
 * Machine-readable documentation for POST /api/articles.
 * Served by GET /api/articles/metadata and GET /api/metadata.
 */

export const ARTICLE_CREATE_STATUSES = ['draft', 'published'] as const;

export const ARTICLE_CREATE_CATEGORIES = [
  'useful-info',
  'case-study',
  'video',
  'notice',
] as const;

export const BLOCK_TYPES = [
  'heading',
  'paragraph',
  'list',
  'quote',
  'callout',
  'image',
  'code',
  'divider',
  'embed',
] as const;

export const articleCreateApiMetadata = {
  title: 'Article creation API',
  version: '1',
  description:
    'Create CMS articles with the same payload shape as the admin editor. Table of contents is regenerated server-side from `blocks`; you may send `toc: []`.',

  endpoints: {
    createArticle: {
      method: 'POST',
      path: '/api/articles',
      authentication:
        'Send header `Authorization: Bearer <API_SECRET_KEY>` where `API_SECRET_KEY` is set in the server environment.',
      headers: {
        Authorization: 'Bearer <API_SECRET_KEY>',
        'Content-Type': 'application/json',
      },
      responses: {
        '201': { body: { id: 'string (UUID of the new article)' } },
        '400': { body: { error: 'Bad Request', details: 'string[]' } },
        '401': { body: { error: 'Unauthorized', details: 'string[]' } },
        '409': {
          body: {
            error: 'Conflict',
            details: ['An article with this slug already exists'],
          },
        },
        '500': {
          body: { error: 'Internal Server Error', details: 'string[]' },
        },
        '503': {
          body: {
            error: 'Service unavailable',
            details: ['API is not configured'],
          },
        },
      },
    },
    schema: {
      method: 'GET',
      path: '/api/articles/metadata',
      authentication: 'None (public documentation).',
    },
  },

  requestBody: {
    typescript:
      'Omit<Article, "id" | "createdAt" | "updatedAt"> from src/types/index.ts',
    requiredFields: [
      'slug',
      'title',
      'status',
      'category',
      'tags',
      'author',
      'blocks',
    ],
    optionalFields: [
      'titleEn',
      'excerpt',
      'excerptEn',
      'featuredImage',
      'toc',
      'seo',
      'relatedArticleIds',
      'publishedAt',
      'viewCount',
    ],
    fields: {
      slug: {
        type: 'string',
        required: true,
        description: 'URL segment; must be unique across articles.',
      },
      title: {
        type: 'string',
        required: true,
        description: 'Primary (Japanese) title.',
      },
      titleEn: {
        type: 'string',
        required: false,
        description: 'English title; omit or empty for Japanese-only.',
      },
      excerpt: { type: 'string', required: false },
      excerptEn: { type: 'string', required: false },
      featuredImage: {
        type: 'string',
        required: false,
        description: 'URL to hero/featured image.',
      },
      status: {
        type: 'string',
        required: true,
        enum: [...ARTICLE_CREATE_STATUSES],
      },
      category: {
        type: 'string',
        required: true,
        enum: [...ARTICLE_CREATE_CATEGORIES],
        notes: {
          'useful-info': 'Lists under /useful-column',
          'case-study': 'Lists under /case-studies',
          video: 'Lists under /useful-video',
          notice: 'Lists under /notice',
        },
      },
      tags: { type: 'string[]', required: true },
      author: {
        type: 'object',
        required: true,
        properties: {
          id: {
            type: 'string',
            required: false,
            description:
              'Optional; server resolves author by name + designation. Defaults internally if omitted.',
          },
          name: { type: 'string', required: true },
          designation: { type: 'string', required: true },
        },
      },
      blocks: {
        type: 'ContentBlock[]',
        required: true,
        description:
          'Rich content. API checks each item has non-empty `id` and `type`; use full shapes below.',
      },
      toc: {
        type: 'TOCItem[]',
        required: false,
        description:
          'Ignored — server always regenerates TOC from `blocks`. May be omitted or sent as `[]`.',
      },
      seo: {
        type: 'ArticleSEO | null',
        required: false,
        properties: {
          metaTitle: { type: 'string', required: false },
          metaDescription: { type: 'string', required: false },
          ogImage: { type: 'string', required: false },
          keywords: { type: 'string[]', required: false },
        },
      },
      relatedArticleIds: { type: 'string[]', required: false },
      publishedAt: {
        type: 'string | null',
        required: false,
        description:
          'ISO 8601 datetime string, or `null` for unpublished / no date. Omit for `null` when not using a publish date.',
      },
      viewCount: {
        type: 'integer',
        required: false,
        description: 'Usually omit (defaults to 0).',
      },
    },
  },

  contentBlocks: {
    description:
      'Union type `ContentBlock`: every block includes `id: string` and `type` in BLOCK_TYPES.',
    blockTypes: {
      heading: {
        type: 'heading',
        fields: {
          level: { enum: [1, 2, 3, 4] },
          content: { type: 'string' },
          contentEn: { type: 'string', optional: true },
        },
      },
      paragraph: {
        type: 'paragraph',
        fields: {
          content: { type: 'string' },
          contentEn: { type: 'string', optional: true },
        },
      },
      list: {
        type: 'list',
        fields: {
          listType: { enum: ['bullet', 'numbered'] },
          items: { type: 'string[]' },
          itemsEn: { type: 'string[]', optional: true },
        },
      },
      quote: {
        type: 'quote',
        fields: {
          content: { type: 'string' },
          citation: { type: 'string', optional: true },
          contentEn: { type: 'string', optional: true },
          citationEn: { type: 'string', optional: true },
        },
      },
      callout: {
        type: 'callout',
        fields: {
          variant: { enum: ['info', 'warning', 'tip', 'related'] },
          title: { type: 'string', optional: true },
          content: { type: 'string' },
          linkedArticleId: { type: 'string', optional: true },
          titleEn: { type: 'string', optional: true },
          contentEn: { type: 'string', optional: true },
        },
      },
      image: {
        type: 'image',
        fields: {
          url: { type: 'string' },
          alt: { type: 'string' },
          caption: { type: 'string', optional: true },
          altEn: { type: 'string', optional: true },
          captionEn: { type: 'string', optional: true },
        },
      },
      code: {
        type: 'code',
        fields: {
          language: { type: 'string' },
          code: { type: 'string' },
        },
      },
      divider: { type: 'divider', fields: {} },
      embed: {
        type: 'embed',
        fields: {
          embedType: { enum: ['youtube', 'twitter', 'link'] },
          url: { type: 'string' },
          title: { type: 'string', optional: true },
          titleEn: { type: 'string', optional: true },
        },
      },
    },
  },

  example: {
    slug: 'my-new-article',
    title: 'タイトル',
    titleEn: 'Title',
    excerpt: '概要',
    status: 'draft',
    category: 'useful-info',
    tags: ['tag1'],
    author: { name: 'Author Name', designation: 'Role' },
    blocks: [
      {
        id: 'blk-1',
        type: 'heading',
        level: 2,
        content: '見出し',
      },
      {
        id: 'blk-2',
        type: 'paragraph',
        content: '<p>本文</p>',
      },
    ],
    toc: [],
    publishedAt: null,
  },
} as const;
