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
vi.mock('@/generator/sources/projects-repository', () => ({
  listProjectSources: vi.fn(async () => [{ id: 's1', status: 'ready' }]),
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
import { listProjectSources } from '@/generator/sources/projects-repository';
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

  it('waits for a selected source to be ready', async () => {
    vi.mocked(listProjectSources).mockResolvedValueOnce([
      { id: 's1', status: 'pending' },
    ] as never);
    expect(await startRunAction(ID, 'outline')).toMatchObject({
      ok: false,
      error: 'BLOCKED',
      reason: 'SOURCES_NOT_READY',
    });
  });

  it('rejects a brief that is too long', async () => {
    expect(
      await updatePieceSetupAction(ID, {
        brief: {
          goal: 'x'.repeat(4001),
          audience: '',
          keywords: [],
          tone: '',
          targetLength: 'auto',
        },
      })
    ).toEqual({ ok: false, error: 'INVALID_INPUT' });
  });

  it('rejects a source that is not linked to the project', async () => {
    vi.mocked(listProjectSources).mockResolvedValueOnce([]);
    expect(
      await updatePieceSetupAction(ID, {
        selection: {
          sourceIds: ['6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e'],
          chapters: {},
        },
      })
    ).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(updatePiece).not.toHaveBeenCalled();
  });

  it('drops stored sources that were unlinked instead of rejecting the save', async () => {
    const [A, B, C] = [
      '0a1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e',
      '0b1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e',
      '0c1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e',
    ];
    vi.mocked(getPiece).mockResolvedValue(
      piece({ selection: { sourceIds: [A, B], chapters: { [B]: [0] } } }) as never
    );
    vi.mocked(listProjectSources).mockResolvedValueOnce([
      { id: A, status: 'ready' },
      { id: C, status: 'ready' },
    ] as never);
    expect(
      await updatePieceSetupAction(ID, {
        selection: { sourceIds: [A, B, C], chapters: { [B]: [0], [C]: [1] } },
      })
    ).toEqual({ ok: true, data: undefined });
    expect(updatePiece).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({
        selection: { sourceIds: [A, C], chapters: { [C]: [1] } },
      }),
      undefined,
      prisma
    );
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
      reason: 'NO_GOAL',
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

  it('clears the excerpt when an outline edit makes sections stale', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ stage: 'review', excerpt: 'Old', sections: [section] }) as never
    );
    await saveOutlineAction(ID, [
      { id: 'o1', heading: '課題（改）', intent: 'i', chunkIds: ['k'], kind: 'source', estChars: 100 },
    ]);
    expect(updatePiece).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ excerpt: null }),
      undefined,
      prisma
    );
  });

  it('keeps the excerpt when the outline is saved unchanged', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ stage: 'review', excerpt: 'Old', sections: [section] }) as never
    );
    await saveOutlineAction(ID, [
      { id: 'o1', heading: '課題', intent: 'i', chunkIds: ['k'], kind: 'source', estChars: 100 },
    ]);
    expect(vi.mocked(updatePiece).mock.calls[0][1]).not.toHaveProperty('excerpt');
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
      'before_undo',
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
      piece({ stage: 'ready', title: 'AI導入', excerpt: 'E', sections: [section] }) as never
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

  it('reports FORBIDDEN, without throwing, when handoff lacks articles.edit', async () => {
    authed(['studio.use']);
    expect(await createDraftPostAction(ID)).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    authed([]);
    await expect(createDraftPostAction(ID)).rejects.toThrow('Forbidden');
  });

  it('never derives a Latin-remnant slug from a Japanese-only title', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ stage: 'review', title: 'AI導入の始め方', excerpt: 'E', sections: [section] }) as never
    );
    vi.mocked(prisma.author.findUnique).mockResolvedValue({
      id: 'a1', name: '山田', designation: 'Editor', avatarUrl: null,
    } as never);
    await createDraftPostAction(ID);
    const created = vi.mocked(createArticleRecord).mock.calls[0][0];
    expect(created.slug).toMatch(/^article-[0-9a-z]{8}$/);
  });

  it('rejects an unknown run kind', async () => {
    vi.mocked(getPiece).mockResolvedValue(piece() as never);
    expect(
      await startRunAction(ID, 'rewrite_section' as never)
    ).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(createAndEnqueueRun).not.toHaveBeenCalled();
  });

  it('needs an author for handoff', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({
        stage: 'ready',
        title: 'T',
        excerpt: 'E',
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
