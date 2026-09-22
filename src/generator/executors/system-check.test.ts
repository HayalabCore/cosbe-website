import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(async () => [{ now: new Date('2026-09-22T00:00:05Z') }]),
  },
}));

import type { RunContext } from '../runs/run-handler';
import { systemCheckExecutor } from './system-check';

describe('systemCheckExecutor', () => {
  it('records worker, database time and queue latency in the ping step', async () => {
    const outputs: unknown[] = [];
    const ctx = {
      run: { createdAt: new Date(Date.now() - 1500) },
      signal: new AbortController().signal,
      step: vi.fn(async (_key, _ordinal, fn) => {
        const out = await fn();
        outputs.push(out);
        return out;
      }),
      recordUsage: vi.fn(),
    } as unknown as RunContext;

    await systemCheckExecutor(ctx);

    expect(ctx.step).toHaveBeenCalledWith('ping', 0, expect.any(Function));
    const out = outputs[0] as {
      worker: string;
      databaseTime: string;
      queuedMs: number;
    };
    expect(out.worker.length).toBeGreaterThan(0);
    expect(out.databaseTime).toBe('2026-09-22T00:00:05.000Z');
    expect(out.queuedMs).toBeGreaterThanOrEqual(1500);
  });
});
