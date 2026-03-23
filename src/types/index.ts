// ============================================
// Content Block Types (for rich article content)
// ============================================

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'quote'
  | 'callout'
  | 'image'
  | 'code'
  | 'divider'
  | 'embed';

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4;
  content: string;
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  content: string;
}

export interface ListBlock extends BaseBlock {
  type: 'list';
  listType: 'bullet' | 'numbered';
  items: string[];
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote';
  content: string;
  citation?: string;
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  variant: 'info' | 'warning' | 'tip' | 'related';
  title?: string;
  content: string;
  linkedArticleId?: string;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  url: string;
  alt: string;
  caption?: string;
}

export interface CodeBlock extends BaseBlock {
  type: 'code';
  language: string;
  code: string;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
}

export interface EmbedBlock extends BaseBlock {
  type: 'embed';
  embedType: 'youtube' | 'twitter' | 'link';
  url: string;
  title?: string;
}

export type ContentBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | QuoteBlock
  | CalloutBlock
  | ImageBlock
  | CodeBlock
  | DividerBlock
  | EmbedBlock;

// ============================================
// Author Types
// ============================================

export interface Author {
  id: string;
  name: string;
  designation: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}

export interface AuthorReference {
  id: string;
  name: string;
  designation: string;
  avatarUrl?: string;
}

// ============================================
// Article/Content Types
// ============================================

export type ArticleStatus = 'draft' | 'published' | 'archived';

export type ContentCategory = 'useful-info' | 'case-study' | 'video' | 'notice';

export interface ArticleSEO {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  keywords?: string[];
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  featuredImage?: string;
  status: ArticleStatus;
  category: ContentCategory;
  tags: string[];
  author: AuthorReference;
  blocks: ContentBlock[];
  toc: TOCItem[];
  seo?: ArticleSEO;
  relatedArticleIds?: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
}

export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  featuredImage?: string;
  category: ContentCategory;
  tags: string[];
  author: AuthorReference;
  publishedAt: string | null;
  status?: ArticleStatus;
}

// ============================================
// Table of Contents (generated from blocks)
// ============================================

export interface TOCItem {
  id: string;
  level: number;
  text: string;
}

// ============================================
// Legacy Types (for backward compatibility)
// ============================================

export interface CaseStudy {
  id: number;
  slug: string;
  image: string;
  categoryKey: string;
  titleKey: string;
  dateKey: string;
  authorKey: string;
}

export interface Video {
  id: number;
  slug?: string;
  image: string;
  titleKey: string;
  dateKey: string;
  authorKey: string;
  authorImage: string;
}

export interface Notice {
  id: number;
  slug?: string;
  image: string;
  titleKey: string;
  dateKey: string;
  authorKey: string;
}

export interface Category {
  id: string;
  labelKey: string;
  href: string;
}

export interface NavItem {
  labelKey: string;
  href: string;
  children?: NavItem[];
}
