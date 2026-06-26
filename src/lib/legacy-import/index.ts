import { prisma } from '@/lib/prisma';
import type { ContentCategory } from '@/types';
import { fetchLegacyHtml, loadLegacyHtml } from './fetch';
import {
  extractCaseStudy,
  extractNotice,
  extractUsefulInfo,
  extractVideo,
} from './extractors';
import {
  LEGACY_HOST,
  PATH_SEGMENT_TO_CATEGORY,
  UnsupportedCategoryError,
  type ImportPreviewPayload,
} from './types';

function parseLegacyUrl(url: string): {
  segment: string;
  category: ContentCategory;
} {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error('Invalid URL');
  }
  if (parsed.hostname !== LEGACY_HOST) {
    throw new Error(`URL must be on https://${LEGACY_HOST}/`);
  }
  const segment = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
  const category = PATH_SEGMENT_TO_CATEGORY[segment];
  if (!category) throw new UnsupportedCategoryError(segment);
  return { segment, category };
}

export async function isImportSlugAvailable(slug: string): Promise<boolean> {
  const trimmed = slug.trim();
  if (!trimmed) return false;
  const existing = await prisma.article.findUnique({
    where: { slug: trimmed },
    select: { id: true },
  });
  return !existing;
}

export function extractFromHtml(
  html: string,
  url: string
): Omit<ImportPreviewPayload, 'slugCollision'> {
  const { category } = parseLegacyUrl(url);
  const $ = loadLegacyHtml(html);
  const warnings: string[] = [];

  if (category === 'case-study') {
    const cs = extractCaseStudy($, url, warnings);
    return {
      sourceUrl: url.trim(),
      category,
      slug: cs.slug,
      title: cs.title,
      excerpt: cs.excerpt,
      featuredImageRemoteUrl: cs.featuredImageRemoteUrl,
      publishedAt: cs.publishedAt,
      tags: cs.tags,
      blocks: cs.blocks,
      caseStudyMeta: cs.caseStudyMeta,
      warnings,
    };
  }

  const extracted =
    category === 'useful-info'
      ? extractUsefulInfo($, url, warnings)
      : category === 'video'
        ? extractVideo($, url, warnings)
        : extractNotice($, url, warnings);

  return {
    sourceUrl: url.trim(),
    category,
    slug: extracted.slug,
    title: extracted.title,
    excerpt: extracted.excerpt,
    featuredImageRemoteUrl: extracted.featuredImageRemoteUrl,
    publishedAt: extracted.publishedAt,
    tags: extracted.tags,
    blocks: extracted.blocks,
    warnings,
  };
}

export async function previewImport(
  url: string
): Promise<ImportPreviewPayload> {
  parseLegacyUrl(url); // validate host + category early
  const html = await fetchLegacyHtml(url);
  const base = extractFromHtml(html, url);
  const slugCollision = !(await isImportSlugAvailable(base.slug));
  return { ...base, slugCollision };
}

export { parseLegacyUrl, PATH_SEGMENT_TO_CATEGORY, LEGACY_HOST };
