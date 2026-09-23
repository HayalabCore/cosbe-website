import { screen, within } from '@testing-library/react';
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
        archived: false,
      },
      {
        id: 'p3',
        title: 'Old',
        projectName: 'P',
        stage: 'handed_off',
        articleStatus: 'published',
        updatedAt: new Date().toISOString(),
        archived: true,
      },
    ],
  })),
  createPieceAction: vi.fn(async () => ({
    ok: true,
    data: { pieceId: 'new' },
  })),
  archivePieceAction: vi.fn(async () => ({ ok: true, data: undefined })),
  restorePieceAction: vi.fn(async () => ({ ok: true, data: undefined })),
  deletePieceAction: vi.fn(async () => ({ ok: true, data: undefined })),
  changePiecesAction: vi.fn(async () => ({
    ok: true,
    data: { done: 1, busy: 0, failed: 0 },
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

import {
  archivePieceAction,
  changePiecesAction,
  createPieceAction,
  deletePieceAction,
  listPiecesAction,
  restorePieceAction,
} from '@/actions/studio-pieces';
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

  it('creates one article in the chosen topic and category however often Create is clicked', async () => {
    vi.mocked(createPieceAction).mockImplementationOnce(
      () => new Promise(() => {})
    );
    renderAdmin(<PieceList />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'New article' })
    );
    await screen.findByRole('option', { name: 'Proj' });
    expect(screen.queryByLabelText('What should this article do?')).toBeNull();
    await userEvent.click(screen.getByRole('radio', { name: 'Case study' }));
    const create = screen.getByRole('button', { name: 'Create article' });
    await userEvent.click(create);
    await userEvent.click(create);
    expect(createPieceAction).toHaveBeenCalledTimes(1);
    expect(createPieceAction).toHaveBeenCalledWith({
      projectId: 'pr',
      category: 'case-study',
    });
  });

  it('creates a topic on the way when there is none yet', async () => {
    vi.mocked(listProjectsAction).mockResolvedValueOnce({ ok: true, data: [] });
    renderAdmin(<PieceList />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'New article' })
    );
    const create = screen.getByRole('button', { name: 'Create article' });
    expect(create).toBeDisabled();
    await userEvent.type(await screen.findByLabelText('Topic name'), 'AI事例');
    await userEvent.click(create);
    expect(createProjectAction).toHaveBeenCalledWith({ name: 'AI事例' });
    expect(createPieceAction).toHaveBeenCalledWith({
      projectId: 'made',
      category: 'useful-info',
    });
    expect(push).toHaveBeenCalledWith('/admin/studio/pieces/new');
  });
  it('keeps archived articles out of the list until asked for', async () => {
    renderAdmin(<PieceList />);
    expect(await screen.findByText('Draft one')).toBeInTheDocument();
    expect(screen.queryByText('Old')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Archived/ }));
    expect(screen.getByText('Old')).toBeInTheDocument();
    expect(screen.queryByText('Draft one')).toBeNull();
  });

  it('archives and restores from the row', async () => {
    renderAdmin(<PieceList />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Archive “Draft one”' })
    );
    expect(archivePieceAction).toHaveBeenCalledWith('p2');
    await userEvent.click(screen.getByRole('button', { name: /Archived/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Restore “Old”' })
    );
    expect(restorePieceAction).toHaveBeenCalledWith('p3');
  });

  it('asks before deleting, and says the post is not affected', async () => {
    renderAdmin(<PieceList />);
    await userEvent.click(
      await screen.findByRole('button', { name: /Archived/ })
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete “Old” permanently' })
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(
        'The post it created in All Posts is not affected.'
      )
    ).toBeInTheDocument();
    expect(deletePieceAction).not.toHaveBeenCalled();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Delete permanently' })
    );
    expect(deletePieceAction).toHaveBeenCalledWith('p3');
  });
  it('archives the selected articles together from the bulk bar', async () => {
    renderAdmin(<PieceList />);
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Select “T”' })
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select “Draft one”' })
    );
    const bar = screen.getByRole('toolbar');
    expect(within(bar).getByText('2 selected')).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole('button', { name: 'Archive' }));
    expect(changePiecesAction).toHaveBeenCalledWith('archive', ['p1', 'p2']);
    // The selection is spent once the action ran.
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('selects everything shown, then deletes only after confirming', async () => {
    renderAdmin(<PieceList />);
    await userEvent.click(
      await screen.findByRole('button', { name: /Archived/ })
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    await userEvent.click(
      within(screen.getByRole('toolbar')).getByRole('button', {
        name: 'Delete permanently',
      })
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(
        'Posts they created in All Posts are not affected.'
      )
    ).toBeInTheDocument();
    expect(changePiecesAction).not.toHaveBeenCalled();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Delete permanently' })
    );
    expect(changePiecesAction).toHaveBeenCalledWith('delete', ['p3']);
  });

  it('says which articles a running job kept', async () => {
    vi.mocked(changePiecesAction).mockResolvedValueOnce({
      ok: true,
      data: { done: 1, busy: 1, failed: 0 },
    });
    renderAdmin(<PieceList />);
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Select all' })
    );
    await userEvent.click(
      within(screen.getByRole('toolbar')).getByRole('button', {
        name: 'Archive',
      })
    );
    expect(
      await screen.findByText('1 article was skipped because a job is running.')
    ).toBeInTheDocument();
  });

  it('starts the selection over when the view changes', async () => {
    renderAdmin(<PieceList />);
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Select “T”' })
    );
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /In progress/ }));
    expect(screen.queryByRole('toolbar')).toBeNull();
  });
});
