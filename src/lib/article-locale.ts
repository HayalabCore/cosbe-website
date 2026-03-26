import {
  paragraphContentToHtml,
  stripHtmlForMetrics,
} from '@/lib/sanitize-article-html';
import type {
  Article,
  ArticleListItem,
  CalloutBlock,
  ContentBlock,
  EmbedBlock,
  HeadingBlock,
  ImageBlock,
  ListBlock,
  ParagraphBlock,
  QuoteBlock,
} from '@/types';

export function isEnglishLocale(locale: string): boolean {
  return locale === 'en';
}

/** Prefer the field for `locale`, then the other language if the first is empty. */
function pickForLocale(
  locale: string,
  primary: string | undefined,
  en: string | undefined
): string {
  const p = primary?.trim() ?? '';
  const e = en?.trim() ?? '';
  if (isEnglishLocale(locale)) {
    return e || p;
  }
  return p || e;
}

export function resolveArticleTitle(
  article: Pick<Article | ArticleListItem, 'title' | 'titleEn'>,
  locale: string
): string {
  return pickForLocale(locale, article.title, article.titleEn);
}

export function resolveArticleExcerpt(
  article: Pick<Article | ArticleListItem, 'excerpt' | 'excerptEn'>,
  locale: string
): string | undefined {
  const s = pickForLocale(locale, article.excerpt, article.excerptEn);
  return s || undefined;
}

/**
 * Public display: pick Japanese (`content`, …) or English (`*En`) per locale,
 * falling back to the other language when the preferred side is empty.
 */
export function resolveBlockForLocale(
  block: ContentBlock,
  locale: string
): ContentBlock {
  switch (block.type) {
    case 'heading': {
      const b = block as HeadingBlock;
      const content = pickForLocale(locale, b.content, b.contentEn);
      return { ...b, content };
    }
    case 'paragraph': {
      const b = block as ParagraphBlock;
      const primary = stripHtmlForMetrics(b.content).trim();
      const secondary = stripHtmlForMetrics(b.contentEn ?? '').trim();
      if (isEnglishLocale(locale)) {
        if (secondary) {
          return { ...b, content: paragraphContentToHtml(b.contentEn!) };
        }
        return b;
      }
      if (primary) return b;
      if (secondary) {
        return { ...b, content: paragraphContentToHtml(b.contentEn!) };
      }
      return b;
    }
    case 'list': {
      const b = block as ListBlock;
      const itemsEn = b.itemsEn ?? [];
      if (isEnglishLocale(locale)) {
        if (!itemsEn.length) return b;
        const items = b.items.map((item, i) => itemsEn[i]?.trim() || item);
        return { ...b, items };
      }
      const items = b.items.map(
        (item, i) => item.trim() || itemsEn[i]?.trim() || ''
      );
      return { ...b, items };
    }
    case 'quote': {
      const b = block as QuoteBlock;
      const content = pickForLocale(locale, b.content, b.contentEn);
      const citation = pickForLocale(locale, b.citation, b.citationEn);
      return {
        ...b,
        content,
        citation: citation || undefined,
      };
    }
    case 'callout': {
      const b = block as CalloutBlock;
      const title = pickForLocale(locale, b.title, b.titleEn);
      const content = pickForLocale(locale, b.content, b.contentEn);
      return {
        ...b,
        title: title || undefined,
        content,
      };
    }
    case 'image': {
      const b = block as ImageBlock;
      const alt = pickForLocale(locale, b.alt, b.altEn);
      const caption = pickForLocale(locale, b.caption, b.captionEn);
      return {
        ...b,
        alt,
        caption: caption || undefined,
      };
    }
    case 'embed': {
      const b = block as EmbedBlock;
      const title = pickForLocale(locale, b.title, b.titleEn);
      return { ...b, title: title || undefined };
    }
    default:
      return block;
  }
}

export function resolveBlocksForLocale(
  blocks: ContentBlock[],
  locale: string
): ContentBlock[] {
  return blocks.map((b) => resolveBlockForLocale(b, locale));
}
