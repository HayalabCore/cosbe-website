import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { authed } from '@/test/authz';

vi.mock('@/lib/authz', () => ({ requirePermission: vi.fn(), requireAnyPermission: vi.fn(), requireActiveSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/lib/studio/web-boss', () => ({ getWebBoss: vi.fn() }));
vi.mock('@/lib/article-revalidation', () => ({ revalidateArticlePaths: vi.fn() }));

import { prisma } from '@/lib/prisma';
import { createPiece, getPiece, readPiece, updatePiece } from '@/generator/pieces/pieces-repository';
import { createDraftPostAction } from './studio-pieces';

const adminId = randomUUID();
let pieceId: string;
let authorId: string;

beforeAll(async () => {
  await prisma.adminUser.create({ data: { id: adminId, email: `ho-${adminId}@test.local` } });
  const project = await prisma.studioProject.create({ data: { name: 'handoff', createdById: adminId } });
  authorId = (await prisma.author.create({ data: { name: `Handoff ${adminId}`, designation: 'Editor' } })).id;
  pieceId = (await createPiece({ projectId: project.id, createdById: adminId, templateId: null, category: 'notice' })).id;
  await updatePiece(pieceId, {
    stage: 'ready', title: 'AI導入の始め方', excerpt: '導入の要点', authorId,
    outline: [{ id: 'o1', heading: '課題', intent: '', chunkIds: [], estChars: 100, kind: 'source', stale: false }],
    sections: [{
      outlineId: 'o1', heading: '課題', flags: [], enStale: false, en: null,
      blocks: [{ type: 'paragraph', sentences: [{ text: '課題を一つに絞ります。', cite: ['chunk-secret'], connective: false }] }],
    }],
  });
});

afterAll(async () => {
  const piece = await getPiece(pieceId);
  if (piece?.articleId) await prisma.article.delete({ where: { id: piece.articleId } });
  await prisma.studioProject.deleteMany({ where: { createdById: adminId } });
  await prisma.author.delete({ where: { id: authorId } });
  await prisma.adminUser.delete({ where: { id: adminId } });
});

describe('createDraftPostAction', () => {
  it('creates a draft article without citations and locks the piece', async () => {
    authed();
    const result = await createDraftPostAction(pieceId);
    expect(result.ok).toBe(true);
    const piece = readPiece((await getPiece(pieceId))!);
    expect(piece.stage).toBe('handed_off');
    const article = await prisma.article.findUniqueOrThrow({ where: { id: piece.articleId! } });
    expect(article.status).toBe('draft');
    expect(JSON.stringify(article.blocks)).toContain('課題を一つに絞ります。');
    expect(JSON.stringify(article.blocks)).not.toContain('chunk-secret');
    expect(await createDraftPostAction(pieceId)).toMatchObject({ ok: false, error: 'LOCKED' });
  });
});
