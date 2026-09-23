import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

const section = (heading: string, text: string) => ({
  outlineId: 'o1',
  heading,
  flags: [],
  enStale: false,
  en: null,
  blocks: [
    {
      type: 'paragraph',
      sentences: [{ text, cite: ['c1'], connective: false }],
    },
  ],
});

const base = {
  id: 'p1',
  projectId: 'pr',
  projectName: 'Proj',
  templateId: null,
  stage: 'writing',
  title: '',
  titleEn: null,
  excerpt: null,
  excerptEn: null,
  seo: null,
  brief: {
    goal: 'g',
    audience: '',
    keywords: [],
    tone: '',
    targetLength: 'auto',
  },
  selection: { sourceIds: ['s'], chapters: {} },
  outline: [
    {
      id: 'o1',
      heading: 'A',
      intent: '',
      chunkIds: [],
      estChars: 1,
      kind: 'source',
      stale: false,
    },
    {
      id: 'o2',
      heading: 'B',
      intent: '',
      chunkIds: [],
      estChars: 1,
      kind: 'source',
      stale: false,
    },
  ],
  gaps: [],
  sections: [],
  category: 'notice',
  authorId: null,
  articleId: null,
  handedOffAt: null,
  createdById: null,
  createdAt: '',
  updatedAt: '',
  lastRunError: null,
  article: null,
  activeRun: {
    id: 'r',
    kind: 'write',
    status: 'running',
    error: null,
    targets: 2,
    steps: [
      { key: 'prepare', status: 'succeeded' },
      { key: 'section:o1', status: 'succeeded' },
      { key: 'section:o2', status: 'running' },
    ],
  },
};

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/actions/studio-pieces', () => ({
  getPieceAction: vi.fn(async () => ({ ok: true, data: base })),
  cancelRunAction: vi.fn(async () => ({ ok: true, data: undefined })),
  listSnapshotsAction: vi.fn(async () => ({ ok: true, data: [] })),
  undoAction: vi.fn(async () => ({ ok: true, data: undefined })),
  saveOutlineAction: vi.fn(async () => ({ ok: true, data: undefined })),
  startRunAction: vi.fn(async () => ({ ok: true, data: { runId: 'r' } })),
  updatePieceSetupAction: vi.fn(async () => ({ ok: true, data: undefined })),
  updatePieceMetaAction: vi.fn(async () => ({ ok: true, data: undefined })),
  editSentenceAction: vi.fn(async () => ({ ok: true, data: undefined })),
  rewriteSectionAction: vi.fn(async () => ({ ok: true, data: { runId: 'r' } })),
  getChunksAction: vi.fn(async () => ({
    ok: true,
    data: [{ id: 'c1', sourceTitle: 'メモ', text: '元の資料', locator: {} }],
  })),
  addAuthorAction: vi.fn(async () => ({
    ok: true,
    data: { id: 'a9', name: '山田', designation: '編集部' },
  })),
  createDraftPostAction: vi.fn(async () => ({
    ok: true,
    data: { articleId: 'art' },
  })),
  duplicatePieceAction: vi.fn(),
  listPieceChoicesAction: vi.fn(async () => ({
    ok: true,
    data: {
      sources: [
        { id: 's', title: 'メモ', status: 'ready', kind: 'text', chapters: [] },
      ],
      templates: [],
      authors: [],
    },
  })),
}));

import {
  addAuthorAction,
  cancelRunAction,
  createDraftPostAction,
  editSentenceAction,
  getPieceAction,
  listSnapshotsAction,
  startRunAction,
  updatePieceSetupAction,
} from '@/actions/studio-pieces';
import PieceWorkspace from './PieceWorkspace';

const idle = (over: Record<string, unknown>) => ({
  ...base,
  stage: 'outline',
  activeRun: null,
  ...over,
});
const reviewed = (over: Record<string, unknown> = {}) =>
  idle({
    stage: 'review',
    title: 'T',
    excerpt: 'E',
    outline: [base.outline[0]],
    sections: [section('A', '本文です。')],
    ...over,
  });

