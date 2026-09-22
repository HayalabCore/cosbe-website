import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createPiece,
  getPiece,
  getDefaultTemplate,
  listSnapshots,
  readPiece,
  restoreSnapshot,
  saveSection,
  takeSnapshot,
  updatePiece,
} from './pieces-repository';
import type { Section } from './piece-types';

const adminId = randomUUID();
let projectId: string;

const section = (outlineId: string, text: string): Section => ({
  outlineId,
  heading: `H-${outlineId}`,
  flags: [],
  enStale: false,
  en: null,
  blocks: [
    {
      type: 'paragraph',
      sentences: [{ text, cite: ['c'], connective: false }],
    },
  ],
});

beforeAll(async () => {
  await prisma.adminUser.create({
    data: { id: adminId, email: `pc-${adminId}@test.local` },
  });
  projectId = (
    await prisma.studioProject.create({
      data: { name: 'p', createdById: adminId },
    })
  ).id;
});

afterAll(async () => {
  await prisma.studioProject.deleteMany({ where: { createdById: adminId } });
  await prisma.adminUser.delete({ where: { id: adminId } });
});

describe('pieces repository', () => {
  it('creates a piece with the default template and parses JSON columns', async () => {
    const template = await getDefaultTemplate();
    const piece = await createPiece({
      projectId,
      createdById: adminId,
      templateId: template?.id ?? null,
      category: 'useful-info',
    });
    const data = readPiece((await getPiece(piece.id))!);
    expect(data.stage).toBe('sources');
    expect(data.brief.targetLength).toBe('auto');
    expect(data.selection).toEqual({ sourceIds: [], chapters: {} });
    expect(data.sections).toEqual([]);
  });

  it('saves sections in outline order and replaces by outlineId', async () => {
    const piece = await createPiece({
      projectId,
      createdById: adminId,
      templateId: null,
      category: 'notice',
    });
    await updatePiece(piece.id, {
      outline: [
        {
          id: 'a',
          heading: 'A',
          intent: '',
          chunkIds: [],
          estChars: 100,
          kind: 'source',
          stale: false,
        },
        {
          id: 'b',
          heading: 'B',
          intent: '',
          chunkIds: [],
          estChars: 100,
          kind: 'source',
          stale: false,
        },
      ],
    });
    await saveSection(piece.id, section('b', 'second'));
    await saveSection(piece.id, section('a', 'first'));
    await saveSection(piece.id, section('a', 'first v2'));
    const data = readPiece((await getPiece(piece.id))!);
    expect(data.sections.map((s) => s.outlineId)).toEqual(['a', 'b']);
    expect(data.sections[0].blocks[0]).toMatchObject({
      sentences: [{ text: 'first v2' }],
    });
  });

  it('snapshots and restores outline, sections, title and stage', async () => {
    const piece = await createPiece({
      projectId,
      createdById: adminId,
      templateId: null,
      category: 'notice',
    });
    await updatePiece(piece.id, {
      title: 'before',
      stage: 'review',
      titleEn: 'Before',
      excerpt: 'old excerpt',
      excerptEn: 'Old excerpt',
      seo: {
        title: 'Old SEO',
        description: 'Old description',
        keywords: ['old'],
      },
    });
    await saveSection(piece.id, section('a', 'old'));
    const snap = await takeSnapshot(piece.id, 'rewrite a');
    await updatePiece(piece.id, {
      title: 'after',
      stage: 'ready',
      titleEn: 'After',
      excerpt: 'new excerpt',
      excerptEn: 'New excerpt',
      seo: {
        title: 'New SEO',
        description: 'New description',
        keywords: ['new'],
      },
    });
    await saveSection(piece.id, section('a', 'new'));
    expect((await listSnapshots(piece.id)).map((s) => s.id)).toContain(snap.id);
    await restoreSnapshot(snap.id);
    const data = readPiece((await getPiece(piece.id))!);
    expect(data).toMatchObject({
      title: 'before',
      titleEn: 'Before',
      excerpt: 'old excerpt',
      excerptEn: 'Old excerpt',
      seo: {
        title: 'Old SEO',
        description: 'Old description',
        keywords: ['old'],
      },
    });
    expect(data.stage).toBe('review');
    expect(data.sections[0].blocks[0]).toMatchObject({
      sentences: [{ text: 'old' }],
    });
  });

  it('clears seo when patch sets null and leaves it when omitted', async () => {
    const piece = await createPiece({
      projectId,
      createdById: adminId,
      templateId: null,
      category: 'notice',
    });
    await updatePiece(piece.id, {
      seo: { title: 'S', description: 'D', keywords: ['k'] },
    });
    expect(readPiece((await getPiece(piece.id))!).seo).toEqual({
      title: 'S',
      description: 'D',
      keywords: ['k'],
    });
    await updatePiece(piece.id, { title: 'keep-seo' });
    expect(readPiece((await getPiece(piece.id))!).seo?.title).toBe('S');
    await updatePiece(piece.id, { seo: null });
    expect(readPiece((await getPiece(piece.id))!).seo).toBeNull();
    expect((await getPiece(piece.id))!.seo).toBeNull();
  });
});
