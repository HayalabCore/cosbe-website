import { act, screen, waitFor, within } from '@testing-library/react';
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
    expect(screen.getByText('Stored, not used yet')).toBeInTheDocument();
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

  it('offers retry for a PDF upload that never finished', async () => {
    vi.mocked(listSourcesAction).mockResolvedValue({
      ok: true,
      data: [
        source({
          kind: 'pdf',
          status: 'pending',
          createdAt: new Date(Date.now() - 20 * 60_000).toISOString(),
        }),
        source({
          id: 's2',
          kind: 'pdf',
          status: 'pending',
          createdAt: new Date().toISOString(),
        }),
      ],
    });
    renderAdmin(<SourceLibrary />);
    expect(
      await screen.findAllByRole('button', { name: 'Retry' })
    ).toHaveLength(1);
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
    renderAdmin(<SourceLibrary />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete' })
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Delete' })
    );
    await waitFor(() =>
      expect(
        screen.getByText(/users who can delete studio sources/)
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
    // Already-linked sources are not offered again, and nothing can be deleted here.
    expect(await screen.findAllByRole('button', { name: 'Add' })).toHaveLength(
      1
    );
    expect(screen.queryByText('Already linked')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(linkSourceAction).toHaveBeenCalledWith('p1', 's1');
  });
});
