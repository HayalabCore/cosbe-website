import { fromPrisma, type PgBoss } from 'pg-boss';
import type { StudioRun } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { lockPiece } from '../pieces/piece-lock';

import { createRun, type CreateRunInput } from '../runs/runs-repository';
import type { RunJobData } from './job-data';
import { JOB_EXPIRE_SECONDS, queueForKind } from './queues';

export class PieceRunConflictError extends Error {
  constructor(readonly reason: 'BUSY' | 'LOCKED' | 'NOT_FOUND') {
    super(reason);
  }
}
/**
 * Creates the run row and its job in one transaction, so a run never exists
 * without a job (or a job without a run).
 */
export function createAndEnqueueRun(
  boss: PgBoss,
  input: CreateRunInput
): Promise<StudioRun> {
  return prisma.$transaction(async (tx) => {
    if (input.pieceId) {
      await lockPiece(tx, input.pieceId);
      const piece = await tx.studioPiece.findUnique({
        where: { id: input.pieceId },
      });
      if (!piece) throw new PieceRunConflictError('NOT_FOUND');
      // Checked under the lock: the web action's own check ran before it,
      // so a piece archived in between must not get a job.
      if (piece.stage === 'handed_off' || piece.archivedAt)
        throw new PieceRunConflictError('LOCKED');
      const active = await tx.studioRun.findFirst({
        where: {
          pieceId: input.pieceId,
          status: { in: ['queued', 'running'] },
        },
      });
      if (active) throw new PieceRunConflictError('BUSY');
    }
    const run = await createRun(tx, input);
    const data: RunJobData = { runId: run.id };
    const jobId = await boss.send(queueForKind(input.kind), data, {
      singletonKey: input.pieceId ? run.id : (input.sourceId ?? run.id),
      expireInSeconds: JOB_EXPIRE_SECONDS[input.kind],
      db: fromPrisma(tx),
    });
    if (!jobId) throw new Error(`The queue refused the job for run ${run.id}`);
    return run;
  });
}
