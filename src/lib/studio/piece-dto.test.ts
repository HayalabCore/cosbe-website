import { describe, expect, it } from 'vitest';
import { toActiveRunDTO } from './piece-dto';

describe('toActiveRunDTO', () => {
  it('exposes how many sections the write run will write', () => {
    const dto = toActiveRunDTO({
      id: 'r', kind: 'write', status: 'running', error: null,
      steps: [{ key: 'prepare', status: 'succeeded', output: { targets: 5 } }],
    } as never);
    expect(dto?.targets).toBe(5);
    expect(dto?.steps).toEqual([{ key: 'prepare', status: 'succeeded' }]);
  });
});
