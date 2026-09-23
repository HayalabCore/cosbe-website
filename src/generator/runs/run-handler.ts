import type { Prisma } from '@prisma/client';
import type { Job } from 'pg-boss';
import { APICallError } from 'ai';
import type { TokenUsage } from '@/ai/generate';
import { actorHasPermission } from '../authz';
import { runJobDataSchema } from '../queue/job-data';
import {
  addRunUsage,
  assertRunBudget,
  getRun,
  isRunCancelled,
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
    fn: () => Promise<T>,
    opts?: { promptVersion?: string }
  ): Promise<T>;
  recordUsage(usage: TokenUsage): Promise<void>;
  ensureBudget(estimatedTokens: number): Promise<void>;
};

export type RunExecutor = (ctx: RunContext) => Promise<void>;
export type RunExecutors = Partial<Record<RunKind, RunExecutor>>;

/**
 * One job = one run. Returning completes the job; throwing makes pg-boss retry
 * it (and dead-letter it after the last retry).
 */
const CANCEL_POLL_MS = 2_000;

/**
 * A provider rejection the SDK marks non-retryable (bad request, invalid
 * schema, wrong API key) fails the same way on every attempt; retrying only
 * delays the error the editor needs to see.
 */
function isPermanentProviderError(error: unknown): boolean {
  return APICallError.isInstance(error) && !error.isRetryable;
}

export async function handleRunJob(
  job: Job<unknown>,
  executors: RunExecutors
): Promise<void> {
  const parsed = runJobDataSchema.safeParse(job.data);
  if (!parsed.success) return;
  const { runId } = parsed.data;
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

  const cancellation = new AbortController();
  const signal = AbortSignal.any([job.signal, cancellation.signal]);
  // Skips a tick while the previous check is still waiting on the small pool.
  let checking = false;
  const watch = setInterval(() => {
    if (checking) return;
    checking = true;
    void isRunCancelled(runId)
      .then((cancelled) => {
        if (cancelled) cancellation.abort();
      })
      .catch(() => {})
      .finally(() => {
        checking = false;
      });
  }, CANCEL_POLL_MS);

  // Steps of one run execute one at a time, so usage belongs to this step.
  let currentStep: string | undefined;
  try {
    await executor({
      run,
      signal,
      step: async (key, ordinal, fn, opts) => {
        currentStep = key;
        try {
          return await runStep(
            runId,
            { key, ordinal, promptVersion: opts?.promptVersion },
            fn
          );
        } finally {
          currentStep = undefined;
        }
      },
      recordUsage: (usage) => addRunUsage(runId, usage, currentStep),
      ensureBudget: (estimated) => assertRunBudget(runId, estimated),
    });
    await markRunSucceeded(runId);
  } catch (error) {
    if (cancellation.signal.aborted || (await isRunCancelled(runId))) return;
    if (
      error instanceof NonRetryableRunError ||
      error instanceof TokenCeilingExceededError ||
      isPermanentProviderError(error)
    ) {
      await markRunFailed(runId, errorMessage(error));
      return;
    }
    await recordRunError(runId, errorMessage(error));
    throw error;
  } finally {
    clearInterval(watch);
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
