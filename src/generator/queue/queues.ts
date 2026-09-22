import type { PgBoss, Queue } from 'pg-boss';
import type { RunKind } from '../runs/run-types';

export const DEAD_LETTER_QUEUE = 'studio.dead';

export function queueForKind(kind: RunKind): string {
  return `studio.run.${kind}`;
}

export type QueueSettings = Omit<Queue, 'name'>;

/**
 * singleton + singletonKey (piece or source id) = one active job per piece.
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

/** Jobs of each kind processed at once by one worker instance. */
export const WORKER_CONCURRENCY: Record<RunKind, number> = {
  system_check: 1,
  ingest: 2,
};

/** Creates missing queues. Changing settings of an existing queue is a manual migration. */
export async function ensureQueues(
  boss: PgBoss,
  kinds: readonly RunKind[],
  settings: QueueSettings = RUN_QUEUE_SETTINGS
): Promise<void> {
  if (!(await boss.getQueue(DEAD_LETTER_QUEUE))) {
    await boss.createQueue(DEAD_LETTER_QUEUE, { retryLimit: 0 });
  }
  for (const kind of kinds) {
    const name = queueForKind(kind);
    if (!(await boss.getQueue(name))) await boss.createQueue(name, settings);
  }
}
