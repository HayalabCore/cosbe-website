import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { NonRetryableRunError } from '../runs/run-types';

/** Always acquire the piece lock before a run lock. Never hold it across AI calls. */
export async function lockPiece(
  tx: Prisma.TransactionClient,
  id: string
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM studio_pieces WHERE id = ${id}::uuid FOR UPDATE`;
}

export async function withPieceLock<T>(
  id: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await lockPiece(tx, id);
    return fn(tx);
  });
}

/** Fences every worker write against cancellation, completion and handoff. */
export async function writePiece<T>(
  id: string,
  runId: string | undefined,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  db?: Prisma.TransactionClient
): Promise<T> {
  const write = async (tx: Prisma.TransactionClient) => {
    await lockPiece(tx, id);
    if (runId) {
      const runs = await tx.$queryRaw<
        Array<{ status: string; piece_id: string | null }>
      >`
        SELECT status, piece_id FROM studio_runs WHERE id = ${runId}::uuid FOR UPDATE
      `;
      const run = runs[0];
      const piece = await tx.studioPiece.findUnique({
        where: { id },
        select: { stage: true },
      });
      if (
        !run ||
        run.piece_id !== id ||
        !['queued', 'running'].includes(run.status) ||
        !piece ||
        piece.stage === 'handed_off'
      ) {
        throw new NonRetryableRunError(
          'The run is no longer allowed to modify this piece.'
        );
      }
    }
    return fn(tx);
  };
  return db ? write(db) : prisma.$transaction(write);
}
