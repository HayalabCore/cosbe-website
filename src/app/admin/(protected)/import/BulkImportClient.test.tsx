import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';
import type { ImportPreviewPayload } from '@/lib/legacy-import/types';

const previewImportAction = vi.fn();
vi.mock('@/actions/legacy-import', () => ({
  previewImportAction: (...a: unknown[]) => previewImportAction(...a),
  commitImportAction: vi.fn(),
  checkImportSlugAction: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

import BulkImportClient from './BulkImportClient';

const okPayload: ImportPreviewPayload = {
  sourceUrl: 'https://www.jp.cosbe.inc/useful-info/ok/',
  category: 'useful-info',
  slug: 'ok',
  slugCollision: false,
  title: 'OK title',
  excerpt: '',
  featuredImageRemoteUrl: null,
  publishedAt: '2026-01-01T00:00:00.000Z',
  tags: [],
  blocks: [],
  warnings: [],
};

describe('BulkImportClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('keeps a successful row when a sibling extract fails', async () => {
    const user = userEvent.setup();
    previewImportAction.mockImplementation(async (url: string) => {
      if (url.includes('/fail/')) throw new Error('extract-boom');
      return okPayload;
    });
    renderAdmin(<BulkImportClient recentImports={[]} />);
    await user.type(
      screen.getByPlaceholderText(/www.jp.cosbe.inc/),
      'https://www.jp.cosbe.inc/useful-info/ok/\nhttps://www.jp.cosbe.inc/useful-info/fail/'
    );
    await user.click(
      screen.getByRole('button', { name: 'Extract 2 articles' })
    );
    await waitFor(() =>
      expect(screen.getByText('extract-boom')).toBeInTheDocument()
    );
    expect(screen.getByText('OK title')).toBeInTheDocument();
  });
});
