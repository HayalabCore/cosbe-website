import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import type { Job } from 'pg-boss';
import { authed } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));
vi.mock('@/lib/article-revalidation', () => ({
  revalidateArticlePaths: vi.fn(),
}));
vi.mock('@/generator/authz', () => ({ actorHasPermission: async () => true }));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock('@/generator/pieces/outline', () => ({
  loadOutlineMaterial: vi.fn(async () => []),
  planOutline: vi.fn(),
}));
vi.mock('@/generator/pieces/write-section', () => ({ writeSection: vi.fn() }));
vi.mock('@/generator/pieces/finish', () => ({ finishArticle: vi.fn() }));
vi.mock('@/generator/pieces/translate', () => ({
  translateSection: vi.fn(),
  translateMeta: vi.fn(),
}));
vi.mock('@/generator/pieces/scope', () => ({
  buildScope: vi.fn(async () => ({ sourceIds: ['source'], charRanges: {} })),
  // A source section needs at least one in-scope passage to be written.
  getChunks: vi.fn(async () => [
    {
      id: 'k',
      sourceId: 'source',
      sourceTitle: 'S',
      ordinal: 0,
      text: 't',
      locator: {},
    },
  ]),
}));
vi.mock('@/generator/retrieval/search', () => ({
  searchSources: vi.fn(async () => []),
}));

import { prisma } from '@/lib/prisma';
import { cancelRunAction, undoAction } from '@/actions/studio-pieces';
import {
  createPiece,
  updatePiece,
  getPiece,
  takeSnapshot,
} from '@/generator/pieces/pieces-repository';
import { createRun, getRun } from '@/generator/runs/runs-repository';
import { handleRunJob } from '@/generator/runs/run-handler';
import { RUN_EXECUTORS } from '@/generator/executors';
import { planOutline } from '@/generator/pieces/outline';
import { writeSection } from '@/generator/pieces/write-section';
import { finishArticle } from '@/generator/pieces/finish';
import { translateSection, translateMeta } from '@/generator/pieces/translate';
import type { RunKind } from '@/generator/runs/run-types';

const adminId = randomUUID();
let projectId: string;
const section = {
  outlineId: 'o',
  heading: 'Old heading',
  blocks: [],
  flags: [],
  en: null,
  enStale: false,
};
const outline = [
  {
    id: 'o',
    heading: 'Old heading',
    intent: '',
    chunkIds: [],
    estChars: 100,
    kind: 'source' as const,
    stale: true,
  },
];
beforeAll(async () => {
  authed();
  await prisma.adminUser.create({
    data: { id: adminId, email: `${adminId}@test.local` },
  });
  projectId = (
    await prisma.studioProject.create({
      data: { name: 'cancellation', createdById: adminId },
    })
  ).id;
});
afterAll(async () => {
  await prisma.studioProject.delete({ where: { id: projectId } });
  await prisma.studioRun.deleteMany({ where: { createdById: adminId } });
  await prisma.adminUser.delete({ where: { id: adminId } });
});

it.each([
  ['outline', 'outline'],
  ['write', 'section'],
  ['write', 'finish'],
  ['translate', 'section'],
  ['translate', 'meta'],
  ['rewrite_section', 'rewrite'],
] as const)(
  'cancels %s during %s without overwriting undo or the replacement run',
  async (kind, phase) => {
    vi.mocked(planOutline).mockResolvedValue({
      title: 'New title',
      outline,
      gaps: [],
    });
    vi.mocked(writeSection).mockResolvedValue({
      ...section,
      heading: 'New heading',
    });
    vi.mocked(finishArticle).mockResolvedValue({
      title: 'New title',
      excerpt: 'New excerpt',
      seo: { title: 'SEO', description: 'New', keywords: [] },
    });
    vi.mocked(translateSection).mockResolvedValue({
      heading: 'New English',
      blocks: [],
    });
    vi.mocked(translateMeta).mockResolvedValue({
      titleEn: 'New English title',
      excerptEn: 'New English excerpt',
    });
    const gate = Promise.withResolvers<void>();
    const entered = Promise.withResolvers<void>();
    const delayed =
      kind === 'outline'
        ? vi.mocked(planOutline)
        : kind === 'rewrite_section'
          ? vi.mocked(writeSection)
          : kind === 'write'
            ? phase === 'finish'
              ? vi.mocked(finishArticle)
              : vi.mocked(writeSection)
            : phase === 'meta'
              ? vi.mocked(translateMeta)
              : vi.mocked(translateSection);
    const original = delayed.getMockImplementation()!;
    delayed.mockImplementationOnce((async (...args: never[]) => {
      entered.resolve();
      await gate.promise;
      return (original as (...args: never[]) => unknown)(...args);
    }) as never);
    const piece = await createPiece({
      projectId,
      createdById: adminId,
      templateId: null,
      category: 'notice',
    });
    await updatePiece(piece.id, {
      stage: 'review',
      title: 'Original',
      excerpt: 'Original excerpt',
      // A stale row gives write work to do; translate needs a complete article.
      outline:
        kind === 'translate'
          ? outline.map((o) => ({ ...o, stale: false }))
          : outline,
      sections: [section],
      selection: { sourceIds: [randomUUID()], chapters: {} },
      brief: {
        goal: 'Goal',
        audience: '',
        keywords: [],
        tone: '',
        targetLength: 'auto',
      },
    });
    const snapshot = await takeSnapshot(piece.id, 'original');
    const run = await createRun(prisma, {
      kind: kind as RunKind,
      createdById: adminId,
      pieceId: piece.id,
      input:
        kind === 'rewrite_section'
          ? { sectionId: 'o', instruction: 'Shorter' }
          : {},
    });
    const execution = handleRunJob(
      {
        id: randomUUID(),
        name: kind,
        data: { runId: run.id },
        signal: new AbortController().signal,
      } as Job<unknown>,
      RUN_EXECUTORS
    );
    try {
      await entered.promise;
      await cancelRunAction(piece.id);
      expect(await undoAction(piece.id, snapshot.id)).toMatchObject({
        ok: true,
      });
      await createRun(prisma, {
        kind: 'outline',
        createdById: adminId,
        pieceId: piece.id,
      });
      const restored = await getPiece(piece.id);
      gate.resolve();
      await execution;
      expect(await getPiece(piece.id)).toEqual(restored);
      expect((await getRun(run.id))?.status).toBe('cancelled');
    } finally {
      gate.resolve();
      await execution;
    }
  }
);
