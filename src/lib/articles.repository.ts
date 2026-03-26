import { Prisma, type Article as DbArticle } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { generateTOC } from '@/lib/article-utils';
import type {
  Article,
  ArticleListItem,
  ContentBlock,
  TOCItem,
  ContentCategory,
  ArticleStatus,
  AuthorReference,
  ArticleSEO,
} from '@/types';

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function asBlocks(v: unknown): ContentBlock[] {
  return Array.isArray(v) ? (v as ContentBlock[]) : [];
}

function asToc(v: unknown): TOCItem[] {
  return Array.isArray(v) ? (v as TOCItem[]) : [];
}

function asAuthor(v: unknown): AuthorReference {
  if (v && typeof v === 'object' && 'id' in v && 'name' in v) {
    return v as AuthorReference;
  }
  return { id: 'unknown', name: 'Unknown', designation: '' };
}

function asSeo(v: unknown): ArticleSEO | undefined {
  if (v && typeof v === 'object') return v as ArticleSEO;
  return undefined;
}

function mapRow(row: DbArticle): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleEn: row.titleEn ?? undefined,
    excerpt: row.excerpt ?? undefined,
    excerptEn: row.excerptEn ?? undefined,
    featuredImage: row.featuredImage ?? undefined,
    status: row.status as ArticleStatus,
    category: row.category as ContentCategory,
    tags: row.tags ?? [],
    author: asAuthor(row.author),
    blocks: asBlocks(row.blocks),
    toc: asToc(row.toc),
    seo: asSeo(row.seo),
    relatedArticleIds: row.relatedArticleIds?.length
      ? row.relatedArticleIds
      : undefined,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    viewCount: row.viewCount,
  };
}

function toListItem(row: DbArticle): ArticleListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleEn: row.titleEn ?? undefined,
    excerpt: row.excerpt ?? undefined,
    excerptEn: row.excerptEn ?? undefined,
    featuredImage: row.featuredImage ?? undefined,
    category: row.category as ContentCategory,
    tags: row.tags ?? [],
    author: asAuthor(row.author),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    status: row.status as ArticleStatus,
  };
}

export async function getArticleById(
  id: string,
  includeDrafts = false
): Promise<Article | null> {
  const row = await prisma.article.findUnique({ where: { id } });
  if (!row) return null;
  if (!includeDrafts && row.status !== 'published') return null;
  return mapRow(row);
}

export async function getArticleByIdAdmin(id: string): Promise<Article | null> {
  const row = await prisma.article.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function getArticleBySlug(
  slug: string,
  includeDrafts = false
): Promise<Article | null> {
  const row = await prisma.article.findUnique({ where: { slug } });
  if (!row) return null;
  if (!includeDrafts && row.status !== 'published') return null;
  return mapRow(row);
}

export interface GetArticlesOptions {
  category?: ContentCategory;
  status?: ArticleStatus;
  tag?: string;
  limitCount?: number;
  excludeId?: string;
}

export async function getArticles(
  options: GetArticlesOptions = {},
  admin = false
): Promise<ArticleListItem[]> {
  const where: Prisma.ArticleWhereInput = {};

  if (options.excludeId) {
    where.NOT = { id: options.excludeId };
  }

  if (!admin) {
    where.status = 'published';
  } else if (options.status) {
    where.status = options.status;
  }

  if (options.category) {
    where.category = options.category;
  }

  if (options.tag) {
    where.tags = { has: options.tag };
  }

  const rows = await prisma.article.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: options.limitCount ?? undefined,
  });

  return rows.map(toListItem);
}

export async function getRelatedArticles(
  articleId: string,
  relatedIds: string[]
): Promise<ArticleListItem[]> {
  if (!relatedIds.length) return [];

  const out: ArticleListItem[] = [];
  for (const id of relatedIds.slice(0, 6)) {
    if (id === articleId) continue;
    const row = await prisma.article.findUnique({ where: { id } });
    if (row?.status === 'published') {
      out.push(toListItem(row));
    }
  }
  return out;
}

export async function createArticleRecord(
  data: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const toc = generateTOC(data.blocks);
  const row = await prisma.article.create({
    data: {
      slug: data.slug,
      title: data.title,
      titleEn: data.titleEn ?? null,
      excerpt: data.excerpt ?? null,
      excerptEn: data.excerptEn ?? null,
      featuredImage: data.featuredImage ?? null,
      status: data.status,
      category: data.category,
      tags: data.tags ?? [],
      author: toJson(data.author),
      blocks: toJson(data.blocks),
      toc: toJson(toc),
      seo: data.seo != null ? toJson(data.seo) : Prisma.JsonNull,
      relatedArticleIds: data.relatedArticleIds ?? [],
      viewCount: data.viewCount ?? 0,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    },
  });
  return row.id;
}

export async function updateArticleRecord(
  id: string,
  data: Partial<Omit<Article, 'id' | 'createdAt'>>
): Promise<void> {
  const patch: Prisma.ArticleUpdateInput = {};

  if (data.slug !== undefined) patch.slug = data.slug;
  if (data.title !== undefined) patch.title = data.title;
  if (data.titleEn !== undefined) patch.titleEn = data.titleEn ?? null;
  if (data.excerpt !== undefined) patch.excerpt = data.excerpt ?? null;
  if (data.excerptEn !== undefined) patch.excerptEn = data.excerptEn ?? null;
  if (data.featuredImage !== undefined)
    patch.featuredImage = data.featuredImage ?? null;
  if (data.status !== undefined) patch.status = data.status;
  if (data.category !== undefined) patch.category = data.category;
  if (data.tags !== undefined) patch.tags = data.tags;
  if (data.author !== undefined) patch.author = toJson(data.author);
  if (data.blocks !== undefined) {
    patch.blocks = toJson(data.blocks);
    patch.toc = toJson(generateTOC(data.blocks));
  }
  if (data.toc !== undefined) patch.toc = toJson(data.toc);
  if (data.seo !== undefined) {
    patch.seo = data.seo != null ? toJson(data.seo) : Prisma.JsonNull;
  }
  if (data.relatedArticleIds !== undefined)
    patch.relatedArticleIds = data.relatedArticleIds ?? [];
  if (data.viewCount !== undefined) patch.viewCount = data.viewCount;
  if (data.publishedAt !== undefined) {
    patch.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
  }

  await prisma.article.update({ where: { id }, data: patch });
}

export async function deleteArticleRecord(id: string): Promise<void> {
  await prisma.article.delete({ where: { id } });
}

export async function publishArticleRecord(id: string): Promise<void> {
  await updateArticleRecord(id, {
    status: 'published',
    publishedAt: new Date().toISOString(),
  });
}

export async function unpublishArticleRecord(id: string): Promise<void> {
  await updateArticleRecord(id, {
    status: 'draft',
    publishedAt: null,
  });
}

export async function incrementViewCount(id: string): Promise<void> {
  await prisma.article.updateMany({
    where: { id, status: 'published' },
    data: { viewCount: { increment: 1 } },
  });
}
