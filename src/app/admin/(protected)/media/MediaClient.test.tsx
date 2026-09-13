import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';

const uploadToGallery = vi.fn();
vi.mock('@/lib/storage', () => ({
  uploadToGallery: (...a: unknown[]) => uploadToGallery(...a),
}));

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({}),
}));

const recordMediaAction = vi.fn();
const deleteMediaAction = vi.fn();
vi.mock('@/actions/media', () => ({
  recordMediaAction: (...a: unknown[]) => recordMediaAction(...a),
  deleteMediaAction: (...a: unknown[]) => deleteMediaAction(...a),
}));

vi.mock('next/image', () => ({
  default: (props: { alt?: string }) => <img alt={props.alt ?? ''} />,
}));

import AdminMediaPage from './MediaClient';

describe('AdminMediaPage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.confirm).mockReturnValue(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'm1',
              filename: 'pic.png',
              url: 'https://cdn.example/pic.png',
              size: 10,
              mimeType: 'image/png',
              alt: '',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 24,
          totalPages: 1,
        }),
      })
    );
    recordMediaAction.mockResolvedValue({
      id: 'm2',
      filename: 'new.png',
      url: 'https://cdn.example/new.png',
      size: 2,
      mimeType: 'image/png',
      alt: '',
      createdAt: new Date(),
    });
  });

  it('file input accepts images only', async () => {
    renderAdmin(<AdminMediaPage />);
    await waitFor(() =>
      expect(screen.getByText('pic.png')).toBeInTheDocument()
    );
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input.accept).toBe('image/*');
  });

  it('choosing a file calls uploadToGallery', async () => {
    uploadToGallery.mockResolvedValue({
      filename: 'new.png',
      url: 'https://cdn.example/new.png',
      size: 2,
      mimeType: 'image/png',
    });
    renderAdmin(<AdminMediaPage />);
    await waitFor(() =>
      expect(screen.getByText('pic.png')).toBeInTheDocument()
    );
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['x'], 'new.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(uploadToGallery).toHaveBeenCalled());
  });

  it('alerts when upload throws', async () => {
    uploadToGallery.mockRejectedValue(new Error('nope'));
    renderAdmin(<AdminMediaPage />);
    await waitFor(() =>
      expect(screen.getByText('pic.png')).toBeInTheDocument()
    );
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'new.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
  });

  it('delete confirm cancel does not call deleteMediaAction', async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValue(false);
    renderAdmin(<AdminMediaPage />);
    await waitFor(() =>
      expect(screen.getByText('pic.png')).toBeInTheDocument()
    );
    await user.click(screen.getByTitle('Delete'));
    expect(deleteMediaAction).not.toHaveBeenCalled();
  });

  it('debounces search fetches', async () => {
    vi.useFakeTimers();
    renderAdmin(<AdminMediaPage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();
    fireEvent.change(
      screen.getByPlaceholderText('Search by filename or URL…'),
      {
        target: { value: 'abc' },
      }
    );
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('hides delete without media.delete', async () => {
    renderAdmin(<AdminMediaPage />, { permissions: ['media.upload'] });
    await screen.findByText('pic.png');
    expect(screen.queryByTitle('Delete')).toBeNull();
  });
});
