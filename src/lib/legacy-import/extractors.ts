import type { CheerioAPI } from 'cheerio';
import { generateId } from '@/lib/article-utils';
import {
  extractCaseStudyMeta,
  extractPageMetadata,
  extractTipCallout,
  fallbackParagraph,
  findContentRoot,
  findYoutubeUrlInRoot,
  postProcessBlocks,
  stripInContentChrome,
  walkBlocks,
  youtubeUrlFromText,
} from './shared';

export function extractCaseStudy(
  $: CheerioAPI,
  pageUrl: string,
  warnings: string[]
) {
  const root = findContentRoot($);
  stripInContentChrome($, root);
  const meta = extractPageMetadata($, pageUrl);
  const caseStudyMeta = extractCaseStudyMeta($, root);
  let blocks = walkBlocks($, root, pageUrl, warnings);
  blocks = postProcessBlocks(blocks, meta.featuredImageRemoteUrl);
  if (!blocks.length) {
    warnings.push('No structured blocks found; using fallback paragraph.');
    blocks = [fallbackParagraph(root)];
  }
  return { ...meta, blocks, caseStudyMeta };
}

export function extractUsefulInfo(
  $: CheerioAPI,
  pageUrl: string,
  warnings: string[]
) {
  const root = findContentRoot($);
  stripInContentChrome($, root);
  const meta = extractPageMetadata($, pageUrl);
  const callout = extractTipCallout($, root, 'この記事で分かること');
  let blocks = walkBlocks($, root, pageUrl, warnings);
  if (callout) blocks = [callout, ...blocks];
  blocks = postProcessBlocks(blocks, meta.featuredImageRemoteUrl);
  if (!blocks.length) {
    warnings.push('No structured blocks found; using fallback paragraph.');
    blocks = [fallbackParagraph(root)];
  }
  return { ...meta, blocks };
}

export function extractVideo(
  $: CheerioAPI,
  pageUrl: string,
  warnings: string[]
) {
  const root = findContentRoot($);
  stripInContentChrome($, root);
  const meta = extractPageMetadata($, pageUrl);
  let blocks = walkBlocks($, root, pageUrl, warnings);
  blocks = postProcessBlocks(blocks, meta.featuredImageRemoteUrl);

  let hasEmbed = blocks.some((b) => b.type === 'embed');
  if (!hasEmbed) {
    const youtubeUrl =
      findYoutubeUrlInRoot($, root) ||
      youtubeUrlFromText(meta.excerpt) ||
      youtubeUrlFromText(
        $('meta[property="og:description"]').attr('content') ??
          $('meta[name="description"]').attr('content') ??
          ''
      );
    if (youtubeUrl) {
      blocks = [
        {
          id: generateId(),
          type: 'embed',
          embedType: 'youtube',
          url: youtubeUrl,
        },
        ...blocks,
      ];
      hasEmbed = true;
    }
  }

  if (!hasEmbed) {
    warnings.push(
      "Couldn't locate the video embed — paste the URL manually after commit."
    );
  }

  let excerpt = meta.excerpt;
  const embedBlock = blocks.find(
    (b) => b.type === 'embed' && b.embedType === 'youtube'
  );
  if (embedBlock?.type === 'embed' && excerpt.startsWith(embedBlock.url)) {
    excerpt = excerpt.slice(embedBlock.url.length).trim();
  }

  if (!blocks.length) {
    blocks = [fallbackParagraph(root)];
  }
  return { ...meta, excerpt, blocks };
}

export function extractNotice(
  $: CheerioAPI,
  pageUrl: string,
  warnings: string[]
) {
  const root = findContentRoot($);
  stripInContentChrome($, root);
  const meta = extractPageMetadata($, pageUrl);
  let blocks = walkBlocks($, root, pageUrl, warnings);
  blocks = postProcessBlocks(blocks, meta.featuredImageRemoteUrl);
  if (!blocks.length) {
    blocks = [fallbackParagraph(root)];
  }
  return { ...meta, blocks };
}
