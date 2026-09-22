import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { authed } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock('@/lib/article-revalidation', () => ({
  revalidateArticlePaths: vi.fn(),
}));
let failAfterInsert = false;
vi.mock('@/lib/articles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/articles')>();
  return {
    ...actual,
    createArticleRecord: async (
      ...args: Parameters<typeof actual.createArticleRecord>
    ) => {
      const id = await actual.createArticleRecord(...args);
      if (failAfterInsert)
        throw new Error('simulated failure after article insertion');
      return id;
    },
  };
});

import { prisma } from '@/lib/prisma';
import {
  cancelRunAction,
  createDraftPostAction,
  updatePieceSetupAction,
} from '@/actions/studio-pieces';
import { createRun } from '@/generator/runs/runs-repository';
import {
  createPiece,
  getPiece,
  readPiece,
  updatePiece,
  saveSection,
  takeSnapshot,
  restoreSnapshot,
} from '@/generator/pieces/pieces-repository';

const adminId = randomUUID();
let projectId: string;
let authorId: string;
beforeAll(async () => {
  authed();
  await prisma.adminUser.create({
    data: { id: adminId, email: `${adminId}@test.local` },
  });
  projectId = (
    await prisma.studioProject.create({
      data: { name: 'review regression', createdById: adminId },
    })
  ).id;
  authorId = (
    await prisma.author.create({
      data: { name: adminId, designation: 'Editor' },
    })
  ).id;
});
afterAll(async () => {
  await prisma.studioProject.delete({ where: { id: projectId } });
  await prisma.studioRun.deleteMany({ where: { createdById: adminId } });
  await prisma.article.deleteMany({ where: { authorId } });
  await prisma.author.delete({ where: { id: authorId } });
  await prisma.adminUser.delete({ where: { id: adminId } });
});
async function piece() {
  const p = await createPiece({
    projectId,
    createdById: adminId,
    templateId: null,
    category: 'notice',
  });
  await updatePiece(p.id, {
    stage: 'review',
    title: `Review ${p.id}`,
    authorId,
    sections: [
      {
        outlineId: 'o',
        heading: 'H',
        blocks: [
          {
            type: 'paragraph',
            sentences: [{ text: 'Body.', cite: [], connective: true }],
          },
        ],
        flags: [],
        en: null,
        enStale: false,
      },
    ],
  });
  return p;
}

it('allows only one active run per piece across concurrent kinds', async () => {
  const p = await piece();
  const results = await Promise.allSettled(
    ['outline', 'write'].map((kind) =>
      createRun(prisma, {
        kind: kind as 'outline' | 'write',
        createdById: adminId,
        pieceId: p.id,
      })
    )
  );
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(
    await prisma.studioRun.count({
      where: { pieceId: p.id, status: { in: ['queued', 'running'] } },
    })
  ).toBe(1);
});

it('fences cancelled worker mutations after undo and after a replacement run starts', async () => {
  const p = await piece();
  const snapshot = await takeSnapshot(p.id, 'before');
  const run = await createRun(prisma, {
    kind: 'write',
    createdById: adminId,
    pieceId: p.id,
  });
  await cancelRunAction(p.id);
  await restoreSnapshot(snapshot.id);
  await createRun(prisma, {
    kind: 'translate',
    createdById: adminId,
    pieceId: p.id,
  });
  const before = readPiece((await getPiece(p.id))!);
  await expect(
    updatePiece(p.id, { title: 'cancelled output', stage: 'ready' }, run.id)
  ).rejects.toThrow();
  await expect(
    saveSection(
      p.id,
      { ...before.sections[0], heading: 'cancelled heading' },
      run.id
    )
  ).rejects.toThrow();
  await expect(
    takeSnapshot(p.id, 'cancelled snapshot', run.id)
  ).rejects.toThrow();
  expect(readPiece((await getPiece(p.id))!)).toEqual(before);
});

it('restores null metadata rather than retaining values from a newer generation', async () => {
  const p = await piece();
  const snapshot = await takeSnapshot(p.id, 'no metadata');
  await updatePiece(p.id, {
    titleEn: 'new',
    excerpt: 'new',
    excerptEn: 'new',
    seo: { title: 'new', description: 'new', keywords: [] },
  });
  await restoreSnapshot(snapshot.id);
  expect(readPiece((await getPiece(p.id))!)).toMatchObject({
    titleEn: null,
    excerpt: null,
    excerptEn: null,
    seo: null,
  });
});

it('creates only one article when two handoff requests race', async () => {
  const p = await piece();
  const before = await prisma.article.count({ where: { authorId } });
  const results = await Promise.all([
    createDraftPostAction(p.id),
    createDraftPostAction(p.id),
  ]);
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  expect(await prisma.article.count({ where: { authorId } })).toBe(before + 1);
  expect((await getPiece(p.id))?.articleId).not.toBeNull();
});

it('rolls article insertion back if handoff fails before recording the article ID', async () => {
  const p = await piece();
  const before = await prisma.article.count({ where: { authorId } });
  failAfterInsert = true;
  try {
    await createDraftPostAction(p.id);
  } catch {
    /* server action may reject */
  } finally {
    failAfterInsert = false;
  }
  expect(await prisma.article.count({ where: { authorId } })).toBe(before);
  expect((await getPiece(p.id))?.articleId).toBeNull();
  expect(await createDraftPostAction(p.id)).toMatchObject({ ok: true });
});

it('invalidates generated content when the source selection changes', async () => {
  const p = await piece();
  await updatePiece(p.id, {
    outline: [
      {
        id: 'o',
        heading: 'H',
        intent: '',
        kind: 'source',
        chunkIds: [],
        estChars: 10,
        stale: false,
      },
    ],
  });
  expect(
    await updatePieceSetupAction(p.id, {
      selection: { sourceIds: [randomUUID()], chapters: {} },
    })
  ).toMatchObject({ ok: true });
  expect(readPiece((await getPiece(p.id))!)).toMatchObject({
    stage: 'outline',
    sections: [],
    titleEn: null,
    excerpt: null,
    excerptEn: null,
    seo: null,
    outline: [{ stale: true }],
  });
});
