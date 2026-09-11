import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn(),
}));

vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'ja'] },
}));

import { revalidatePath, revalidateTag } from 'next/cache';
import { articleSlugCacheTag } from '@/lib/articles-cache';
import { revalidateArticlePaths } from './article-revalidation';

describe('revalidateArticlePaths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates every given slug so a rename drops the old URL cache', () => {
    revalidateArticlePaths(['new-slug', 'old-slug'], 'useful-info');
    expect(revalidateTag).toHaveBeenCalledWith(
      articleSlugCacheTag('new-slug'),
      'default'
    );
    expect(revalidateTag).toHaveBeenCalledWith(
      articleSlugCacheTag('old-slug'),
      'default'
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      '/en/useful-column/old-slug',
      'page'
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      '/en/useful-column/new-slug',
      'page'
    );
  });
});
