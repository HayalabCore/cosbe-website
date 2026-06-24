import { z } from 'zod';

import {
  ARTICLE_CREATE_CATEGORIES,
  ARTICLE_CREATE_STATUSES,
} from '@/lib/api/article-create-metadata';
import type { ArticleSEO, CaseStudyMeta, ContentBlock } from '@/types';

type CreateArticlePayload = Omit<
  import('@/types').Article,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Accepts any string that `new Date()` can parse — matches the looseness of the
 * previous hand-rolled validator rather than requiring strict ISO 8601.
 */
const dateString = z
  .string()
  .refine((s) => !Number.isNaN(new Date(s).getTime()), {
    message: 'must be a valid date string',
  });

/**
 * Blocks are validated loosely: every block must carry a non-empty `id` and
 * `type`; all other fields pass through untouched. This intentionally mirrors
 * the original API contract and, crucially, does NOT restrict `type` to a fixed
 * enum (the admin editor emits `table` blocks that the public BLOCK_TYPES list
 * omits — an enum here would reject real editor saves).
 */
const blockSchema = z.looseObject({
  id: z.string().min(1),
  type: z.string().min(1),
});

const authorSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  designation: z.string().trim().min(1),
});

const caseStudySchema = z.looseObject({
  clientName: z.string().optional(),
  clientLocation: z.string().optional(),
  clientUrl: z.string().optional(),
  aiModels: z.array(z.string()).optional(),
  mainChallenges: z.string().optional(),
});

const seoSchema = z.looseObject({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

/** Fields shared by create + update payloads (status differs between them). */
const articleEnvelope = {
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  titleEn: z.string().optional(),
  excerpt: z.string().optional(),
  excerptEn: z.string().optional(),
  featuredImage: z.string().optional(),
  category: z.enum(ARTICLE_CREATE_CATEGORIES),
  tags: z.array(z.string()),
  author: authorSchema,
  blocks: z.array(blockSchema),
  // TOC is regenerated server-side; accept whatever is sent without inspecting it.
  toc: z.array(z.any()).optional(),
  seo: seoSchema.nullish(),
  relatedArticleIds: z.array(z.string()).optional(),
  publishedAt: dateString.nullish(),
  viewCount: z.number().int().nonnegative().optional(),
  caseStudy: caseStudySchema.optional(),
};

/** Full payload for creating an article (public API + admin create action). */
export const createArticleSchema = z.object({
  ...articleEnvelope,
  status: z.enum(ARTICLE_CREATE_STATUSES),
});

/**
 * Partial payload for updating an article. Every field is optional (the editor
 * may patch any subset), and `archived` is an allowed status here even though it
 * is not a valid *create* status.
 */
export const updateArticleSchema = z
  .object({
    ...articleEnvelope,
    status: z.enum(['draft', 'published', 'archived']),
  })
  .partial();

export type CreateArticleInput = z.infer<typeof createArticleSchema>;

/** Flattens a ZodError into the `details: string[]` shape the API returns. */
export function zodErrorDetails(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

/**
 * Normalizes validated input into the repository's create payload: trims the
 * optional string fields (empty → undefined), drops the client-supplied TOC
 * (regenerated server-side), and defaults the author id.
 */
export function toCreateArticlePayload(
  input: CreateArticleInput
): CreateArticlePayload {
  return {
    slug: input.slug,
    title: input.title,
    titleEn: input.titleEn?.trim() || undefined,
    excerpt: input.excerpt?.trim() || undefined,
    excerptEn: input.excerptEn?.trim() || undefined,
    featuredImage: input.featuredImage?.trim() || undefined,
    status: input.status,
    category: input.category,
    tags: input.tags,
    author: {
      id: '',
      name: input.author.name.trim(),
      designation: input.author.designation.trim(),
    },
    blocks: input.blocks as ContentBlock[],
    toc: [],
    seo: (input.seo as ArticleSEO | null | undefined) ?? undefined,
    relatedArticleIds: input.relatedArticleIds,
    publishedAt: input.publishedAt ?? null,
    viewCount: input.viewCount,
    caseStudy: input.caseStudy as CaseStudyMeta | undefined,
  };
}
