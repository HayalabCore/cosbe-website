import { beforeEach, describe, expect, it, vi } from 'vitest';

const bucket = {
  createSignedUploadUrl: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
};
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: () => ({ storage: { from: () => bucket } }),
}));

import {
  createPdfUploadUrl,
  pdfObjectExists,
  pdfStoragePath,
} from './source-storage';

describe('source storage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('builds a safe per-source path', () => {
    expect(pdfStoragePath('s1', '../My Deck (final).PDF')).toBe(
      'pdf/s1/my-deck-final.pdf'
    );
    expect(pdfStoragePath('s1', '資料.pdf')).toBe('pdf/s1/document.pdf');
  });

  it('returns the signed upload token', async () => {
    bucket.createSignedUploadUrl.mockResolvedValue({
      data: { path: 'p', token: 't' },
      error: null,
    });
    expect(await createPdfUploadUrl('p')).toEqual({ path: 'p', token: 't' });
  });

  it('throws when signing fails', async () => {
    bucket.createSignedUploadUrl.mockResolvedValue({
      data: null,
      error: { message: 'nope' },
    });
    await expect(createPdfUploadUrl('p')).rejects.toThrow('nope');
  });

  it('checks that the uploaded object exists', async () => {
    bucket.list.mockResolvedValue({
      data: [{ name: 'deck.pdf' }],
      error: null,
    });
    expect(await pdfObjectExists('pdf/s1/deck.pdf')).toBe(true);
    expect(bucket.list).toHaveBeenCalledWith('pdf/s1', { search: 'deck.pdf' });
    bucket.list.mockResolvedValue({ data: [], error: null });
    expect(await pdfObjectExists('pdf/s1/deck.pdf')).toBe(false);
  });
});
