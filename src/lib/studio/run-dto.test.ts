import { describe, expect, it } from 'vitest';
import type { RunWithSteps } from '@/generator/runs/runs-repository';
import { toRunStatusDTO } from './run-dto';

describe('toRunStatusDTO', () => {
  it('serializes dates and keeps only UI fields', () => {
    const run = {
      id: 'r1',
      kind: 'system_check',
      status: 'succeeded',
      error: null,
      createdAt: new Date('2026-09-22T00:00:00Z'),
      startedAt: new Date('2026-09-22T00:00:01Z'),
      finishedAt: null,
      tokensIn: 5,
      steps: [
        {
          key: 'ping',
          status: 'succeeded',
          output: { worker: 'w1' },
          error: null,
          attempts: 1,
        },
      ],
    } as unknown as RunWithSteps;
    expect(toRunStatusDTO(run)).toEqual({
      id: 'r1',
      kind: 'system_check',
      status: 'succeeded',
      error: null,
      createdAt: '2026-09-22T00:00:00.000Z',
      startedAt: '2026-09-22T00:00:01.000Z',
      finishedAt: null,
      steps: [
        {
          key: 'ping',
          status: 'succeeded',
          output: { worker: 'w1' },
          error: null,
        },
      ],
    });
  });
});
