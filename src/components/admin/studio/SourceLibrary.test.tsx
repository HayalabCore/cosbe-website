import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';
import type { SourceDTO } from '@/lib/studio/source-dto';

vi.mock('@/actions/studio-sources', () => ({
  listSourcesAction: vi.fn(),
  retryIngestAction: vi.fn(),
  deleteSourceAction: vi.fn(),
  createTextSourceAction: vi.fn(),
  createArticleSourceAction: vi.fn(),
  listArticleChoicesAction: vi.fn(async () => ({ ok: true, data: [] })),
  startPdfUploadAction: vi.fn(),
  finishPdfUploadAction: vi.fn(),
}));
vi.mock('@/actions/studio-projects', () => ({
  linkSourceAction: vi.fn(async () => ({ ok: true, data: undefined })),
}));

import {
  deleteSourceAction,
  listSourcesAction,
  retryIngestAction,
} from '@/actions/studio-sources';
import { linkSourceAction } from '@/actions/studio-projects';
import SourceLibrary from './SourceLibrary';

const source = (over: Partial<SourceDTO>): SourceDTO => ({
  id: 's1',
  kind: 'text',
  status: 'ready',
  error: null,
  title: 'メモ',
  language: 'ja',
  charCount: 1200,
  projectCount: 1,
  chunkCount: 2,
  createdAt: '2026-09-23T00:00:00.000Z',
  ...over,
});

describe('SourceLibrary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists sources with their status', async () => {
    vi.mocked(listSourcesAction).mockResolvedValue({
      ok: true,
      data: [
        source({}),
        source({ id: 's2', kind: 'pdf', status: 'stored', title: 'Deck' }),
      ],
    });
    renderAdmin(<SourceLibrary />);
    expect(await screen.findByText('メモ')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(
      screen.getByText('Stored — not used for generation yet')
    ).toBeInTheDocument();
  });

  it('offers retry for failed sources', async () => {
    vi.mocked(listSourcesAction).mockResolvedValue({
      ok: true,
      data: [source({ status: 'failed', error: 'boom' })],
    });
    vi.mocked(retryIngestAction).mockResolvedValue({
      ok: true,
      data: undefined,
    });
    renderAdmin(<SourceLibrary />);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(retryIngestAction).toHaveBeenCalledWith('s1');
  });

  it('explains when a linked source cannot be deleted', async () => {
    vi.mocked(listSourcesAction).mockResolvedValue({
      ok: true,
      data: [source({})],
    });
    vi.mocked(deleteSourceAction).mockResolvedValue({
      ok: false,
      error: 'LINKED',
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderAdmin(<SourceLibrary />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete' })
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Only users who can delete studio sources/)
      ).toBeInTheDocument()
    );
  });

  it('polls while a source is still being ingested', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.mocked(listSourcesAction).mockResolvedValue({
        ok: true,
        data: [source({ status: 'processing' })],
      });
      renderAdmin(<SourceLibrary />);
      expect(await screen.findByText('メモ')).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(3_500);
      await waitFor(() =>
        expect(vi.mocked(listSourcesAction).mock.calls.length).toBeGreaterThan(
          1
        )
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not keep polling for PDFs (only the browser changes their status)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.mocked(listSourcesAction).mockResolvedValue({
        ok: true,
        data: [source({ kind: 'pdf', status: 'pending', title: 'Deck' })],
      });
      renderAdmin(<SourceLibrary />);
      expect(await screen.findByText('Deck')).toBeInTheDocument();
      // act() flushes the re-render a poll would trigger before we count calls.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(listSourcesAction).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('links a library source into the current project', async () => {
    vi.mocked(listSourcesAction).mockResolvedValue({
      ok: true,
      data: [source({}), source({ id: 's2', title: 'Already linked' })],
    });
    renderAdmin(<SourceLibrary projectId="p1" linkedIds={['s2']} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Link' }));
    expect(linkSourceAction).toHaveBeenCalledWith('p1', 's1');
    expect(screen.getAllByRole('button', { name: 'Link' })).toHaveLength(1);
  });
});
