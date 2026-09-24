import { describe, expect, it, vi } from 'vitest';

vi.mock('@/ai/generate', () => ({ embedTexts: vi.fn(async () => [[0]]) }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { embedTexts } from '@/ai/generate';
import { searchSources } from './search';

describe('searchSources', () => {
  it('does not pay for an embedding when the scope is empty', async () => {
    expect(
      await searchSources({ scope: { sourceIds: [] }, query: 'x' })
    ).toEqual([]);
    expect(embedTexts).not.toHaveBeenCalled();
  });
});
