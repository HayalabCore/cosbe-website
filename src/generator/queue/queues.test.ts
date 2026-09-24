import { describe, expect, it, vi } from 'vitest';
import type { PgBoss } from 'pg-boss';
import {
  DEAD_LETTER_QUEUE,
  ensureQueues,
  queueForKind,
  RUN_QUEUE_SETTINGS,
} from './queues';
import { runJobDataSchema } from './job-data';

function fakeBoss(existing: string[]) {
  return {
    getQueue: vi.fn(async (name: string) =>
      existing.includes(name) ? { name } : null
    ),
    createQueue: vi.fn<(name: string, options?: unknown) => Promise<void>>(
      async () => undefined
    ),
    updateQueue: vi.fn<(name: string, options?: unknown) => Promise<void>>(
      async () => undefined
    ),
  };
}

describe('studio queues', () => {
  it('names one queue per run kind', () => {
    expect(queueForKind('system_check')).toBe('studio.run.system_check');
  });

  it('dead-letters run jobs and enforces heartbeats', () => {
    expect(RUN_QUEUE_SETTINGS.deadLetter).toBe(DEAD_LETTER_QUEUE);
    expect(RUN_QUEUE_SETTINGS.heartbeatSeconds).toBeGreaterThanOrEqual(10);
    expect(RUN_QUEUE_SETTINGS.policy).toBe('singleton');
  });

  it('creates the dead-letter queue first, then missing run queues', async () => {
    const boss = fakeBoss([]);
    await ensureQueues(boss as unknown as PgBoss, ['system_check']);
    expect(boss.createQueue.mock.calls.map((c) => c[0])).toEqual([
      DEAD_LETTER_QUEUE,
      'studio.run.system_check',
    ]);
    expect(boss.createQueue.mock.calls[1][1]).toEqual(RUN_QUEUE_SETTINGS);
  });

  it('brings existing queues up to the current settings', async () => {
    const boss = fakeBoss([DEAD_LETTER_QUEUE, 'studio.run.system_check']);
    await ensureQueues(boss as unknown as PgBoss, ['system_check']);
    expect(boss.createQueue).not.toHaveBeenCalled();
    // pg-boss refuses any update that names the policy, even unchanged.
    const updated = boss.updateQueue.mock.calls.find(
      (c) => c[0] === 'studio.run.system_check'
    )?.[1] as Record<string, unknown>;
    expect(updated).not.toHaveProperty('policy');
    expect(updated).toMatchObject({
      retryLimit: RUN_QUEUE_SETTINGS.retryLimit,
    });
  });

  it('retries the dead-letter handler so a run is never left running', async () => {
    const boss = fakeBoss([]);
    await ensureQueues(boss as unknown as PgBoss, []);
    expect(boss.createQueue.mock.calls[0][1]).toMatchObject({
      retryLimit: 3,
    });
  });

  it('accepts only a uuid runId as job data', () => {
    expect(
      runJobDataSchema.safeParse({
        runId: '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e',
      }).success
    ).toBe(true);
    expect(runJobDataSchema.safeParse({ runId: 'nope' }).success).toBe(false);
    expect(runJobDataSchema.safeParse({}).success).toBe(false);
  });
});
