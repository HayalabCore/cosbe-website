import type { Prisma } from '@prisma/client';
import type { Job } from 'pg-boss';
import type { TokenUsage } from '@/ai/generate';
import { actorHasPermission } from '../authz';
import { runJobDataSchema } from '../queue/job-data';
import {
  addRunUsage,
  getRun,
  markRunFailed,
  markRunStarted,
  markRunSucceeded,
  recordRunError,
  runStep,
  TokenCeilingExceededError,
  type RunWithSteps,
} from './runs-repository';
import {
  errorMessage,
  isRunKind,
  isTerminalRunStatus,
  NonRetryableRunError,
  RUN_KIND_PERMISSION,
  type RunKind,
} from './run-types';

export type RunContext = {
  run: RunWithSteps;
  signal: AbortSignal;
  step<T extends Prisma.InputJsonValue>(
    key: string,
    ordinal: number,
    fn: () => Promise<T>
  ): Promise<T>;
  recordUsage(usage: TokenUsage): Promise<void>;
};

export type RunExecutor = (ctx: RunContext) => Promise<void>;
export type RunExecutors = Partial<Record<RunKind, RunExecutor>>;

/**
 * One job = one run. Returning completes the job; throwing makes pg-boss retry
 * it (and dead-letter it after the last retry).
 */
export async function handleRunJob(
  job: Job<unknown>,
  executors: RunExecutors
): Promise<void> {
  const { runId } = runJobDataSchema.parse(job.data);
  const run = await getRun(runId);
  if (!run || isTerminalRunStatus(run.status)) return;

  if (!isRunKind(run.kind)) {
    await markRunFailed(runId, `Unknown run kind "${run.kind}"`);
    return;
  }
  const executor = executors[run.kind];
  if (!executor) {
    await markRunFailed(runId, `No executor registered for "${run.kind}"`);
    return;
  }
  if (
    !(await actorHasPermission(run.createdById, RUN_KIND_PERMISSION[run.kind]))
  ) {
    await markRunFailed(runId, 'FORBIDDEN');
    return;
  }
  if (!(await markRunStarted(runId))) return;

  try {
    await executor({
      run,
      signal: job.signal,
      step: (key, ordinal, fn) => runStep(runId, { key, ordinal }, fn),
      recordUsage: (usage) => addRunUsage(runId, usage),
    });
    await markRunSucceeded(runId);
  } catch (error) {
    if (
      error instanceof NonRetryableRunError ||
      error instanceof TokenCeilingExceededError
    ) {
      await markRunFailed(runId, errorMessage(error));
      return;
    }
    await recordRunError(runId, errorMessage(error));
    throw error;
  }
}

export function createRunHandler(executors: RunExecutors) {
  return async (jobs: Job<unknown>[]): Promise<void> => {
    for (const job of jobs) await handleRunJob(job, executors);
  };
}

/** Jobs land here after their last retry (or after expiring / missing heartbeats). */
export function createDeadLetterHandler() {
  return async (jobs: Job<unknown>[]): Promise<void> => {
    for (const job of jobs) {
      const parsed = runJobDataSchema.safeParse(job.data);
      if (!parsed.success) continue;
      const run = await getRun(parsed.data.runId);
      await markRunFailed(
        parsed.data.runId,
        run?.error ?? 'The job failed after all retries.'
      );
    }
  };
}
