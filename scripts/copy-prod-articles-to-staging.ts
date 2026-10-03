/**
 * Copy the six published production articles the staging homepage needs
 * (three July 2026 case studies + three latest video posts).
 *
 * Reads DATABASE_URL from env/production.env; writes to the database of
 * APP_ENV (must be staging). Authors are find-or-created by name +
 * designation. relatedArticleIds are cleared; viewCount is 0 on insert
 * and left alone on update. Featured-image URLs stay as stored on production.
 *
 * Usage:
 *   APP_ENV=staging yarn tsx scripts/copy-prod-articles-to-staging.ts
 *   APP_ENV=staging yarn tsx scripts/copy-prod-articles-to-staging.ts --dry-run
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { appEnv } from '../src/lib/env/register';
import { confirmRemote } from '../src/lib/env/confirm-remote';
import { prisma as staging } from '../src/lib/prisma';

const DRY_RUN = process.argv.includes('--dry-run');

const SLUGS = [
  'kando',
  'foreign-resume-screening',
  '2month-ai-mvp',
  'article-0ac5327f',
  'article-6d71f2f8',
  'article-de0bf260',
] as const;

/** Production has not applied the Oct 2026 case-study card columns yet. */
const productionArticleSelect = {
  slug: true,
  title: true,
  titleEn: true,
  excerpt: true,
  excerptEn: true,
  featuredImage: true,
  showFeaturedImage: true,
  sourceUrl: true,
  status: true,
  category: true,
  tags: true,
  blocks: true,
  toc: true,
  seo: true,
  publishedAt: true,
  clientName: true,
  clientLocation: true,
  clientUrl: true,
  aiModels: true,
  mainChallenges: true,
  author: true,
} as const;

function productionDatabaseUrl(): string {
  const path = join(process.cwd(), 'env/production.env');
  if (!existsSync(path)) {
    throw new Error('env/production.env is missing. See env/README.md.');
  }
  const values = parseEnv(readFileSync(path, 'utf8'));
  const url = values.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is empty in env/production.env.');
  return url;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function upsertAuthor(
  db: PrismaClient,
  author: {
    name: string;
    designation: string;
    avatarUrl: string | null;
  }
): Promise<string> {
  const row = await db.author.upsert({
    where: {
      name_designation: {
        name: author.name,
        designation: author.designation,
      },
    },
    create: {
      name: author.name,
      designation: author.designation,
      avatarUrl: author.avatarUrl,
    },
    update: author.avatarUrl ? { avatarUrl: author.avatarUrl } : {},
  });
  return row.id;
}

async function main(): Promise<void> {
  if (appEnv !== 'staging') {
    throw new Error(
      `This script writes to staging only (APP_ENV=${appEnv}). Use APP_ENV=staging.`
    );
  }

  if (!DRY_RUN) await confirmRemote(appEnv);

  const production = new PrismaClient({
    datasourceUrl: productionDatabaseUrl(),
  });

  try {
    const sources = await production.article.findMany({
      where: { slug: { in: [...SLUGS] }, status: 'published' },
      select: productionArticleSelect,
    });
    const bySlug = new Map(sources.map((row) => [row.slug, row]));
    const missing = SLUGS.filter((slug) => !bySlug.has(slug));
    if (missing.length > 0) {
      throw new Error(
        `Production is missing published rows for: ${missing.join(', ')}`
      );
    }

    for (const slug of SLUGS) {
      const src = bySlug.get(slug)!;
      const existing = await staging.article.findUnique({
        where: { slug },
        select: { id: true },
      });
      const action = existing ? 'update' : 'insert';
      console.log(`  ${action}  ${slug}  [${src.category}]  ${src.title}`);
      if (DRY_RUN) continue;

      const authorId = await upsertAuthor(staging, src.author);
      const data = {
        title: src.title,
        titleEn: src.titleEn,
        excerpt: src.excerpt,
        excerptEn: src.excerptEn,
        featuredImage: src.featuredImage,
        showFeaturedImage: src.showFeaturedImage,
        sourceUrl: src.sourceUrl,
        status: src.status,
        category: src.category,
        tags: src.tags,
        authorId,
        blocks: toJson(src.blocks),
        toc: toJson(src.toc),
        seo: src.seo == null ? Prisma.JsonNull : toJson(src.seo),
        relatedArticleIds: [] as string[],
        publishedAt: src.publishedAt,
        clientName: src.clientName,
        clientLocation: src.clientLocation,
        clientUrl: src.clientUrl,
        aiModels: src.aiModels,
        mainChallenges: src.mainChallenges,
      };

      if (existing) {
        await staging.article.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await staging.article.create({
          data: { slug, viewCount: 0, ...data },
        });
      }
    }

    if (DRY_RUN) {
      console.log('\n── Dry run complete. Run without --dry-run to apply. ──');
    } else {
      console.log(`\nCopied ${SLUGS.length} articles into staging.`);
    }
  } finally {
    await production.$disconnect();
    await staging.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
