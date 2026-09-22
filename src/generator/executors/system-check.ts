import { hostname } from 'node:os';
import { prisma } from '@/lib/prisma';
import type { RunExecutor } from '../runs/run-handler';

/** Proves the worker is alive, reachable through the queue and can query the DB. */
export const systemCheckExecutor: RunExecutor = async ({ run, step }) => {
  await step('ping', 0, async () => {
    const [{ now }] = await prisma.$queryRaw<Array<{ now: Date }>>`
      SELECT now() AS now`;
    return {
      worker: process.env.STUDIO_WORKER_ID ?? hostname(),
      databaseTime: now.toISOString(),
      queuedMs: Date.now() - run.createdAt.getTime(),
    };
  });
};
