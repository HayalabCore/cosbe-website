import type { CaseStudyMeta, ContentBlock, ContentCategory } from '@/types';

export const LEGACY_HOST = 'www.jp.cosbe.inc';

export const PATH_SEGMENT_TO_CATEGORY: Record<string, ContentCategory> = {
  'case-studies': 'case-study',
  'useful-info': 'useful-info',
  'useful-movie': 'video',
  notice: 'notice',
};

export type ImportPreviewPayload = {
  sourceUrl: string;
  category: ContentCategory;
  slug: string;
  slugCollision: boolean;
  title: string;
  excerpt: string;
  featuredImageRemoteUrl: string | null;
  publishedAt: string;
  tags: string[];
  blocks: ContentBlock[];
  caseStudyMeta?: CaseStudyMeta;
  warnings: string[];
};

export type ImportCommitPayload = ImportPreviewPayload;

export class UnsupportedCategoryError extends Error {
  constructor(segment: string) {
    super(`Unsupported legacy URL category segment: ${segment}`);
    this.name = 'UnsupportedCategoryError';
  }
}

export class SlugCollisionError extends Error {
  constructor(slug: string) {
    super(`An article with slug "${slug}" already exists.`);
    this.name = 'SlugCollisionError';
  }
}

export class ImageRehostError extends Error {
  constructor(
    message: string,
    public readonly failures: string[]
  ) {
    super(message);
    this.name = 'ImageRehostError';
  }
}