describe('PieceWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPieceAction).mockResolvedValue({
      ok: true,
      data: base,
    } as never);
  });

  it('shows the writing progress in the command bar, with Cancel', async () => {
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    expect(
      await screen.findByText('Writing section 2 of 2…')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('reports a cancel that fails instead of dropping it', async () => {
    vi.mocked(cancelRunAction).mockRejectedValueOnce(new Error('network'));
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancel' })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.'
    );
  });

  it('keeps the reason a run could not start next to the button', async () => {
    vi.mocked(getPieceAction)
      .mockResolvedValueOnce({
        ok: true,
        data: idle({ stage: 'brief', outline: [], updatedAt: '1' }),
      } as never)
      .mockResolvedValue({
        ok: true,
        data: idle({ stage: 'brief', outline: [], updatedAt: '2' }),
      } as never);
    vi.mocked(startRunAction).mockResolvedValueOnce({
      ok: false,
      error: 'BLOCKED',
      reason: 'NO_GOAL',
    });
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    const create = await screen.findByRole('button', {
      name: 'Create outline',
    });
    await screen.findByLabelText(/メモ/);
    await userEvent.click(create);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Describe the goal of the article in the brief.'
    );
  });

  it('asks before replacing an existing outline', async () => {
    vi.mocked(getPieceAction).mockResolvedValue({
      ok: true,
      data: idle({ stage: 'brief' }),
    } as never);
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Create new outline' })
    );
    const dialog = await screen.findByRole('dialog');
    expect(startRunAction).not.toHaveBeenCalled();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Create new outline' })
    );
    expect(updatePieceSetupAction).toHaveBeenCalled();
    expect(startRunAction).toHaveBeenCalledWith('p1', 'outline');
  });

  it('edits a sentence in place', async () => {
    vi.mocked(getPieceAction).mockResolvedValue({
      ok: true,
      data: reviewed(),
    } as never);
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    await userEvent.click(await screen.findByText('本文です。'));
    const editor = screen.getByLabelText('Edit text');
    await userEvent.clear(editor);
    await userEvent.type(editor, '新しい本文。{Enter}');
    expect(editSentenceAction).toHaveBeenCalledWith('p1', {
      outlineId: 'o1',
      block: 0,
      index: 0,
      text: '新しい本文。',
    });
  });

  it('shows where a sentence comes from', async () => {
    vi.mocked(getPieceAction).mockResolvedValue({
      ok: true,
      data: reviewed(),
    } as never);
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Source 1' })
    );
    expect(await screen.findByText('元の資料')).toBeInTheDocument();
  });

  it('shows restored content after a restore instead of stale state', async () => {
    vi.mocked(getPieceAction)
      .mockResolvedValueOnce({
        ok: true,
        data: reviewed({
          updatedAt: '1',
          sections: [section('A', '前の文。')],
        }),
      } as never)
      .mockResolvedValue({
        ok: true,
        data: reviewed({
          updatedAt: '2',
          sections: [section('A', '戻した文。')],
        }),
      } as never);
    vi.mocked(listSnapshotsAction).mockResolvedValue({
      ok: true,
      data: [
        { id: 'snap', reason: 'write', createdAt: new Date().toISOString() },
      ],
    } as never);
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    expect(await screen.findByText('前の文。')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'History' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Restore' })
    );
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Restore',
      })
    );
    expect(await screen.findByText('戻した文。')).toBeInTheDocument();
  });

  it('needs an author before the draft post, and can add one', async () => {
    vi.mocked(getPieceAction).mockResolvedValue({
      ok: true,
      data: reviewed({ stage: 'ready' }),
    } as never);
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    const handoff = await screen.findByRole('button', {
      name: 'Create draft post',
    });
    expect(handoff).toBeDisabled();
    expect(
      screen.getByText('Choose an author to create the draft post.')
    ).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add author' })
    );
    await userEvent.type(screen.getByLabelText('Name'), '山田');
    await userEvent.type(screen.getByLabelText('Role, e.g. Editor'), '編集部');
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Add author' }).at(-1)!
    );
    expect(addAuthorAction).toHaveBeenCalledWith({
      name: '山田',
      designation: '編集部',
    });
    expect(
      await screen.findByRole('button', { name: 'Create draft post' })
    ).toBeEnabled();
  });

  it('asks before creating the draft post', async () => {
    vi.mocked(getPieceAction).mockResolvedValue({
      ok: true,
      data: reviewed({ stage: 'ready', authorId: 'a1' }),
    } as never);
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Create draft post' })
    );
    expect(createDraftPostAction).not.toHaveBeenCalled();
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Create draft post',
      })
    );
    expect(createDraftPostAction).toHaveBeenCalledWith('p1');
  });

  it('shows a deleted post as removed once it no longer exists', async () => {
    vi.mocked(getPieceAction).mockResolvedValue({
      ok: true,
      data: idle({
        stage: 'handed_off',
        articleId: null,
        article: null,
        handedOffAt: '2026-09-01T00:00:00Z',
      }),
    } as never);
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    expect(
      await screen.findByText('Post status: Post deleted')
    ).toBeInTheDocument();
  });
});
