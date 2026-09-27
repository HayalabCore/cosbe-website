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

/** Progress lines for the worker's terminal; the database stays the record. */
export type RunLogger = {
  info(message: string): void;
  error(message: string): void;
};

const silentLogger: RunLogger = { info() {}, error() {} };

function seconds(since: number): string {
  return `${((Date.now() - since) / 1000).toFixed(1)}s`;
}

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
  executors: RunExecutors,
  log: RunLogger = silentLogger
): Promise<void> {
  const parsed = runJobDataSchema.safeParse(job.data);
  if (!parsed.success) return;
  const { runId } = parsed.data;
  const run = await getRun(runId);
  if (!run || isTerminalRunStatus(run.status)) return;
  const label = `${run.kind} ${runId.slice(0, 8)}`;
  const fail = async (message: string) => {
    await markRunFailed(runId, message);
    log.error(`${label} failed: ${message}`);
  };

  if (!isRunKind(run.kind)) {
    await fail(`Unknown run kind "${run.kind}"`);
    return;
  }
  const executor = executors[run.kind];
  if (!executor) {
    await fail(`No executor registered for "${run.kind}"`);
    return;
  }
  if (
    !(await actorHasPermission(run.createdById, RUN_KIND_PERMISSION[run.kind]))
  ) {
    await fail('FORBIDDEN');
    return;
  }
  if (!(await markRunStarted(runId))) return;
  const startedAt = Date.now();
  log.info(`${label} started`);

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
        const stepStartedAt = Date.now();
        try {
          const result = await runStep(
            runId,
            { key, ordinal, promptVersion: opts?.promptVersion },
            fn
          );
          log.info(`${label} step ${key} done in ${seconds(stepStartedAt)}`);
          return result;
        } finally {
          currentStep = undefined;
        }
      },
      recordUsage: (usage) => addRunUsage(runId, usage, currentStep),
      ensureBudget: (estimated) => assertRunBudget(runId, estimated),
    });
    await markRunSucceeded(runId);
    log.info(`${label} succeeded in ${seconds(startedAt)}`);
  } catch (error) {
    if (cancellation.signal.aborted || (await isRunCancelled(runId))) {
      log.info(`${label} cancelled after ${seconds(startedAt)}`);
      return;
    }
    if (
      error instanceof NonRetryableRunError ||
      error instanceof TokenCeilingExceededError ||
      isPermanentProviderError(error)
    ) {
      await fail(errorMessage(error));
      return;
    }
    await recordRunError(runId, errorMessage(error));
    log.error(`${label} error, will retry: ${errorMessage(error)}`);
    throw error;
  } finally {
    clearInterval(watch);
  }
}

export function createRunHandler(executors: RunExecutors, log?: RunLogger) {
  return async (jobs: Job<unknown>[]): Promise<void> => {
    for (const job of jobs) await handleRunJob(job, executors, log);
  };
}

/** Jobs land here after their last retry (or after expiring / missing heartbeats). */
export function createDeadLetterHandler(log: RunLogger = silentLogger) {
  return async (jobs: Job<unknown>[]): Promise<void> => {
    for (const job of jobs) {
      const parsed = runJobDataSchema.safeParse(job.data);
      if (!parsed.success) continue;
      const run = await getRun(parsed.data.runId);
      const message = run?.error ?? 'The job failed after all retries.';
      await markRunFailed(parsed.data.runId, message);
      log.error(
        `${run?.kind ?? 'run'} ${parsed.data.runId.slice(0, 8)} dead-lettered: ${message}`
      );
    }
  };
}
