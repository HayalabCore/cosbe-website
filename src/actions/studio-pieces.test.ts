import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, TEST_USER } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock('@/lib/studio/web-boss', () => ({
  getWebBoss: vi.fn(async () => ({})),
}));
vi.mock('@/generator/queue/enqueue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/generator/queue/enqueue')>()),
  createAndEnqueueRun: vi.fn(async () => ({ id: 'run1' })),
}));
vi.mock('@/lib/article-revalidation', () => ({
  revalidateArticlePaths: vi.fn(),
}));
vi.mock('@/lib/articles', () => ({
  createArticleRecord: vi.fn(async () => 'art1'),
}));
vi.mock('@/lib/articles-repository', () => ({
  allocateUniqueSlug: vi.fn(async (s: string) => s),
}));
vi.mock('@/generator/pieces/pieces-repository', () => ({
  getPiece: vi.fn(),
  readPiece: vi.fn((row) => row),
  createPiece: vi.fn(async () => ({ id: 'p2' })),
  updatePiece: vi.fn(),
  takeSnapshot: vi.fn(async () => ({ id: 'snap' })),
  restoreSnapshot: vi.fn(),
  listSnapshots: vi.fn(async () => []),
  listPieces: vi.fn(async () => []),
  getDefaultTemplate: vi.fn(async () => null),
  listTemplates: vi.fn(async () => []),
}));
vi.mock('@/generator/pieces/piece-lock', () => ({
  withPieceLock: async (_id: string, fn: (tx: unknown) => unknown) =>
    fn(prisma),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    studioRun: { findFirst: vi.fn(async () => null), updateMany: vi.fn() },
    studioPieceSnapshot: { findUnique: vi.fn(async () => ({ pieceId: ID })) },
    studioProject: {
      findUnique: vi.fn(async () => ({ id: 'proj', archivedAt: null })),
    },
    author: { findUnique: vi.fn(), findMany: vi.fn(async () => []) },
    article: { findUnique: vi.fn(async () => null) },
  },
}));

import { prisma } from '@/lib/prisma';
import { createAndEnqueueRun } from '@/generator/queue/enqueue';
import { createArticleRecord } from '@/lib/articles';
import {
  getPiece,
  restoreSnapshot,
  takeSnapshot,
  updatePiece,
} from '@/generator/pieces/pieces-repository';
import {
  createDraftPostAction,
  duplicatePieceAction,
  rewriteSectionAction,
  saveOutlineAction,
  startRunAction,
  undoAction,
  updatePieceSetupAction,
} from './studio-pieces';

