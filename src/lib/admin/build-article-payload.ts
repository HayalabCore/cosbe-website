import { createFallbackSlug, generateTOC } from '@/lib/article-utils';
import type {
  Article,
  ArticleSEO,
  ArticleStatus,
  CaseStudyMeta,
  ContentBlock,
  ContentCategory,
} from '@/types';

export const DEFAULT_EDITOR_AUTHOR = {
  id: 'author-1',
  name: 'Editor',
  designation: 'CosBE',
};

export type BuildArticlePayloadArgs = {
  title: string;
  titleEn: string;
  slug: string;
  excerpt: string;
  excerptEn: string;
  featuredImage: string;
  showFeaturedImage: boolean;
  category: ContentCategory;
  tagsStr: string;
  status: ArticleStatus;
  authorName: string;
  authorDesignation: string;
  authorAvatarUrl: string;
  /**
   * Only send the avatar when the editor actually touched it. Authors are shared
   * rows, so unconditionally sending the (initially empty) field would wipe the
   * avatar of an existing author the moment a new article is saved under their
   * name. See `upsertAuthor` for the undefined/empty distinction.
   */
  authorAvatarDirty: boolean;
  seo: ArticleSEO;
  blocks: ContentBlock[];
  untitledFallback: string;
  currentPublishedAt: string | null;
  caseStudy: CaseStudyMeta;
};

export function buildArticlePayload({
  title,
  titleEn,
  slug,
  excerpt,
  excerptEn,
  featuredImage,
  showFeaturedImage,
  category,
  tagsStr,
  status,
  authorName,
  authorDesignation,
  authorAvatarUrl,
  authorAvatarDirty,
  seo,
  blocks,
  untitledFallback,
  currentPublishedAt,
  caseStudy,
}: BuildArticlePayloadArgs): Omit<Article, 'id' | 'createdAt' | 'updatedAt'> {
  const tags = tagsStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const toc = generateTOC(blocks);
  // Preserve an existing publishedAt; only stamp "now" on first publish.
  const publishedAt =
    status === 'published'
      ? (currentPublishedAt ?? new Date().toISOString())
      : null;
  const safeSlug = createFallbackSlug(slug || title);
  return {
    slug: safeSlug,
    title: title || untitledFallback,
    titleEn: titleEn.trim() || undefined,
    excerpt: excerpt || undefined,
    excerptEn: excerptEn.trim() || undefined,
    featuredImage: featuredImage.trim(),
    showFeaturedImage,
    status,
    category,
    tags,
    author: {
      id: DEFAULT_EDITOR_AUTHOR.id,
      name: authorName || DEFAULT_EDITOR_AUTHOR.name,
      designation: authorDesignation || DEFAULT_EDITOR_AUTHOR.designation,
      avatarUrl: authorAvatarDirty ? authorAvatarUrl.trim() : undefined,
    },
    blocks,
    toc,
    seo: Object.keys(seo).length ? seo : undefined,
    relatedArticleIds: [],
    publishedAt,
    viewCount: 0,
    caseStudy: category === 'case-study' ? caseStudy : undefined,
  };
}
