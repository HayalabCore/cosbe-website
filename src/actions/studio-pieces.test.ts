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
  upsertAuthor: vi.fn(async () => 'author-new'),
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
  getTemplateForCategory: vi.fn(async () => null),
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
    studioPiece: { update: vi.fn(), delete: vi.fn() },
    article: { findUnique: vi.fn(async () => null) },
  },
}));

import { prisma } from '@/lib/prisma';
import { listProjectSources } from '@/generator/sources/projects-repository';
import { createAndEnqueueRun } from '@/generator/queue/enqueue';
import { createArticleRecord } from '@/lib/articles';
import {
  createPiece,
  getPiece,
  getTemplateForCategory,
  restoreSnapshot,
  takeSnapshot,
  updatePiece,
} from '@/generator/pieces/pieces-repository';
import { upsertAuthor } from '@/lib/articles-repository';
import {
  addAuthorAction,
  archivePieceAction,
  changePiecesAction,
  deletePieceAction,
  restorePieceAction,
  createDraftPostAction,
  createPieceAction,
  duplicatePieceAction,
  editSentenceAction,
  updatePieceMetaAction,
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
      piece({
        selection: { sourceIds: [A, B], chapters: { [B]: [0] } },
      }) as never
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
      {
        id: 'o1',
        heading: '課題（改）',
        intent: 'i',
        chunkIds: ['k'],
        kind: 'source',
        estChars: 100,
      },
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
      {
        id: 'o1',
        heading: '課題',
        intent: 'i',
        chunkIds: ['k'],
        kind: 'source',
        estChars: 100,
      },
    ]);
    expect(vi.mocked(updatePiece).mock.calls[0][1]).not.toHaveProperty(
      'excerpt'
    );
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
      piece({
        stage: 'ready',
        title: 'AI導入',
        excerpt: 'E',
        sections: [section],
      }) as never
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
      piece({
        stage: 'review',
        title: 'AI導入の始め方',
        excerpt: 'E',
        sections: [section],
      }) as never
    );
    vi.mocked(prisma.author.findUnique).mockResolvedValue({
      id: 'a1',
      name: '山田',
      designation: 'Editor',
      avatarUrl: null,
    } as never);
    await createDraftPostAction(ID);
    const created = vi.mocked(createArticleRecord).mock.calls[0][0];
    expect(created.slug).toMatch(/^article-[0-9a-z]{8}$/);
  });

  it('rejects an unknown run kind', async () => {
    vi.mocked(getPiece).mockResolvedValue(piece() as never);
    expect(await startRunAction(ID, 'rewrite_section' as never)).toEqual({
      ok: false,
      error: 'INVALID_INPUT',
    });
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

  it('creates a piece with the goal and every ready project source selected', async () => {
    vi.mocked(listProjectSources).mockResolvedValueOnce([
      { id: 's1', status: 'ready' },
      { id: 's2', status: 'processing' },
    ] as never);
    expect(
      await createPieceAction({ projectId: ID, goal: '  導入効果を伝える ' })
    ).toEqual({ ok: true, data: { pieceId: 'p2' } });
    expect(updatePiece).toHaveBeenCalledWith(
      'p2',
      expect.objectContaining({
        stage: 'brief',
        selection: { sourceIds: ['s1'], chapters: {} },
        brief: expect.objectContaining({ goal: '導入効果を伝える' }),
      })
    );
  });

  it('edits one sentence, keeps its citation and marks the translation stale', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({
        stage: 'ready',
        excerpt: 'E',
        sections: [{ ...section, en: { heading: 'H', blocks: [] } }],
      }) as never
    );
    expect(
      await editSentenceAction(ID, {
        outlineId: 'o1',
        block: 0,
        index: 0,
        text: ' 新しい本文。 ',
      })
    ).toEqual({ ok: true, data: undefined });
    expect(takeSnapshot).toHaveBeenCalledWith(
      ID,
      'edit_text',
      undefined,
      prisma
    );
    const patch = vi.mocked(updatePiece).mock.calls[0][1];
    expect(patch.stage).toBe('review');
    const edited = patch.sections![0];
    expect(edited.enStale).toBe(true);
    expect(edited.blocks[0]).toEqual({
      type: 'paragraph',
      sentences: [{ text: '新しい本文。', cite: ['k'], connective: false }],
    });
  });

  it('rejects an edit that points at no sentence', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ stage: 'review', sections: [section] }) as never
    );
    expect(
      await editSentenceAction(ID, {
        outlineId: 'o1',
        block: 0,
        index: 3,
        text: 'x',
      })
    ).toMatchObject({ ok: false, error: 'NOT_FOUND' });
    expect(
      await editSentenceAction(ID, {
        outlineId: 'o1',
        block: 0,
        index: 0,
        text: '  ',
      })
    ).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
    expect(updatePiece).not.toHaveBeenCalled();
  });

  it('saves the title, excerpt and SEO the editor typed', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({
        stage: 'review',
        title: 'Old',
        excerpt: 'E',
        sections: [section],
      }) as never
    );
    const seo = { title: 'T', description: 'D', keywords: ['AI'] };
    expect(
      await updatePieceMetaAction(ID, {
        title: ' 新タイトル ',
        excerpt: '要約',
        seo,
      })
    ).toEqual({ ok: true, data: undefined });
    expect(updatePiece).toHaveBeenCalledWith(
      ID,
      { title: '新タイトル', excerpt: '要約', seo },
      undefined,
      prisma
    );
  });

  it('refuses an empty title', async () => {
    vi.mocked(getPiece).mockResolvedValue(piece({ stage: 'review' }) as never);
    expect(await updatePieceMetaAction(ID, { title: ' ' })).toMatchObject({
      ok: false,
      error: 'INVALID_INPUT',
    });
  });

  it('adds an author for users who can edit posts', async () => {
    expect(
      await addAuthorAction({ name: ' 山田 花子 ', designation: '編集部' })
    ).toEqual({
      ok: true,
      data: { id: 'author-new', name: '山田 花子', designation: '編集部' },
    });
    expect(upsertAuthor).toHaveBeenCalledWith('山田 花子', '編集部');
    authed(['studio.use']);
    expect(await addAuthorAction({ name: 'A', designation: 'B' })).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
  });

  it("starts a piece in the chosen category with that category's template", async () => {
    vi.mocked(getTemplateForCategory).mockResolvedValueOnce({
      id: 'tpl-case',
      defaultCategory: 'case-study',
    } as never);
    await createPieceAction({ projectId: ID, category: 'case-study' });
    expect(getTemplateForCategory).toHaveBeenCalledWith('case-study');
    expect(createPiece).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'tpl-case',
        category: 'case-study',
      })
    );
  });

  it('rejects a category that posts do not have', async () => {
    expect(
      await createPieceAction({ projectId: ID, category: 'blog' as never })
    ).toEqual({ ok: false, error: 'INVALID_INPUT' });
    expect(createPiece).not.toHaveBeenCalled();
  });

  it('archives a piece, even one already sent to posts', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ stage: 'handed_off' }) as never
    );
    expect(await archivePieceAction(ID)).toEqual({ ok: true, data: undefined });
    expect(prisma.studioPiece.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: { archivedAt: expect.any(Date) },
    });
  });

  it('does not archive while a run is working on the piece', async () => {
    vi.mocked(getPiece).mockResolvedValue(piece() as never);
    vi.mocked(prisma.studioRun.findFirst).mockResolvedValueOnce({
      id: 'run',
    } as never);
    expect(await archivePieceAction(ID)).toMatchObject({
      ok: false,
      error: 'BUSY',
    });
    expect(prisma.studioPiece.update).not.toHaveBeenCalled();
  });

  it('restores an archived piece', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ archivedAt: new Date() }) as never
    );
    expect(await restorePieceAction(ID)).toEqual({ ok: true, data: undefined });
    expect(prisma.studioPiece.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: { archivedAt: null },
    });
  });

  it('refuses edits to an archived piece', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ archivedAt: new Date() }) as never
    );
    expect(await updatePieceMetaAction(ID, { title: 'T' })).toMatchObject({
      ok: false,
      error: 'LOCKED',
    });
  });

  it('deletes only an archived piece, never the post it created', async () => {
    vi.mocked(getPiece).mockResolvedValue(
      piece({ stage: 'handed_off', articleId: 'art1' }) as never
    );
    expect(await deletePieceAction(ID)).toMatchObject({
      ok: false,
      error: 'INVALID_INPUT',
    });
    expect(prisma.studioPiece.delete).not.toHaveBeenCalled();

    vi.mocked(getPiece).mockResolvedValue(
      piece({
        stage: 'handed_off',
        articleId: 'art1',
        archivedAt: new Date(),
      }) as never
    );
    expect(await deletePieceAction(ID)).toEqual({ ok: true, data: undefined });
    expect(prisma.studioPiece.delete).toHaveBeenCalledWith({
      where: { id: ID },
    });
    expect(createArticleRecord).not.toHaveBeenCalled();
  });

  it('archives several pieces and reports the ones a running job kept', async () => {
    const B = '7f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';
    vi.mocked(getPiece).mockImplementation(
      (async (id: string) => piece({ id })) as never
    );
    vi.mocked(prisma.studioRun.findFirst).mockImplementation((async (args: {
      where: { pieceId: string };
    }) => (args.where.pieceId === B ? { id: 'run' } : null)) as never);
    expect(await changePiecesAction('archive', [ID, B])).toEqual({
      ok: true,
      data: { done: 1, busy: 1, failed: 0 },
    });
    expect(prisma.studioPiece.update).toHaveBeenCalledTimes(1);
    expect(prisma.studioPiece.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: { archivedAt: expect.any(Date) },
    });
  });

  it('deletes only the archived ones among several', async () => {
    const B = '7f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';
    vi.mocked(getPiece).mockImplementation(
      (async (id: string) =>
        piece({ id, archivedAt: id === ID ? new Date() : null })) as never
    );
    vi.mocked(prisma.studioRun.findFirst).mockImplementation(
      (async () => null) as never
    );
    expect(await changePiecesAction('delete', [ID, B])).toEqual({
      ok: true,
      data: { done: 1, busy: 0, failed: 1 },
    });
    expect(prisma.studioPiece.delete).toHaveBeenCalledWith({
      where: { id: ID },
    });
  });

  it('rejects an empty, oversized or malformed selection', async () => {
    expect(await changePiecesAction('archive', [])).toMatchObject({
      ok: false,
      error: 'INVALID_INPUT',
    });
    expect(await changePiecesAction('archive', ['nope'])).toMatchObject({
      ok: false,
      error: 'INVALID_INPUT',
    });
    expect(
      await changePiecesAction(
        'archive',
        Array.from({ length: 201 }, () => ID)
      )
    ).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
    expect(await changePiecesAction('publish' as never, [ID])).toMatchObject({
      ok: false,
      error: 'INVALID_INPUT',
    });
  });
});
