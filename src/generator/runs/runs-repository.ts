import type { Prisma, StudioRun } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { lockPiece, withPieceLock } from '../pieces/piece-lock';
import { readPiece } from '../pieces/pieces-repository';
import { settledStage } from '../pieces/stages';
import { errorMessage, type RunKind } from './run-types';

export type Db = Prisma.TransactionClient | typeof prisma;

export type CreateRunInput = {
  kind: RunKind;
  createdById: string;
  input?: Prisma.InputJsonValue;
  pieceId?: string;
  sourceId?: string;
  tokenCeiling?: number | null;
};

export class TokenCeilingExceededError extends Error {
  readonly runId: string;
  readonly used: number;
  readonly ceiling: number;

  constructor(runId: string, used: number, ceiling: number) {
    // Shown to editors through the run error translation.
    super(`TOKEN_CEILING:${used}/${ceiling}`);
    this.name = 'TokenCeilingExceededError';
    this.runId = runId;
    this.used = used;
    this.ceiling = ceiling;
  }
}

export function createRun(db: Db, input: CreateRunInput): Promise<StudioRun> {
  return db.studioRun.create({
    data: {
      kind: input.kind,
      createdById: input.createdById,
      input: input.input ?? {},
      pieceId: input.pieceId ?? null,
      sourceId: input.sourceId ?? null,
      tokenCeiling: input.tokenCeiling ?? null,
    },
  });
}

export function getRun(id: string) {
  return prisma.studioRun.findUnique({
    where: { id },
    include: { steps: { orderBy: { ordinal: 'asc' } } },
  });
}

export type RunWithSteps = NonNullable<Awaited<ReturnType<typeof getRun>>>;

/** queued|running → running. False when the run was cancelled or already ended. */
export async function markRunStarted(id: string): Promise<boolean> {
  const { count } = await prisma.studioRun.updateMany({
    where: { id, status: { in: ['queued', 'running'] } },
    data: { status: 'running', error: null },
  });
  if (count === 0) return false;
  await prisma.studioRun.updateMany({
    where: { id, startedAt: null },
    data: { startedAt: new Date() },
  });
  return true;
}

/**
 * Called only after the executor returns. A cancel that lands in that gap has
 * already set `cancelled`; the finished work still counts as success.
 */
export async function markRunSucceeded(id: string): Promise<void> {
  await prisma.studioRun.updateMany({
    where: { id, status: { in: ['running', 'cancelled'] } },
    data: { status: 'succeeded', error: null, finishedAt: new Date() },
  });
}

/**
 * Also fails the run's source if it is still waiting on this run, so a source
 * never stays "processing" after its ingest run died (retries exhausted,
 * token ceiling, lost permission), and moves a piece out of the transient
 * stage the run left it in. The piece is locked before the run (lock order).
 */
export async function markRunFailed(id: string, error: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const run = await tx.studioRun.findUnique({
      where: { id },
      select: { sourceId: true, pieceId: true },
    });
    if (run?.pieceId) await lockPiece(tx, run.pieceId);
    const { count } = await tx.studioRun.updateMany({
      where: { id, status: { in: ['queued', 'running'] } },
      data: { status: 'failed', error, finishedAt: new Date() },
    });
    if (count === 0) return;
    if (run?.sourceId) {
      await tx.studioSource.updateMany({
        where: {
          id: run.sourceId,
          status: { in: ['pending', 'processing'] },
        },
        data: { status: 'failed', error },
      });
    }
    if (run?.pieceId) await settlePiece(tx, run.pieceId);
  });
}

/** Caller holds the piece lock. */
async function settlePiece(
  tx: Prisma.TransactionClient,
  pieceId: string
): Promise<void> {
  const row = await tx.studioPiece.findUnique({ where: { id: pieceId } });
  if (!row) return;
  const piece = readPiece(row);
  const stage = settledStage(piece);
  if (stage !== piece.stage) {
    await tx.studioPiece.update({ where: { id: pieceId }, data: { stage } });
  }
}

/** Remembers an attempt's error while pg-boss retries; the run stays running. */
export async function recordRunError(id: string, error: string): Promise<void> {
  await prisma.studioRun.updateMany({
    where: { id, status: 'running' },
    data: { error },
  });
}