const ID = '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';
const section = {
  outlineId: 'o1',
  heading: '課題',
  flags: [],
  enStale: false,
  en: null,
  blocks: [
    {
      type: 'paragraph',
      sentences: [{ text: '本文。', cite: ['k'], connective: false }],
    },
  ],
};
const piece = (over = {}) => ({
  id: ID,
  projectId: 'proj',
  templateId: null,
  stage: 'brief',
  title: '',
  titleEn: null,
  excerpt: null,
  excerptEn: null,
  seo: null,
  brief: {
    goal: '導入',
    audience: '',
    keywords: [],
    tone: '',
    targetLength: 'auto',
  },
  selection: { sourceIds: ['s1'], chapters: {} },
  outline: [
    {
      id: 'o1',
      heading: '課題',
      intent: 'i',
      chunkIds: ['k'],
      estChars: 100,
      kind: 'source',
      stale: false,
    },
  ],
  gaps: [],
  sections: [],
  category: 'notice',
  authorId: 'a1',
  articleId: null,
  handedOffAt: null,
  createdById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('piece actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
    vi.mocked(getPiece).mockResolvedValue(piece() as never);
  });

  it('starts an outline run with the token ceiling', async () => {
    expect(await startRunAction(ID, 'outline')).toEqual({
      ok: true,
      data: { runId: 'run1' },
    });
    expect(createAndEnqueueRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        kind: 'outline',
        pieceId: ID,
        createdById: TEST_USER.id,
        tokenCeiling: expect.any(Number),
      })
    );
  });

  it('refuses while another run is active', async () => {
    vi.mocked(prisma.studioRun.findFirst).mockResolvedValueOnce({
      id: 'r',
    } as never);
    expect(await startRunAction(ID, 'write')).toMatchObject({
      ok: false,
      error: 'BUSY',
    });
  });

  it('reports why a stage rule blocks the run', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({
        brief: {
          goal: ' ',
          audience: '',
          keywords: [],
          tone: '',
          targetLength: 'auto',
        },
      }) as never
    );
    expect(await startRunAction(ID, 'outline')).toMatchObject({
      ok: false,
      error: 'BLOCKED',
      reason: expect.stringMatching(/goal/i),
    });
  });

  it('refuses edits to a handed-off piece', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ stage: 'handed_off' }) as never
    );
    expect(
      await updatePieceSetupAction(ID, { category: 'notice' })
    ).toMatchObject({ ok: false, error: 'LOCKED' });
  });

  it('marks changed outline sections stale and rewinds the stage', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ stage: 'review', sections: [section] }) as never
    );
    await saveOutlineAction(ID, [
      {
        id: 'o1',
        heading: '課題（改）',
        intent: 'i',
        chunkIds: ['k'],
        kind: 'source',
        estChars: 100,
      },
    ]);
    expect(takeSnapshot).toHaveBeenCalled();
    expect(updatePiece).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({
        stage: 'outline',
        outline: [expect.objectContaining({ id: 'o1', stale: true })],
      }),
      undefined,
      prisma
    );
  });

  it('drops sections whose outline row was removed', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ stage: 'review', sections: [section] }) as never
    );
    await saveOutlineAction(ID, [
      {
        heading: '新しい節',
        intent: '',
        chunkIds: ['k'],
        kind: 'source',
        estChars: 100,
      },
    ]);
    expect(updatePiece).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ sections: [] }),
      undefined,
      prisma
    );
  });

  it('enqueues a section rewrite', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ stage: 'review', sections: [section] }) as never
    );
    await rewriteSectionAction(ID, { sectionId: 'o1', instruction: '短く' });
    expect(createAndEnqueueRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        kind: 'rewrite_section',
        input: { sectionId: 'o1', instruction: '短く' },
      })
    );
  });

  it('undo snapshots the current state first', async () => {
    await undoAction(ID, 'b1c2b0e8-8a8e-4f5e-9d4c-1f2a3b4c5d6e');
    expect(takeSnapshot).toHaveBeenCalledWith(
      ID,
      'before undo',
      undefined,
      prisma
    );
    expect(restoreSnapshot).toHaveBeenCalled();
  });

  it('does not restore a snapshot from another piece', async () => {
    vi.mocked(prisma.studioPieceSnapshot.findUnique).mockResolvedValueOnce({
      pieceId: 'other',
    } as never);
    expect(
      await undoAction(ID, 'b1c2b0e8-8a8e-4f5e-9d4c-1f2a3b4c5d6e')
    ).toMatchObject({ ok: false, error: 'NOT_FOUND' });
    expect(restoreSnapshot).not.toHaveBeenCalled();
  });

  it('creates a draft post without citations and locks the piece', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ stage: 'ready', title: 'AI導入', sections: [section] }) as never
    );
    vi.mocked(prisma.author.findUnique).mockResolvedValue({
      id: 'a1',
      name: '山田',
      designation: 'Editor',
      avatarUrl: null,
    } as never);
    expect(await createDraftPostAction(ID)).toEqual({
      ok: true,
      data: { articleId: 'art1' },
    });
    const created = vi.mocked(createArticleRecord).mock.calls[0][0];
    expect(created.status).toBe('draft');
    expect(JSON.stringify(created.blocks)).not.toContain('"cite"');
    expect(updatePiece).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ stage: 'handed_off', articleId: 'art1' }),
      undefined,
      prisma
    );
  });

  it('requires articles.edit for handoff', async () => {
    authed(['studio.use']);
    await expect(createDraftPostAction(ID)).rejects.toThrow('Forbidden');
  });

  it('needs an author for handoff', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({
        stage: 'ready',
        title: 'T',
        sections: [section],
        authorId: null,
      }) as never
    );
    expect(await createDraftPostAction(ID)).toMatchObject({
      ok: false,
      error: 'NO_AUTHOR',
    });
  });

  it('duplicates a locked piece into an editable one', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ stage: 'handed_off' }) as never
    );
    expect(await duplicatePieceAction(ID)).toEqual({
      ok: true,
      data: { pieceId: 'p2' },
    });
    expect(updatePiece).toHaveBeenCalledWith(
      'p2',
      expect.objectContaining({ stage: 'brief' })
    );
  });
});
