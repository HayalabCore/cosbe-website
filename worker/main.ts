import { PgBoss } from 'pg-boss';
import { RUN_EXECUTORS } from '@/generator/executors';
import {
  DEAD_LETTER_QUEUE,
  ensureQueues,
  queueForKind,
  WORKER_CONCURRENCY,
} from '@/generator/queue/queues';
import {
  createDeadLetterHandler,
  createRunHandler,
} from '@/generator/runs/run-handler';
import { RUN_KINDS } from '@/generator/runs/run-types';
import { prisma } from '@/lib/prisma';
import { loadWorkerEnv } from './env';
import { startHealthServer } from './health-server';

/**
 * Cloud Run kills the container 10 s after SIGTERM. Stopping within that lets
 * pg-boss fail the active jobs itself, so they retry at once (resuming from
 * their last finished step) instead of waiting for heartbeat expiry.
 */
const SHUTDOWN_TIMEOUT_MS = 8_000;

async function main(): Promise<void> {
  const env = loadWorkerEnv();
  const health = { ready: false, startedAt: new Date() };
  const server = startHealthServer(env.PORT, health);

  const boss = new PgBoss({
    connectionString: env.DIRECT_URL,
    max: 2,
    application_name: 'cosbe-studio-worker',
  });
  boss.on('error', (error) => console.error('[studio-worker] pg-boss', error));
  await boss.start();
  await ensureQueues(boss, RUN_KINDS);

  const handleRuns = createRunHandler(RUN_EXECUTORS);
  for (const kind of RUN_KINDS) {
    await boss.work(
      queueForKind(kind),
      { batchSize: 1, localConcurrency: WORKER_CONCURRENCY[kind] },
      handleRuns
    );
  }
  await boss.work(
    DEAD_LETTER_QUEUE,
    { batchSize: 1 },
    createDeadLetterHandler()
  );

  health.ready = true;
  console.log(
    `[studio-worker] ready on :${env.PORT} — ${RUN_KINDS.map(queueForKind).join(', ')}`
  );

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    health.ready = false;
    console.log(`[studio-worker] ${signal}: finishing active jobs`);
    await boss.stop({ graceful: true, timeout: SHUTDOWN_TIMEOUT_MS });
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    process.exit(0);
  };
  const onStop = (signal: string) => {
    void shutdown(signal).catch((error) => {
      console.error('[studio-worker] shutdown', error);
      process.exit(1);
    });
  };
  process.on('SIGTERM', () => onStop('SIGTERM'));
  process.on('SIGINT', () => onStop('SIGINT'));
}

main().catch((error) => {
  console.error('[studio-worker] failed to start', error);
  process.exit(1);
});