/** Cancelling and restoring the stage shares the worker's piece lock. */
export async function cancelPieceRuns(pieceId: string): Promise<void> {
  await withPieceLock(pieceId, async (tx) => {
    const run = await tx.studioRun.findFirst({
      where: { pieceId, status: { in: ['queued', 'running'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!run) return;
    await cancelPieceRun(tx, pieceId, run.id);
  });
}

async function cancelPieceRun(
  tx: Prisma.TransactionClient,
  pieceId: string,
  runId: string
): Promise<boolean> {
  const { count } = await tx.studioRun.updateMany({
    where: { id: runId, status: { in: ['queued', 'running'] } },
    data: { status: 'cancelled', finishedAt: new Date() },
  });
  if (!count) return false;
  await settlePiece(tx, pieceId);
  return true;
}

export async function cancelRun(id: string): Promise<boolean> {
  const run = await prisma.studioRun.findUnique({
    where: { id },
    select: { pieceId: true },
  });
  if (run?.pieceId) {
    const pieceId = run.pieceId;
    return withPieceLock(pieceId, (tx) => cancelPieceRun(tx, pieceId, id));
  }
  const { count } = await prisma.studioRun.updateMany({
    where: { id, status: { in: ['queued', 'running'] } },
    data: { status: 'cancelled', finishedAt: new Date() },
  });
  return count === 1;
}

export async function isRunCancelled(id: string): Promise<boolean> {
  const run = await prisma.studioRun.findUnique({
    where: { id },
    select: { status: true },
  });
  return run?.status === 'cancelled';
}

/** Refuse a call whose estimate would pass the ceiling. Null ceilings are uncapped. */
export async function assertRunBudget(
  id: string,
  estimatedTokens: number
): Promise<void> {
  const run = await prisma.studioRun.findUnique({
    where: { id },
    select: { tokensIn: true, tokensOut: true, tokenCeiling: true },
  });
  if (!run || run.tokenCeiling === null) return;
  const projected = run.tokensIn + run.tokensOut + Math.max(0, estimatedTokens);
  if (projected > run.tokenCeiling) {
    throw new TokenCeilingExceededError(id, projected, run.tokenCeiling);
  }
}

/** Counts usage on the run and, when given, on the step that spent it. */
export async function addRunUsage(
  id: string,
  usage: { inputTokens: number; outputTokens: number },
  stepKey?: string
): Promise<void> {
  if (stepKey) {
    await prisma.studioRunStep.updateMany({
      where: { runId: id, key: stepKey },
      data: {
        tokensIn: { increment: usage.inputTokens },
        tokensOut: { increment: usage.outputTokens },
      },
    });
  }
  const run = await prisma.studioRun.update({
    where: { id },
    data: {
      tokensIn: { increment: usage.inputTokens },
      tokensOut: { increment: usage.outputTokens },
    },
    select: { tokensIn: true, tokensOut: true, tokenCeiling: true },
  });
  const used = run.tokensIn + run.tokensOut;
  if (run.tokenCeiling !== null && used > run.tokenCeiling) {
    throw new TokenCeilingExceededError(id, used, run.tokenCeiling);
  }
}

/**
 * Executes one resumable step. A step that already succeeded returns its stored
 * output without running `fn` again, so a retried job resumes where it failed.
 */
export async function runStep<T extends Prisma.InputJsonValue>(
  runId: string,
  step: { key: string; ordinal: number; promptVersion?: string },
  fn: () => Promise<T>
): Promise<T> {
  const where = { runId_key: { runId, key: step.key } };
  const existing = await prisma.studioRunStep.findUnique({ where });
  if (existing?.status === 'succeeded') return existing.output as T;

  await prisma.studioRunStep.upsert({
    where,
    create: {
      runId,
      key: step.key,
      ordinal: step.ordinal,
      status: 'running',
      attempts: 1,
      promptVersion: step.promptVersion ?? null,
      startedAt: new Date(),
    },
    update: {
      status: 'running',
      promptVersion: step.promptVersion ?? null,
      error: null,
      attempts: { increment: 1 },
      startedAt: new Date(),
      finishedAt: null,
    },
  });

  try {
    const output = await fn();
    await prisma.studioRunStep.update({
      where,
      data: { status: 'succeeded', output, finishedAt: new Date() },
    });
    return output;
  } catch (error) {
    await prisma.studioRunStep.update({
      where,
      data: {
        status: 'failed',
        error: errorMessage(error),
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}
