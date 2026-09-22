import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

const uploadToSignedUrl = vi.fn(async () => ({ error: null }));
vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({
    storage: { from: () => ({ uploadToSignedUrl }) },
  }),
}));
vi.mock('@/actions/studio-sources', () => ({
  createTextSourceAction: vi.fn(async () => ({
    ok: true,
    data: { sourceId: 's1' },
  })),
  createArticleSourceAction: vi.fn(async () => ({
    ok: true,
    data: { sourceId: 's1' },
  })),
  listArticleChoicesAction: vi.fn(async () => ({
    ok: true,
    data: [{ id: 'a1', title: '記事A', category: 'notice' }],
  })),
  startPdfUploadAction: vi.fn(async () => ({
    ok: true,
    data: { sourceId: 's1', path: 'pdf/s1/a.pdf', token: 'tok' },
  })),
  finishPdfUploadAction: vi.fn(async () => ({ ok: true, data: undefined })),
}));

import {
  createArticleSourceAction,
  createTextSourceAction,
  finishPdfUploadAction,
  startPdfUploadAction,
} from '@/actions/studio-sources';
import AddSourceDialog from './AddSourceDialog';

describe('AddSourceDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds pasted text to the given project', async () => {
    const onAdded = vi.fn();
    renderAdmin(
      <AddSourceDialog projectId="p1" onClose={vi.fn()} onAdded={onAdded} />
    );
    await userEvent.type(screen.getByLabelText('Title'), 'メモ');
    await userEvent.type(screen.getByLabelText('Text'), '本文です');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(createTextSourceAction).toHaveBeenCalledWith({
      title: 'メモ',
      text: '本文です',
      projectId: 'p1',
    });
    expect(onAdded).toHaveBeenCalled();
  });

  it('adds a chosen article', async () => {
    renderAdmin(<AddSourceDialog onClose={vi.fn()} onAdded={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'CosBE article' }));
    await userEvent.click(await screen.findByRole('button', { name: /記事A/ }));
    expect(createArticleSourceAction).toHaveBeenCalledWith({
      articleId: 'a1',
      projectId: undefined,
    });
  });

  it('uploads a PDF with the signed token, then finishes', async () => {
    const onAdded = vi.fn();
    renderAdmin(<AddSourceDialog onClose={vi.fn()} onAdded={onAdded} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Upload PDF' }));
    const file = new File(['%PDF-1.4'], 'deck.pdf', {
      type: 'application/pdf',
    });
    await userEvent.upload(screen.getByLabelText('Upload PDF'), file);
    await waitFor(() =>
      expect(finishPdfUploadAction).toHaveBeenCalledWith('s1')
    );
    expect(startPdfUploadAction).toHaveBeenCalledWith({
      filename: 'deck.pdf',
      size: file.size,
      projectId: undefined,
    });
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      'pdf/s1/a.pdf',
      'tok',
      file,
      { contentType: 'application/pdf' }
    );
    expect(onAdded).toHaveBeenCalled();
  });

  it('reports a failed browser upload to the server so the source is not left pending', async () => {
    uploadToSignedUrl.mockResolvedValueOnce({
      error: { message: 'network' },
    } as never);
    vi.mocked(finishPdfUploadAction).mockResolvedValueOnce({
      ok: false,
      error: 'FAILED',
    });
    const onAdded = vi.fn();
    renderAdmin(<AddSourceDialog onClose={vi.fn()} onAdded={onAdded} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Upload PDF' }));
    await userEvent.upload(
      screen.getByLabelText('Upload PDF'),
      new File(['%PDF-1.4'], 'deck.pdf', { type: 'application/pdf' })
    );
    await waitFor(() =>
      expect(finishPdfUploadAction).toHaveBeenCalledWith('s1')
    );
    expect(
      await screen.findByText('Could not add the source.')
    ).toBeInTheDocument();
    expect(onAdded).not.toHaveBeenCalled();
  });
});
