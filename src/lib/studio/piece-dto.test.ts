import { describe, expect, it } from 'vitest';
import { toActiveRunDTO } from './piece-dto';

describe('toActiveRunDTO', () => {
  it('exposes how many sections the write run will write', () => {
    const dto = toActiveRunDTO({
      id: 'r',
      kind: 'write',
      status: 'running',
      error: null,
      createdAt: new Date('2026-09-23T10:00:00Z'),
      steps: [{ key: 'prepare', status: 'succeeded', output: { targets: 5 } }],
    } as never);
    expect(dto?.targets).toBe(5);
    expect(dto?.steps).toEqual([{ key: 'prepare', status: 'succeeded' }]);
    // When it was queued, so the workspace can tell a worker that is not
    // picking jobs up from one that is simply busy.
    expect(dto?.createdAt).toBe('2026-09-23T10:00:00.000Z');
  });
});
