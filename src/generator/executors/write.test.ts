import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../pieces/scope', () => ({
  buildScope: vi.fn(async () => ({ sourceIds: ['s'], charRanges: {} })),
  getChunks: vi.fn(async () => []),
}));
vi.mock('../retrieval/search', () => ({
  searchSources: vi.fn(async () => []),
}));

import { searchSources } from '../retrieval/search';
import { NonRetryableRunError } from '../runs/run-types';
import { chunksForSection } from './write';

const piece = { projectId: 'p', selection: { sourceIds: ['s'], chapters: {} } };
const row = (kind: 'source' | 'boilerplate') => ({
  id: 'o1',
  heading: '導入効果',
  intent: 'why',
  chunkIds: ['gone'],
  estChars: 100,
  kind,
  stale: false,
});

describe('chunksForSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses a source section whose planned passages left the scope', async () => {
    await expect(chunksForSection(piece, row('source'), {})).rejects.toThrow(
      NonRetryableRunError
    );
    await expect(chunksForSection(piece, row('source'), {})).rejects.toThrow(
      /導入効果/
    );
    expect(searchSources).not.toHaveBeenCalled();
  });

  it('lets a boilerplate section run without passages', async () => {
    expect(await chunksForSection(piece, row('boilerplate'), {})).toEqual([]);
  });
});
