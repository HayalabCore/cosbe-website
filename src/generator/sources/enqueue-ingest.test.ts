import { describe, expect, it, vi } from 'vitest';

vi.mock('../queue/enqueue', () => ({
  createAndEnqueueRun: vi.fn(async () => ({ id: 'run' })),
}));

import { createAndEnqueueRun } from '../queue/enqueue';
import { enqueueIngest } from './enqueue-ingest';

describe('enqueueIngest', () => {
  it('gives the ingest run a token ceiling', async () => {
    await enqueueIngest({} as never, 'source-1', 'user-1');
    expect(createAndEnqueueRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        kind: 'ingest',
        sourceId: 'source-1',
        createdById: 'user-1',
        tokenCeiling: expect.any(Number),
      })
    );
  });
});
