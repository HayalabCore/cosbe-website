import {
  Prisma,
  type Article as DbArticle,
  type Author as DbAuthor,
} from '@prisma/client';
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

function authorToRef(a: DbAuthor): AuthorReference {
  return {
    id: a.id,
    name: a.name,
    designation: a.designation,
    avatarUrl: a.avatarUrl ?? undefined,
  };
}

function asSeo(v: unknown): ArticleSEO | undefined {
  if (v && typeof v === 'object') return v as ArticleSEO;
  return undefined;
}

// Full article row with author joined
type ArticleWithAuthor = DbArticle & { author: DbAuthor };

/**
 * Minimal projection for list views — omits heavy JSON columns (blocks, toc, seo)
 * that are not needed until an article is opened for reading or editing.
 */
const listItemSelect = {
  id: true,
  slug: true,
  title: true,
  titleEn: true,
  excerpt: true,
  excerptEn: true,
  featuredImage: true,
  category: true,
  tags: true,
  author: true,
  publishedAt: true,
  status: true,
} as const satisfies Prisma.ArticleSelect;

type ArticleListRow = Prisma.ArticleGetPayload<{
  select: typeof listItemSelect;
}>;

function mapRow(row: ArticleWithAuthor): Article {
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
    author: authorToRef(row.author),
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

function toListItem(row: ArticleListRow): ArticleListItem {
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
    author: authorToRef(row.author),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    status: row.status as ArticleStatus,
  };
}

export async function getArticleById(
  id: string,
  includeDrafts = false
): Promise<Article | null> {
  const row = await prisma.article.findUnique({
    where: { id },
    include: { author: true },
  });
  if (!row) return null;
  if (!includeDrafts && row.status !== 'published') return null;
  return mapRow(row);
}

export async function getArticleByIdAdmin(id: string): Promise<Article | null> {
  const row = await prisma.article.findUnique({
    where: { id },
    include: { author: true },
  });
  return row ? mapRow(row) : null;
}

export async function getArticleBySlug(
  slug: string,
  includeDrafts = false
): Promise<Article | null> {
  const row = await prisma.article.findUnique({
    where: { slug },
    include: { author: true },
  });
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
  page?: number;
  pageSize?: number;
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

  const pageSize = options.pageSize ?? options.limitCount;
  const skip =
    options.page && pageSize ? (options.page - 1) * pageSize : undefined;

  const rows = await prisma.article.findMany({
    where,
    select: listItemSelect,
    orderBy: { publishedAt: 'desc' },
    take: pageSize,
    skip,
  });

  return rows.map(toListItem);
}

export async function countArticles(
  options: Pick<GetArticlesOptions, 'category' | 'status' | 'tag'> = {},
  admin = false
): Promise<number> {
  const where: Prisma.ArticleWhereInput = {};

  if (!admin) {
    where.status = 'published';
  } else if (options.status) {
    where.status = options.status;
  }

  if (options.category) where.category = options.category;
  if (options.tag) where.tags = { has: options.tag };

  return prisma.article.count({ where });
}

export async function getRelatedArticles(
  articleId: string,
  relatedIds: string[]
): Promise<ArticleListItem[]> {
  if (!relatedIds.length) return [];

  const ids = relatedIds.slice(0, 6).filter((id) => id !== articleId);
  if (!ids.length) return [];

  const rows = await prisma.article.findMany({
    where: { id: { in: ids }, status: 'published' },
    select: listItemSelect,
  });

  // Re-order results to match the caller's specified order
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [toListItem(row)] : [];
  });
}

export async function getAuthors(): Promise<DbAuthor[]> {
  return prisma.author.findMany({ orderBy: { name: 'asc' } });
}

export async function upsertAuthor(
  name: string,
  designation: string
): Promise<string> {
  const existing = await prisma.author.findFirst({
    where: { name, designation },
  });
  if (existing) return existing.id;
  const created = await prisma.author.create({ data: { name, designation } });
  return created.id;
}

export async function createArticleRecord(
  data: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const toc = generateTOC(data.blocks);
  // Upsert the author so inline name/designation changes persist
  const authorId = await upsertAuthor(
    data.author.name,
    data.author.designation
  );

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
      authorId,
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
  if (data.author !== undefined) {
    // Upsert the author and update the FK relation
    const authorId = await upsertAuthor(
      data.author.name,
      data.author.designation
    );
    patch.author = { connect: { id: authorId } };
  }
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

export async function archiveArticleRecord(id: string): Promise<void> {
  await prisma.article.update({
    where: { id },
    data: { status: 'archived' },
  });
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

export async function logArticleView(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.articleView.create({ data: { articleId: id } }),
    prisma.article.updateMany({
      where: { id, status: 'published' },
      data: { viewCount: { increment: 1 } },
    }),
  ]);
}
