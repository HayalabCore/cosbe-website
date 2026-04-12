import { timingSafeEqual } from 'node:crypto';

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { revalidateArticlePaths } from '@/lib/article-revalidation';
import { createArticleRecord } from '@/lib/articles';
import {
  ARTICLE_CREATE_CATEGORIES,
  ARTICLE_CREATE_STATUSES,
} from '@/lib/api/article-create-metadata';
import type {
  Article,
  ArticleSEO,
  ArticleStatus,
  ContentBlock,
  ContentCategory,
} from '@/types';

type CreateArticlePayload = Omit<Article, 'id' | 'createdAt' | 'updatedAt'>;

const ARTICLE_STATUSES = new Set<ArticleStatus>(ARTICLE_CREATE_STATUSES);

const CONTENT_CATEGORIES = new Set<ContentCategory>(ARTICLE_CREATE_CATEGORIES);

function parseBearerToken(header: string | null): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const t = header.slice(7).trim();
  return t.length ? t : null;
}

function apiKeyMatches(token: string, secret: string): boolean {
  if (token.length !== secret.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(token, 'utf8'),
      Buffer.from(secret, 'utf8')
    );
  } catch {
    return false;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function parseCreateArticleBody(raw: unknown):
  | {
      ok: true;
      data: CreateArticlePayload;
    }
  | {
      ok: false;
      details: string[];
    } {
  const details: string[] = [];

  if (!isRecord(raw)) {
    return { ok: false, details: ['Body must be a JSON object'] };
  }

  const slug = raw.slug;
  if (typeof slug !== 'string' || !slug.trim()) {
    details.push('slug must be a non-empty string');
  }

  const title = raw.title;
  if (typeof title !== 'string' || !title.trim()) {
    details.push('title must be a non-empty string');
  }

  const status = raw.status;
  if (
    typeof status !== 'string' ||
    !ARTICLE_STATUSES.has(status as ArticleStatus)
  ) {
    details.push('status must be one of: draft, published');
  }

  const category = raw.category;
  if (
    typeof category !== 'string' ||
    !CONTENT_CATEGORIES.has(category as ContentCategory)
  ) {
    details.push(
      'category must be one of: useful-info, case-study, video, notice'
    );
  }

  let tags: string[] = [];
  if (!Array.isArray(raw.tags)) {
    details.push('tags must be an array of strings');
  } else {
    const bad = raw.tags.some((t) => typeof t !== 'string');
    if (bad) details.push('tags must be an array of strings');
    else tags = raw.tags as string[];
  }

  const author = raw.author;
  let authorName = '';
  let authorDesignation = '';
  if (!isRecord(author)) {
    details.push('author must be an object with name and designation');
  } else {
    if (typeof author.name !== 'string' || !author.name.trim()) {
      details.push('author.name must be a non-empty string');
    } else {
      authorName = author.name.trim();
    }
    if (typeof author.designation !== 'string' || !author.designation.trim()) {
      details.push('author.designation must be a non-empty string');
    } else {
      authorDesignation = author.designation.trim();
    }
  }

  let blocks: ContentBlock[] = [];
  if (!Array.isArray(raw.blocks)) {
    details.push('blocks must be an array');
  } else {
    const blockIssues = raw.blocks.map((b, i) => {
      if (!isRecord(b)) return `blocks[${i}] must be an object`;
      if (typeof b.id !== 'string' || !b.id)
        return `blocks[${i}].id is required`;
      if (typeof b.type !== 'string' || !b.type) {
        return `blocks[${i}].type is required`;
      }
      return null;
    });
    for (const issue of blockIssues) {
      if (issue) details.push(issue);
    }
    if (!details.some((d) => d.startsWith('blocks['))) {
      blocks = raw.blocks as ContentBlock[];
    }
  }

  let publishedAt: string | null = null;
  if (raw.publishedAt !== undefined && raw.publishedAt !== null) {
    if (typeof raw.publishedAt !== 'string') {
      details.push('publishedAt must be an ISO date string or null');
    } else {
      const d = new Date(raw.publishedAt);
      if (Number.isNaN(d.getTime())) {
        details.push('publishedAt must be a valid ISO date string');
      } else {
        publishedAt = raw.publishedAt;
      }
    }
  }

  let titleEn: string | undefined;
  if (raw.titleEn !== undefined) {
    if (typeof raw.titleEn !== 'string') {
      details.push('titleEn must be a string when provided');
    } else {
      titleEn = raw.titleEn.trim() || undefined;
    }
  }

  let excerpt: string | undefined;
  if (raw.excerpt !== undefined) {
    if (typeof raw.excerpt !== 'string') {
      details.push('excerpt must be a string when provided');
    } else {
      excerpt = raw.excerpt.trim() || undefined;
    }
  }

  let excerptEn: string | undefined;
  if (raw.excerptEn !== undefined) {
    if (typeof raw.excerptEn !== 'string') {
      details.push('excerptEn must be a string when provided');
    } else {
      excerptEn = raw.excerptEn.trim() || undefined;
    }
  }

  let featuredImage: string | undefined;
  if (raw.featuredImage !== undefined) {
    if (typeof raw.featuredImage !== 'string') {
      details.push('featuredImage must be a string when provided');
    } else {
      featuredImage = raw.featuredImage.trim() || undefined;
    }
  }

  let seo: ArticleSEO | undefined;
  if (raw.seo !== undefined) {
    if (raw.seo === null) {
      seo = undefined;
    } else if (!isRecord(raw.seo)) {
      details.push('seo must be an object when provided');
    } else {
      seo = raw.seo as ArticleSEO;
    }
  }

  let relatedArticleIds: string[] | undefined;
  if (raw.relatedArticleIds !== undefined) {
    if (!Array.isArray(raw.relatedArticleIds)) {
      details.push(
        'relatedArticleIds must be an array of strings when provided'
      );
    } else if (raw.relatedArticleIds.some((id) => typeof id !== 'string')) {
      details.push('relatedArticleIds must be an array of strings');
    } else {
      relatedArticleIds = raw.relatedArticleIds as string[];
    }
  }

  let viewCount: number | undefined;
  if (raw.viewCount !== undefined) {
    if (
      typeof raw.viewCount !== 'number' ||
      !Number.isInteger(raw.viewCount) ||
      raw.viewCount < 0
    ) {
      details.push('viewCount must be a non-negative integer when provided');
    } else {
      viewCount = raw.viewCount;
    }
  }

  if (details.length) {
    return { ok: false, details };
  }

  const data: CreateArticlePayload = {
    slug: (slug as string).trim(),
    title: (title as string).trim(),
    titleEn,
    excerpt,
    excerptEn,
    featuredImage,
    status: status as ArticleStatus,
    category: category as ContentCategory,
    tags,
    author: {
      id: '',
      name: authorName,
      designation: authorDesignation,
    },
    blocks,
    toc: [],
    seo,
    relatedArticleIds,
    publishedAt,
    viewCount,
  };

  return { ok: true, data };
}

export async function POST(request: Request) {
  const secret = process.env.API_SECRET_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: 'Service unavailable', details: ['API is not configured'] },
      { status: 503 }
    );
  }

  const token = parseBearerToken(request.headers.get('authorization'));
  if (!token || !apiKeyMatches(token, secret)) {
    return NextResponse.json(
      { error: 'Unauthorized', details: ['Invalid or missing API key'] },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Bad Request', details: ['Body must be valid JSON'] },
      { status: 400 }
    );
  }

  const parsed = parseCreateArticleBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'Bad Request', details: parsed.details },
      { status: 400 }
    );
  }

  try {
    const id = await createArticleRecord(parsed.data);
    revalidateArticlePaths(parsed.data.slug, parsed.data.category);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return NextResponse.json(
        {
          error: 'Conflict',
          details: ['An article with this slug already exists'],
        },
        { status: 409 }
      );
    }
    console.error('[POST /api/articles]', e);
    return NextResponse.json(
      { error: 'Internal Server Error', details: ['Failed to create article'] },
      { status: 500 }
    );
  }
}
