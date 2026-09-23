import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/actions/studio-pieces', () => ({
  listPiecesAction: vi.fn(async () => ({
    ok: true,
    data: [{ id: 'p1', title: 'T', projectName: 'P', stage: 'handed_off', articleStatus: null, updatedAt: new Date().toISOString() }],
  })),
  createPieceAction: vi.fn(() => new Promise(() => {})),
}));
vi.mock('@/actions/studio-projects', () => ({
  listProjectsAction: vi.fn(async () => ({ ok: true, data: [{ id: 'pr', name: 'Proj' }] })),
}));

import { createPieceAction } from '@/actions/studio-pieces';
import PieceList from './PieceList';

describe('PieceList', () => {
  it('shows a handed-off piece whose post was deleted', async () => {
    renderAdmin(<PieceList />);
    expect(await screen.findByText(/Post deleted/)).toBeInTheDocument();
  });

  it('creates one piece however many times New is clicked', async () => {
    renderAdmin(<PieceList />);
    await userEvent.selectOptions(await screen.findByLabelText('Choose a project'), 'pr');
    const button = screen.getByRole('button', { name: 'New piece' });
    await userEvent.click(button);
    await userEvent.click(button);
    expect(createPieceAction).toHaveBeenCalledTimes(1);
  });
});
