/**
 * Scrape a CosBE legacy article and insert via Prisma into `articles`.
 *
 * Usage: DATABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... yarn import-article <URL> [--publish]
 */

import { createClient } from '@supabase/supabase-js';
import { previewImport, isImportSlugAvailable } from '../src/lib/legacy-import';
import { rehostImportImages } from '../src/lib/legacy-import/rehost';
import { SlugCollisionError } from '../src/lib/legacy-import/types';
import { createArticleRecord } from '../src/lib/articles-repository';
import { generateTOC } from '../src/lib/article-utils';

async function main() {
  const args = process.argv.slice(2);
  const publish = args.includes('--publish');
  const pageUrl = args.find((a) => !a.startsWith('--'));

  if (!pageUrl) {
    console.error('Usage: yarn import-article <URL> [--publish]');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL in .env');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for image rehosting'
    );
    process.exit(1);
  }

  console.log('Scraping…');
  const preview = await previewImport(pageUrl);

  if (!(await isImportSlugAvailable(preview.slug))) {
    throw new SlugCollisionError(preview.slug);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('Rehosting images…');
  const { featuredImageUrl, blocks, warnings } = await rehostImportImages(
    supabase,
    preview.featuredImageRemoteUrl,
    preview.blocks
  );
  warnings.forEach((w) => console.warn('Warning:', w));
  preview.warnings.forEach((w) => console.warn('Warning:', w));

  const id = await createArticleRecord({
    slug: preview.slug,
    title: preview.title,
    excerpt: preview.excerpt || undefined,
    featuredImage: featuredImageUrl || undefined,
    status: publish ? 'published' : 'draft',
    category: preview.category,
    tags: preview.tags,
    author: {
      id: 'import',
      name: 'Kenjiro Momi',
      designation: '代表取締役社長',
    },
    blocks,
    toc: generateTOC(blocks),
    seo: {
      metaTitle: preview.title,
      metaDescription: preview.excerpt,
      ogImage: featuredImageUrl || undefined,
    },
    relatedArticleIds: [],
    publishedAt: publish ? preview.publishedAt : null,
    viewCount: 0,
    caseStudy:
      preview.category === 'case-study' ? preview.caseStudyMeta : undefined,
  });

  console.log('Inserted article id:', id);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
