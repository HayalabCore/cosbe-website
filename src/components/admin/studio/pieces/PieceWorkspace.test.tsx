import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

const base = {
  id: 'p1', projectId: 'pr', templateId: null, stage: 'writing', title: '', titleEn: null, excerpt: null, excerptEn: null,
  seo: null, brief: { goal: 'g', audience: '', keywords: [], tone: '', targetLength: 'auto' },
  selection: { sourceIds: ['s'], chapters: {} },
  outline: [{ id: 'o1', heading: 'A', intent: '', chunkIds: [], estChars: 1, kind: 'source', stale: false }, { id: 'o2', heading: 'B', intent: '', chunkIds: [], estChars: 1, kind: 'source', stale: false }],
  gaps: [], sections: [], category: 'notice', authorId: null, articleId: null, handedOffAt: null, createdById: null,
  createdAt: '', updatedAt: '', lastRunError: null, article: null,
  activeRun: { id: 'r', kind: 'write', status: 'running', error: null, steps: [{ key: 'prepare', status: 'succeeded' }, { key: 'section:o1', status: 'succeeded' }, { key: 'section:o2', status: 'running' }] },
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
  listPieceChoicesAction: vi.fn(async () => ({ ok: true, data: { sources: [], templates: [], authors: [] } })),
}));

import userEvent from '@testing-library/user-event';
import { cancelRunAction, getPieceAction, listSnapshotsAction, startRunAction } from '@/actions/studio-pieces';
import PieceWorkspace from './PieceWorkspace';

const idle = (over: Record<string, unknown>) => ({ ...base, stage: 'outline', activeRun: null, ...over });

describe('PieceWorkspace', () => {
  it('shows the writing progress for the active run', async () => {
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    expect(await screen.findByText('Section 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows restored content after Undo instead of stale panel state', async () => {
    const before = idle({ updatedAt: '1', outline: [{ ...base.outline[0], heading: 'Before' }] });
    const after = idle({ updatedAt: '2', outline: [{ ...base.outline[0], heading: 'Restored' }] });
    vi.mocked(getPieceAction)
      .mockResolvedValueOnce({ ok: true, data: before } as never)
      .mockResolvedValue({ ok: true, data: after } as never);
    vi.mocked(listSnapshotsAction).mockResolvedValue({
      ok: true,
      data: [{ id: 'snap', reason: 'write', createdAt: new Date().toISOString() }],
    } as never);
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    expect(await screen.findByDisplayValue('Before')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    expect(await screen.findByDisplayValue('Restored')).toBeInTheDocument();
  });

  it('shows a deleted post as removed once it no longer exists', async () => {
    vi.mocked(getPieceAction).mockResolvedValue({
      ok: true,
      data: idle({ stage: 'handed_off', articleId: null, article: null, handedOffAt: '2026-09-01T00:00:00Z' }),
    } as never);
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    expect((await screen.findAllByText('Post deleted')).length).toBeGreaterThan(0);
  });

  it('keeps the reason a run could not start even though the save changed the piece', async () => {
    vi.mocked(getPieceAction)
      .mockResolvedValueOnce({ ok: true, data: idle({ stage: 'brief', updatedAt: '1' }) } as never)
      .mockResolvedValue({ ok: true, data: idle({ stage: 'brief', updatedAt: '2' }) } as never);
    vi.mocked(startRunAction).mockResolvedValueOnce({ ok: false, error: 'BLOCKED', reason: 'NO_GOAL' });
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Create outline' }));
    expect(
      await screen.findByText('Describe the goal of the article in the brief.')
    ).toBeInTheDocument();
  });

  it('reports a cancel that fails instead of dropping it', async () => {
    vi.mocked(getPieceAction).mockResolvedValue({ ok: true, data: base } as never);
    vi.mocked(cancelRunAction).mockRejectedValueOnce(new Error('network'));
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.');
  });
});
