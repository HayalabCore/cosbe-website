/**
 * Scrape a CosBE / WordPress-style article and insert via Prisma into `articles`.
 *
 * Usage: DATABASE_URL=... yarn import-article <URL>
 *
 * Prisma loads `.env` from the project root (same as `yarn prisma migrate`).
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createArticleRecord } from '../src/lib/articles.repository';
import { generateId, generateTOC } from '../src/lib/article-utils';
import type { ContentBlock, ContentCategory } from '../src/types';

async function scrapeArticle(url: string): Promise<{
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  blocks: ContentBlock[];
  tags: string[];
  category: ContentCategory;
}> {
  const { data: html } = await axios.get<string>(url, { timeout: 30000 });
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('h1').first().text().trim() ||
    'Untitled';

  const slug =
    new URL(url).pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/\/$/, '') || generateId().slice(0, 8);

  const featuredImage =
    $('meta[property="og:image"]').attr('content')?.trim() ||
    $('article img').first().attr('src') ||
    '';

  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';

  const blocks: ContentBlock[] = [];
  const articleRoot = $('article').length ? $('article') : $('.entry-content');

  articleRoot
    .find('h2, h3, h4, p, ul, ol, blockquote, img')
    .each((_, el) => {
      const $el = $(el);
      const tag = el.tagName.toLowerCase();
      if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
        const level = (tag === 'h2' ? 2 : tag === 'h3' ? 3 : 4) as 2 | 3 | 4;
        blocks.push({
          id: generateId(),
          type: 'heading',
          level,
          content: $el.text().trim(),
        });
      } else if (tag === 'p') {
        const text = $el.text().trim();
        if (text) {
          blocks.push({ id: generateId(), type: 'paragraph', content: text });
        }
      } else if (tag === 'ul' || tag === 'ol') {
        const items = $el
          .find('li')
          .map((_, li) => $(li).text().trim())
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
      } else if (tag === 'blockquote') {
        blocks.push({
          id: generateId(),
          type: 'quote',
          content: $el.text().trim(),
        });
      } else if (tag === 'img') {
        const src = $el.attr('src');
        if (src) {
          blocks.push({
            id: generateId(),
            type: 'image',
            url: src.startsWith('http') ? src : new URL(src, url).href,
            alt: $el.attr('alt') || '',
          });
        }
      }
    });

  if (blocks.length === 0) {
    blocks.push({
      id: generateId(),
      type: 'paragraph',
      content: articleRoot.text().trim().slice(0, 8000) || 'Imported article (no structured content detected).',
    });
  }

  return {
    slug,
    title,
    excerpt: metaDescription,
    featuredImage,
    blocks,
    tags: [],
    category: 'useful-info',
  };
}

async function main() {
  const pageUrl = process.argv[2];
  if (!pageUrl) {
    console.error('Usage: yarn import-article <URL>');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL (and DIRECT_URL for migrations) in .env or the environment.');
    process.exit(1);
  }

  console.log('Scraping…');
  const scraped = await scrapeArticle(pageUrl);
  const toc = generateTOC(scraped.blocks);
  const publishedAt = new Date().toISOString();

  const id = await createArticleRecord({
    slug: scraped.slug,
    title: scraped.title,
    excerpt: scraped.excerpt || undefined,
    featuredImage: scraped.featuredImage || undefined,
    status: 'published',
    category: scraped.category,
    tags: scraped.tags,
    author: {
      id: 'import',
      name: 'Import',
      designation: 'Script',
    },
    blocks: scraped.blocks,
    toc,
    seo: {
      metaTitle: scraped.title,
      metaDescription: scraped.excerpt,
      ogImage: scraped.featuredImage || undefined,
    },
    relatedArticleIds: [],
    publishedAt,
    viewCount: 0,
  });

  console.log('Inserted article id:', id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
