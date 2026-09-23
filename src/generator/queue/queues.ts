import type { PgBoss, Queue } from 'pg-boss';
import type { RunKind } from '../runs/run-types';

export const DEAD_LETTER_QUEUE = 'studio.dead';

export function queueForKind(kind: RunKind): string {
  return `studio.run.${kind}`;
}

export type QueueSettings = Omit<Queue, 'name'>;

/**
 * Singleton keys prevent duplicate execution of a run (or source ingest).
 * PostgreSQL separately enforces one active run per piece across all kinds.
 * A job that stops heartbeating or outlives expireInSeconds is retried, then
 * dead-lettered; the dead-letter handler marks its run failed.
 */
export const RUN_QUEUE_SETTINGS: QueueSettings = {
  policy: 'singleton',
  retryLimit: 2,
  retryDelay: 5,
  retryBackoff: true,
  expireInSeconds: 900,
  heartbeatSeconds: 60,
  deadLetter: DEAD_LETTER_QUEUE,
};

/**
 * Seconds a job may stay active before pg-boss retries it. A whole long write
 * or a large ingest can outlast the queue default; heartbeats still catch a
 * dead worker within a minute, so the longer limit only affects live work.
 */
export const JOB_EXPIRE_SECONDS: Record<RunKind, number> = {
  system_check: 900,
  ingest: 3600,
  outline: 900,
  write: 3600,
  rewrite_section: 900,
  translate: 900,
};

/** Jobs of each kind processed at once by one worker instance. */
export const WORKER_CONCURRENCY: Record<RunKind, number> = {
  system_check: 1,
  ingest: 2,
  outline: 2,
  write: 2,
  rewrite_section: 2,
  translate: 2,
};

/** The dead-letter handler only marks runs failed; retry it through a DB blip. */
export const DEAD_LETTER_SETTINGS: QueueSettings = {
  retryLimit: 3,
  retryDelay: 30,
};

/** Creates missing queues and brings existing ones to the current settings. */
export async function ensureQueues(
  boss: PgBoss,
  kinds: readonly RunKind[],
  settings: QueueSettings = RUN_QUEUE_SETTINGS
): Promise<void> {
  const ensure = async (name: string, options: QueueSettings) => {
    if (!(await boss.getQueue(name))) {
      await boss.createQueue(name, options);
      return;
    }
    // pg-boss rejects any update naming the policy or partitioning, even
    // unchanged; they are fixed at creation.
    const updatable = Object.fromEntries(
      Object.entries(options).filter(
        ([key]) => key !== 'policy' && key !== 'partition'
      )
    ) as QueueSettings;
    if (Object.keys(updatable).length > 0)
      await boss.updateQueue(name, updatable);
  };
  // Run queues reference the dead-letter queue, so it must exist first.
  await ensure(DEAD_LETTER_QUEUE, DEAD_LETTER_SETTINGS);
  for (const kind of kinds) await ensure(queueForKind(kind), settings);
}
