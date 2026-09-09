import { afterEach, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import {
  archiveArticleRecord,
  archiveArticlesRecord,
  createArticleRecord,
  deleteArticleRecord,
  deleteArticlesRecord,
  publishArticlesRecord,
  unpublishArticlesRecord,
  updateArticleRecord,
} from './articles-repository';
import { createPayload } from '@/test/fixtures/articles';

const slugPrefix = `db-test-${Date.now()}-`;

afterEach(async () => {
  await prisma.article.deleteMany({
    where: { slug: { startsWith: 'db-test-' } },
  });
});

describe('articles-repository db', () => {
  it('rejects a duplicate slug', async () => {
    const slug = `${slugPrefix}dup`;
    await createArticleRecord(createPayload({ slug, title: 'A' }));
    await expect(
      createArticleRecord(createPayload({ slug, title: 'B' }))
    ).rejects.toMatchObject({
      code: 'P2002',
    } as Prisma.PrismaClientKnownRequestError);
  });

  it('archive → restore to draft → hard delete', async () => {
    const id = await createArticleRecord(
      createPayload({ slug: `${slugPrefix}life`, title: 'Life' })
    );
    await archiveArticleRecord(id);
    expect((await prisma.article.findUnique({ where: { id } }))?.status).toBe(
      'archived'
    );
    await updateArticleRecord(id, { status: 'draft' });
    expect((await prisma.article.findUnique({ where: { id } }))?.status).toBe(
      'draft'
    );
    await deleteArticleRecord(id);
    expect(await prisma.article.findUnique({ where: { id } })).toBeNull();
  });

  it('bulk publish/unpublish/archive/delete only touch the given ids', async () => {
    const a = await createArticleRecord(
      createPayload({ slug: `${slugPrefix}a`, title: 'A', status: 'draft' })
    );
    const b = await createArticleRecord(
      createPayload({ slug: `${slugPrefix}b`, title: 'B', status: 'draft' })
    );
    await publishArticlesRecord([a]);
    expect(
      (await prisma.article.findUnique({ where: { id: a } }))?.status
    ).toBe('published');
    expect(
      (await prisma.article.findUnique({ where: { id: b } }))?.status
    ).toBe('draft');
    await unpublishArticlesRecord([a]);
    await archiveArticlesRecord([a]);
    await deleteArticlesRecord([a]);
    expect(await prisma.article.findUnique({ where: { id: a } })).toBeNull();
    expect(
      await prisma.article.findUnique({ where: { id: b } })
    ).not.toBeNull();
  });
});
