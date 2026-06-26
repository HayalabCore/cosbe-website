import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import { generateId } from '@/lib/article-utils';
import type { CaseStudyMeta, ContentBlock } from '@/types';
import {
  inlineHtmlToPlainText,
  normalizeStoredParagraphHtml,
} from '@/lib/sanitize-article-html';
import { parseLegacyDate } from './date';
import { resolveUrl, sanitizeParagraphHtml } from './html-sanitize';

export function findContentRoot($: CheerioAPI) {
  // Legacy theme repeats `.post_content` on sidebar widgets and TOC; article body lives under main.
  const mainArticle = $(
    'article.l-mainContent__inner > .post_content, article .post_content:not(.p-blogParts):not(.p-toc)'
  ).first();
  if (mainArticle.length) return mainArticle;

  const entry = $('.entry-content').first();
  if (entry.length) return entry;

  const article = $('article').first();
  if (article.length) return article;

  return $('.post_content').not('.p-blogParts, .p-toc').first();
}

export function extractPageMetadata($: CheerioAPI, pageUrl: string) {
  const title =
    $('.c-postTitle__ttl').first().text().trim() ||
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    'Untitled';

  const slug =
    new URL(pageUrl).pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/\/$/, '') || generateId().slice(0, 8);

  const excerpt =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';

  const featuredImageRemoteUrl =
    $('meta[property="og:image"]').attr('content')?.trim() ||
    $('.p-articleThumb__img').first().attr('src')?.trim() ||
    null;

  const timeEl = $('time[datetime]').first();
  const publishedAt =
    (timeEl.attr('datetime')
      ? new Date(timeEl.attr('datetime')!).toISOString()
      : parseLegacyDate(timeEl.text().trim())) ||
    parseLegacyDate($('.c-postTimes__posted').first().text().trim()) ||
    new Date().toISOString();

  const tags: string[] = [];
  $(
    '.p-articleMetas.-top .c-categoryList__link, .p-articleMetas.-top .c-tagList__link'
  ).each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  return { title, slug, excerpt, featuredImageRemoteUrl, publishedAt, tags };
}

export function stripInContentChrome(
  $: CheerioAPI,
  root: ReturnType<typeof findContentRoot>
) {
  root.find('.p-toc').remove();
  root.find('.p-shareBtns, .c-shareBtns, .sns-share').remove();
  root.find('[class*="あわせて読み"]').remove();

  root.find('h2, h3, h4, h5, p, div, span').each((_, el) => {
    const text = $(el).text().trim();
    if (text === 'あわせて読みたい') {
      $(el)
        .closest('.wp-block-group, .swell-block-fullWide, section, div')
        .first()
        .remove();
    }
  });
}

