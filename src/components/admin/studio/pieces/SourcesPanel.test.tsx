import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

vi.mock('@/actions/studio-pieces', () => ({
  listPieceChoicesAction: vi.fn(),
  updatePieceSetupAction: vi.fn(async () => ({ ok: true, data: undefined })),
}));

import {
  listPieceChoicesAction,
  updatePieceSetupAction,
} from '@/actions/studio-pieces';
import SourcesPanel from './SourcesPanel';

const choices = (sources: unknown[]) =>
  vi.mocked(listPieceChoicesAction).mockResolvedValue({
    ok: true,
    data: { sources, templates: [], authors: [] },
  } as never);

const piece = (selection: unknown) => ({ id: 'p1', selection }) as never;

describe('SourcesPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not send back a selected source that is no longer linked', async () => {
    choices([{ id: 'a', title: 'A', status: 'ready', kind: 'text', chapters: [] }]);
    renderAdmin(
      <SourcesPanel
        piece={piece({ sourceIds: ['a', 'gone'], chapters: {} })}
        busy={false}
        refresh={vi.fn(async () => {})}
      />
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to brief' }));
    expect(updatePieceSetupAction).toHaveBeenCalledWith('p1', {
      selection: { sourceIds: ['a'], chapters: {} },
    });
  });

  it('deselects a source when its last chapter is unticked', async () => {
    choices([
      { id: 'a', title: 'A', status: 'ready', kind: 'text', chapters: [{ title: 'Only' }] },
    ]);
    renderAdmin(
      <SourcesPanel
        piece={piece({ sourceIds: ['a'], chapters: {} })}
        busy={false}
        refresh={vi.fn(async () => {})}
      />
    );
    await userEvent.click(await screen.findByLabelText('Only'));
    expect(screen.getByLabelText('A')).not.toBeChecked();
  });

  it('shows why a save failed', async () => {
    choices([{ id: 'a', title: 'A', status: 'ready', kind: 'text', chapters: [] }]);
    vi.mocked(updatePieceSetupAction).mockResolvedValueOnce({
      ok: false,
      error: 'BUSY',
    });
    renderAdmin(
      <SourcesPanel
        piece={piece({ sourceIds: ['a'], chapters: {} })}
        busy={false}
        refresh={vi.fn(async () => {})}
      />
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to brief' }));
    await waitFor(() =>
      expect(screen.getByText('Wait for the current step to finish.')).toBeInTheDocument()
    );
  });

  it('recovers when saving throws and sends one request per double click', async () => {
    choices([{ id: 'a', title: 'A', status: 'ready', kind: 'text', chapters: [] }]);
    let reject!: (e: Error) => void;
    vi.mocked(updatePieceSetupAction).mockImplementationOnce(
      () => new Promise((_, r) => { reject = r; })
    );
    renderAdmin(
      <SourcesPanel piece={piece({ sourceIds: ['a'], chapters: {} })} busy={false} refresh={vi.fn(async () => {})} />
    );
    const button = await screen.findByRole('button', { name: 'Continue to brief' });
    await userEvent.click(button);
    await userEvent.click(button);
    expect(updatePieceSetupAction).toHaveBeenCalledTimes(1);
    reject(new Error('network'));
    expect(await screen.findByText('Something went wrong. Try again.')).toBeInTheDocument();
    expect(button).toBeEnabled();
  });
});
