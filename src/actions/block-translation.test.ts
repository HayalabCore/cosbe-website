import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, unauth } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));

const translateArticleMetaParts = vi.fn();
const translateBlockPayload = vi.fn();
const translateBlocksWithConcurrency = vi.fn();

vi.mock('@/lib/block-translation-server', () => ({
  translateArticleMetaParts: (...a: unknown[]) =>
    translateArticleMetaParts(...a),
  translateBlockPayload: (...a: unknown[]) => translateBlockPayload(...a),
  translateBlocksWithConcurrency: (...a: unknown[]) =>
    translateBlocksWithConcurrency(...a),
}));

import {
  translateArticleEnAction,
  translateArticleMetaEnAction,
  translateBlockEnAction,
} from './block-translation';

describe('block-translation actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  it('throws Unauthorized when logged out', async () => {
    unauth();
    await expect(
      translateBlockEnAction({ type: 'heading', content: 'H' })
    ).rejects.toThrow('Unauthorized');
    await expect(translateArticleMetaEnAction({ title: 'T' })).rejects.toThrow(
      'Unauthorized'
    );
    await expect(
      translateArticleEnAction({ title: 'T', blocks: [] })
    ).rejects.toThrow('Unauthorized');
  });

  it('collects meta errors as __meta__ without throwing', async () => {
    translateArticleMetaParts.mockRejectedValue(new Error('meta-fail'));
    translateBlocksWithConcurrency.mockResolvedValue({
      blocks: [],
      errors: [],
    });
    const result = await translateArticleEnAction({
      title: 'Hello',
      blocks: [],
    });
    expect(result.errors).toEqual([
      { blockId: '__meta__', message: 'meta-fail' },
    ]);
  });

  it('translation actions are Forbidden without articles.edit', async () => {
    authed(['dashboard.view']);
    await expect(
      translateArticleMetaEnAction({ title: 'タイトル' })
    ).rejects.toThrow('Forbidden');
  });
});