export function youtubeUrlFromText(text: string): string | null {
  if (!text) return null;
  const watchMatch = text.match(
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([^&\s"'<>]+)/i
  );
  if (watchMatch) return `https://www.youtube.com/watch?v=${watchMatch[1]}`;
  const embedMatch = text.match(
    /https?:\/\/(?:www\.)?youtube\.com\/embed\/([^?&/\s"'<>]+)/i
  );
  if (embedMatch) return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
  const shortMatch = text.match(/https?:\/\/youtu\.be\/([^?&/\s"'<>]+)/i);
  if (shortMatch) return `https://www.youtube.com/watch?v=${shortMatch[1]}`;
  return null;
}

function youtubeUrlFromSrc(src: string): string | null {
  return youtubeUrlFromText(src);
}

export function findYoutubeUrlInRoot(
  $: CheerioAPI,
  root: ReturnType<typeof findContentRoot>
): string | null {
  const iframeSrc = root
    .find('iframe[src*="youtube"], iframe[src*="youtu.be"]')
    .first()
    .attr('src');
  const fromIframe = youtubeUrlFromSrc(iframeSrc ?? '');
  if (fromIframe) return fromIframe;

  let fromLink: string | null = null;
  root.find('a[href*="youtube.com"], a[href*="youtu.be"]').each((_, el) => {
    if (fromLink) return;
    const href = $(el).attr('href') ?? '';
    if (/\/@|\/channel\/|\/user\//.test(href)) return;
    fromLink = youtubeUrlFromText(href);
  });
  if (fromLink) return fromLink;

  return null;
}

export function extractTable($: CheerioAPI, el: Element): ContentBlock | null {
  const $table = $(el);
  const caption = $table.find('caption').first().text().trim() || undefined;
  const headers: string[] = [];
  $table.find('thead tr th, thead tr td').each((_, th) => {
    headers.push($(th).text().trim());
  });
  if (!headers.length) {
    $table
      .find('tr')
      .first()
      .find('th, td')
      .each((_, cell) => {
        headers.push($(cell).text().trim());
      });
  }
  const rows: string[][] = [];
  const hasExplicitThead = $table.find('thead').length > 0;
  const bodyRows = $table.find('tbody tr');
  const rowEls = bodyRows.length
    ? hasExplicitThead
      ? bodyRows
      : bodyRows.slice(1)
    : $table.find('tr').slice(headers.length ? 1 : 0);
  rowEls.each((_, tr) => {
    const cells = $(tr)
      .find('th, td')
      .map((__, td) => $(td).text().trim())
      .get();
    if (cells.some(Boolean)) rows.push(cells);
  });
  if (!headers.length && !rows.length) return null;
  return {
    id: generateId(),
    type: 'table',
    headers: headers.length ? headers : (rows[0] ?? []),
    rows: headers.length ? rows : rows.slice(1),
    caption,
  };
}

export function walkBlocks(
  $: CheerioAPI,
  root: ReturnType<typeof findContentRoot>,
  pageUrl: string,
  warnings: string[]
): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const selector =
    'h2, h3, h4, p, ul, ol, blockquote, img, table, iframe, hr, .wp-block-embed, .wp-block-video';

  root.find(selector).each((_, el) => {
    const $el = $(el);
    const tag = el.tagName?.toLowerCase() ?? '';

    if (
      $el.closest('.smb-information, .p-toc, .p-shareBtns, .c-shareBtns').length
    ) {
      return;
    }

    if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
      const content = $el.text().trim();
      if (!content || content === '目次') return;
      const level = (tag === 'h2' ? 2 : tag === 'h3' ? 3 : 4) as 2 | 3 | 4;
      blocks.push({ id: generateId(), type: 'heading', level, content });
      return;
    }

    if (tag === 'p') {
      const content = sanitizeParagraphHtml($, $el);
      if (content)
        blocks.push({ id: generateId(), type: 'paragraph', content });
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      if ($el.parents('ul, ol').length > 0) return;
      const items = $el
        .children('li')
        .map((__, li) => sanitizeParagraphHtml($, $(li)))
        .get()
        .filter(Boolean);
      if (items.length) {
        blocks.push({
          id: generateId(),
          type: 'list',
          listType: tag === 'ol' ? 'numbered' : 'bullet',
          items,
        });
      }
      return;
    }

    if (tag === 'blockquote') {
      const content = $el.text().trim();
      if (content) blocks.push({ id: generateId(), type: 'quote', content });
      return;
    }

    if (tag === 'img') {
      let src = $el.attr('src') || $el.attr('data-src');
      if (!src) {
        const srcset = $el.attr('srcset') || $el.attr('data-srcset');
        if (srcset) src = srcset.split(',')[0]?.trim().split(/\s+/)[0];
      }
      if (!src) return;
      blocks.push({
        id: generateId(),
        type: 'image',
        url: resolveUrl(src, pageUrl),
        alt: $el.attr('alt') || '',
      });
      return;
    }

    if (tag === 'table') {
      const table = extractTable($, el);
      if (table) blocks.push(table);
      else warnings.push('Skipped unparseable table');
      return;
    }

    if (tag === 'iframe') {
      if ($el.closest('.wp-block-embed, .wp-block-video').length) return;
      const src = $el.attr('src') ?? '';
      const yt = youtubeUrlFromSrc(src);
      if (yt) {
        blocks.push({
          id: generateId(),
          type: 'embed',
          embedType: 'youtube',
          url: yt,
        });
      }
      return;
    }

    if (tag === 'hr') {
      blocks.push({ id: generateId(), type: 'divider' });
      return;
    }

    if ($el.hasClass('wp-block-embed') || $el.hasClass('wp-block-video')) {
      const iframeSrc = $el.find('iframe').attr('src') ?? '';
      const yt = youtubeUrlFromSrc(iframeSrc);
      if (yt) {
        blocks.push({
          id: generateId(),
          type: 'embed',
          embedType: 'youtube',
          url: yt,
        });
      }
    }
  });

  return blocks;
}

export function extractTipCallout(
  $: CheerioAPI,
  root: ReturnType<typeof findContentRoot>,
  title: string
): ContentBlock | null {
  let found: ContentBlock | null = null;
  root.find('h2, h3, h4').each((_, el) => {
    if ($(el).text().trim() !== title) return;
    const $ul = $(el).nextAll('ul').first();
    if (!$ul.length) return;
    const items = $ul
      .find('> li')
      .map((__, li) => $(li).text().trim())
      .get()
      .filter(Boolean);
    if (!items.length) return;
    const html = `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
    found = {
      id: generateId(),
      type: 'callout',
      variant: 'tip',
      title,
      content: html,
    };
    $(el).remove();
    $ul.remove();
  });
  return found;
}

export function extractCaseStudyMeta(
  $: CheerioAPI,
  root: ReturnType<typeof findContentRoot>
): CaseStudyMeta | undefined {
  const meta: CaseStudyMeta = { aiModels: [] };
  let foundPanel = false;

  root.find('h4').each((_, el) => {
    if ($(el).text().trim() !== '企業情報') return;
    foundPanel = true;
    const $panel = $(el).nextAll('.smb-information').first();
    $(el).remove();
    if (!$panel.length) return;

    $panel.find('.smb-information__item').each((__, item) => {
      const label = $(item)
        .find('.smb-information__item__label')
        .first()
        .text()
        .trim();
      const $body = $(item).find('.smb-information__item__body').first();
      if (label === '社名') {
        meta.clientName = $body.text().trim() || undefined;
      } else if (label === '所在地') {
        meta.clientLocation =
          $body.text().replace(/\s+/g, ' ').trim() || undefined;
      } else if (label === 'URL') {
        const href = $body.find('a').attr('href')?.trim();
        meta.clientUrl = href || $body.text().trim() || undefined;
      } else if (label === '導入AIモデル') {
        const models = $body
          .find('.ark-block-button__text')
          .map((___, n) => $(n).text().trim())
          .get()
          .filter(Boolean);
        meta.aiModels =
          models.length > 0
            ? models
            : $body
                .text()
                .split(/[\n,、]/)
                .map((s) => s.trim())
                .filter(Boolean);
      } else if (label === '主な課題') {
        meta.mainChallenges = $body.text().trim() || undefined;
      }
    });

    $panel.remove();
  });

  if (!foundPanel) return undefined;
  if (
    !meta.clientName &&
    !meta.clientLocation &&
    !meta.clientUrl &&
    !meta.aiModels.length &&
    !meta.mainChallenges
  ) {
    return undefined;
  }
  return meta;
}

function normalizeLegacyHeading(content: string): string {
  return content.replace(/^見出\s*/, '').trim();
}

function isStandaloneCalloutParagraph(content: string): boolean {
  const text = content.replace(/<[^>]+>/g, '').trim();
  if (!text) return false;
  if (/^[＼\\].*[／\\]$/.test(text)) return true;
  if (
    text.length <= 48 &&
    /(相談|お問い合わせ|資料請求|ダウンロード)/.test(text)
  ) {
    return true;
  }
  return false;
}

function mergeConsecutiveParagraphs(blocks: ContentBlock[]): ContentBlock[] {
  const merged: ContentBlock[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraphs = () => {
    if (!paragraphBuffer.length) return;
    merged.push({
      id: generateId(),
      type: 'paragraph',
      content: paragraphBuffer.join('<br><br>'),
    });
    paragraphBuffer = [];
  };

  for (const block of blocks) {
    if (block.type === 'heading') {
      flushParagraphs();
      merged.push({
        ...block,
        content: normalizeLegacyHeading(block.content),
      });
    } else if (block.type === 'paragraph') {
      if (isStandaloneCalloutParagraph(block.content)) {
        flushParagraphs();
        merged.push(block);
      } else {
        paragraphBuffer.push(block.content);
      }
    } else {
      flushParagraphs();
      merged.push(block);
    }
  }

  flushParagraphs();
  return merged;
}

function normalizeImportedBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map((block) => {
    if (block.type === 'paragraph') {
      return {
        ...block,
        content: normalizeStoredParagraphHtml(block.content),
      };
    }
    if (block.type === 'list') {
      return {
        ...block,
        items: block.items.map((item) => inlineHtmlToPlainText(item)),
      };
    }
    return block;
  });
}

export function postProcessBlocks(
  blocks: ContentBlock[],
  featuredImageRemoteUrl: string | null
): ContentBlock[] {
  const filtered = blocks.filter((b) => {
    if (b.type === 'paragraph') {
      return b.content.trim().length > 0;
    }
    return true;
  });

  const merged = mergeConsecutiveParagraphs(filtered);

  if (
    featuredImageRemoteUrl &&
    merged[0]?.type === 'image' &&
    merged[0].url === featuredImageRemoteUrl
  ) {
    return normalizeImportedBlocks(merged.slice(1));
  }

  return normalizeImportedBlocks(merged);
}

export function fallbackParagraph(
  root: ReturnType<typeof findContentRoot>
): ContentBlock {
  return {
    id: generateId(),
    type: 'paragraph',
    content:
      root.text().trim().slice(0, 8000) ||
      'Imported article (no structured content detected).',
  };
}
