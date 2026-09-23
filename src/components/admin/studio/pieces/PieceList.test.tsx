import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/actions/studio-pieces', () => ({
  listPiecesAction: vi.fn(async () => ({
    ok: true,
    data: [
      {
        id: 'p1',
        title: 'T',
        projectName: 'P',
        stage: 'handed_off',
        articleStatus: null,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'p2',
        title: 'Draft one',
        projectName: 'P',
        stage: 'review',
        articleStatus: null,
        updatedAt: new Date().toISOString(),
      },
    ],
  })),
  createPieceAction: vi.fn(async () => ({
    ok: true,
    data: { pieceId: 'new' },
  })),
}));
vi.mock('@/actions/studio-projects', () => ({
  listProjectsAction: vi.fn(async () => ({
    ok: true,
    data: [{ id: 'pr', name: 'Proj' }],
  })),
  createProjectAction: vi.fn(async () => ({
    ok: true,
    data: { projectId: 'made' },
  })),
}));

import { createPieceAction, listPiecesAction } from '@/actions/studio-pieces';
import {
  createProjectAction,
  listProjectsAction,
} from '@/actions/studio-projects';
import PieceList from './PieceList';

describe('PieceList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows each article at its step, and a sent one whose post was deleted', async () => {
    renderAdmin(<PieceList />);
    expect(await screen.findByText('Post deleted')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('filters to articles still in progress', async () => {
    renderAdmin(<PieceList />);
    await userEvent.click(
      await screen.findByRole('button', { name: /In progress/ })
    );
    expect(screen.getByText('Draft one')).toBeInTheDocument();
    expect(screen.queryByText('T')).toBeNull();
  });

  it('offers to write the first article when there are none', async () => {
    vi.mocked(listPiecesAction).mockResolvedValueOnce({ ok: true, data: [] });
    renderAdmin(<PieceList />);
    expect(
      await screen.findByText('Write your first article')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'New article' })
    ).toBeInTheDocument();
  });

  it('needs a goal, then creates one article with it however often Create is clicked', async () => {
    vi.mocked(createPieceAction).mockImplementationOnce(
      () => new Promise(() => {})
    );
    renderAdmin(<PieceList />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'New article' })
    );
    const create = screen.getByRole('button', { name: 'Create article' });
    expect(create).toBeDisabled();
    await userEvent.type(
      screen.getByLabelText('What should this article do?'),
      '導入効果を伝える'
    );
    await screen.findByRole('option', { name: 'Proj' });
    await userEvent.click(create);
    await userEvent.click(create);
    expect(createPieceAction).toHaveBeenCalledTimes(1);
    expect(createPieceAction).toHaveBeenCalledWith({
      projectId: 'pr',
      goal: '導入効果を伝える',
    });
  });

  it('creates a project on the way when there is none yet', async () => {
    vi.mocked(listProjectsAction).mockResolvedValueOnce({ ok: true, data: [] });
    renderAdmin(<PieceList />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'New article' })
    );
    await userEvent.type(
      screen.getByLabelText('What should this article do?'),
      'Goal'
    );
    await userEvent.type(
      await screen.findByLabelText('Project name'),
      'AI事例'
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Create article' })
    );
    expect(createProjectAction).toHaveBeenCalledWith({ name: 'AI事例' });
    expect(createPieceAction).toHaveBeenCalledWith({
      projectId: 'made',
      goal: 'Goal',
    });
    expect(push).toHaveBeenCalledWith('/admin/studio/pieces/new');
  });
});
