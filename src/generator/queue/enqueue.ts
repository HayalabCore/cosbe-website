import { fromPrisma, type PgBoss } from 'pg-boss';
import type { StudioRun } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createRun, type CreateRunInput } from '../runs/runs-repository';
import type { RunJobData } from './job-data';
import { queueForKind } from './queues';

/**
 * Creates the run row and its job in one transaction, so a run never exists
 * without a job (or a job without a run).
 */
export function createAndEnqueueRun(
  boss: PgBoss,
  input: CreateRunInput
): Promise<StudioRun> {
  return prisma.$transaction(async (tx) => {
    const run = await createRun(tx, input);
    const data: RunJobData = { runId: run.id };
    const jobId = await boss.send(queueForKind(input.kind), data, {
      singletonKey: input.pieceId ?? input.sourceId ?? run.id,
      db: fromPrisma(tx),
    });
    if (!jobId) throw new Error(`The queue refused the job for run ${run.id}`);
    return run;
  });
}
