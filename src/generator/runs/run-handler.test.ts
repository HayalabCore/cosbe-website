import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from 'pg-boss';
import { APICallError } from 'ai';

vi.mock('./runs-repository', () => ({
  getRun: vi.fn(),
  markRunStarted: vi.fn(),
  markRunSucceeded: vi.fn(),
  markRunFailed: vi.fn(),
  recordRunError: vi.fn(),
  runStep: vi.fn(),
  addRunUsage: vi.fn(),
  assertRunBudget: vi.fn(),
  isRunCancelled: vi.fn(async () => false),
  TokenCeilingExceededError: class TokenCeilingExceededError extends Error {},
}));
vi.mock('../authz', () => ({ actorHasPermission: vi.fn() }));

import { actorHasPermission } from '../authz';
import {
  addRunUsage,
  isRunCancelled,
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
  createDeadLetterHandler,
  handleRunJob,
  type RunExecutor,
} from './run-handler';
import { NonRetryableRunError } from './run-types';

const RUN_ID = '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';

function job(data: unknown = { runId: RUN_ID }): Job<unknown> {
  return {
    id: 'job-1',
    name: 'studio.run.system_check',
    data,
    expireInSeconds: 900,
    heartbeatSeconds: 60,
    signal: new AbortController().signal,
  };
}

function run(overrides: Partial<RunWithSteps> = {}): RunWithSteps {
  return {
    id: RUN_ID,
    kind: 'system_check',
    status: 'queued',
    createdById: 'u1',
    error: null,
    createdAt: new Date(),
    steps: [],
    ...overrides,
  } as RunWithSteps;
}

describe('handleRunJob', () => {
  const executor = vi.fn<RunExecutor>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRun).mockResolvedValue(run());
    vi.mocked(actorHasPermission).mockResolvedValue(true);
    vi.mocked(markRunStarted).mockResolvedValue(true);
    vi.mocked(isRunCancelled).mockResolvedValue(false);
    executor.mockResolvedValue(undefined);
  });

  it('drops malformed job data without retrying', async () => {
    await handleRunJob(job({ nope: 1 }), { system_check: executor });
    expect(executor).not.toHaveBeenCalled();
    expect(markRunFailed).not.toHaveBeenCalled();
  });

  it('does nothing when the run no longer exists', async () => {
    vi.mocked(getRun).mockResolvedValue(null);
    await handleRunJob(job(), { system_check: executor });
    expect(executor).not.toHaveBeenCalled();
    expect(markRunFailed).not.toHaveBeenCalled();
  });

  it('does nothing for a run that already ended', async () => {
    vi.mocked(getRun).mockResolvedValue(run({ status: 'cancelled' }));
    await handleRunJob(job(), { system_check: executor });
    expect(executor).not.toHaveBeenCalled();
  });

  it('fails runs of an unknown kind without retrying', async () => {
    vi.mocked(getRun).mockResolvedValue(run({ kind: 'mystery' }));
    await handleRunJob(job(), { system_check: executor });
    expect(markRunFailed).toHaveBeenCalledWith(
      RUN_ID,
      'Unknown run kind "mystery"'
    );
  });

  it('fails runs with no registered executor', async () => {
    await handleRunJob(job(), {});
    expect(markRunFailed).toHaveBeenCalledWith(
      RUN_ID,
      'No executor registered for "system_check"'
    );
  });

  it('fails the run as FORBIDDEN when the creator lost the permission', async () => {
    vi.mocked(actorHasPermission).mockResolvedValue(false);
    await handleRunJob(job(), { system_check: executor });
    expect(actorHasPermission).toHaveBeenCalledWith('u1', 'studio.use');
    expect(markRunFailed).toHaveBeenCalledWith(RUN_ID, 'FORBIDDEN');
    expect(executor).not.toHaveBeenCalled();
  });

  it('skips a run cancelled before it started', async () => {
    vi.mocked(markRunStarted).mockResolvedValue(false);
    await handleRunJob(job(), { system_check: executor });
    expect(executor).not.toHaveBeenCalled();
    expect(markRunSucceeded).not.toHaveBeenCalled();
  });

  it('runs the executor and marks the run succeeded', async () => {
    await handleRunJob(job(), { system_check: executor });
    expect(executor).toHaveBeenCalledTimes(1);
    expect(markRunSucceeded).toHaveBeenCalledWith(RUN_ID);
  });

  it('gives the executor step and usage helpers bound to the run', async () => {
    vi.mocked(runStep).mockResolvedValue({ ok: true });
    executor.mockImplementation(async (ctx) => {
      await ctx.step('ping', 0, async () => ({ ok: true }));
      await ctx.recordUsage({ inputTokens: 3, outputTokens: 4 });
    });
    await handleRunJob(job(), { system_check: executor });
    expect(runStep).toHaveBeenCalledWith(
      RUN_ID,
      { key: 'ping', ordinal: 0, promptVersion: undefined },
      expect.any(Function)
    );
    expect(addRunUsage).toHaveBeenCalledWith(
      RUN_ID,
      { inputTokens: 3, outputTokens: 4 },
      undefined
    );
  });

  it('attributes usage inside a step to that step, with its prompt version', async () => {
    vi.mocked(runStep).mockImplementation(async (_id, _step, fn) => fn());
    executor.mockImplementation(async (ctx) => {
      await ctx.step(
        'section:a',
        1,
        async () => {
          await ctx.recordUsage({ inputTokens: 10, outputTokens: 5 });
          return {};
        },
        { promptVersion: 'write.v1' }
      );
    });
    await handleRunJob(job(), { system_check: executor });
    expect(runStep).toHaveBeenCalledWith(
      RUN_ID,
      { key: 'section:a', ordinal: 1, promptVersion: 'write.v1' },
      expect.any(Function)
    );
    expect(addRunUsage).toHaveBeenCalledWith(
      RUN_ID,
      { inputTokens: 10, outputTokens: 5 },
      'section:a'
    );
  });

  it('checks for cancellation at most every two seconds', async () => {
    vi.useFakeTimers();
    try {
      executor.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1900))
      );
      const done = handleRunJob(job(), { system_check: executor });
      await vi.advanceTimersByTimeAsync(1900);
      await done;
      expect(isRunCancelled).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails without retry on NonRetryableRunError', async () => {
    executor.mockRejectedValue(new NonRetryableRunError('bad input'));
    await handleRunJob(job(), { system_check: executor });
    expect(markRunFailed).toHaveBeenCalledWith(RUN_ID, 'bad input');
  });

  it('fails without retry when the token ceiling is exceeded', async () => {
    const error = new TokenCeilingExceededError(RUN_ID, 120, 100);
    executor.mockRejectedValue(error);
    await handleRunJob(job(), { system_check: executor });
    expect(markRunFailed).toHaveBeenCalledWith(RUN_ID, error.message);
  });

  it('aborts an in-flight executor when the run is cancelled and does not retry', async () => {
    vi.mocked(isRunCancelled).mockResolvedValue(true);
    executor.mockImplementation(async (ctx) => {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 5_000);
        ctx.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('aborted'));
        });
      });
    });
    await handleRunJob(job(), { system_check: executor });
    expect(markRunSucceeded).not.toHaveBeenCalled();
    expect(markRunFailed).not.toHaveBeenCalled();
    expect(recordRunError).not.toHaveBeenCalled();
  });

  it('records other errors and rethrows so pg-boss retries', async () => {
    executor.mockRejectedValue(new Error('provider timeout'));
    await expect(
      handleRunJob(job(), { system_check: executor })
    ).rejects.toThrow('provider timeout');
    expect(recordRunError).toHaveBeenCalledWith(RUN_ID, 'provider timeout');
    expect(markRunFailed).not.toHaveBeenCalled();
  });

  it('fails at once on a provider error the provider says will not succeed on retry', async () => {
    executor.mockRejectedValue(
      new APICallError({
        message: "Invalid schema for response_format 'article_section'",
        url: 'https://api.openai.com/v1/responses',
        requestBodyValues: {},
        statusCode: 400,
        isRetryable: false,
      })
    );
    await handleRunJob(job(), { system_check: executor });
    expect(markRunFailed).toHaveBeenCalledWith(
      RUN_ID,
      expect.stringContaining('Invalid schema')
    );
    expect(recordRunError).not.toHaveBeenCalled();
  });

  it('still retries a provider error marked retryable', async () => {
    executor.mockRejectedValue(
      new APICallError({
        message: 'Rate limited',
        url: 'https://api.openai.com/v1/responses',
        requestBodyValues: {},
        statusCode: 429,
        isRetryable: true,
      })
    );
    await expect(
      handleRunJob(job(), { system_check: executor })
    ).rejects.toThrow('Rate limited');
    expect(markRunFailed).not.toHaveBeenCalled();
  });
});

describe('createDeadLetterHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fails the run with the last recorded error', async () => {
    vi.mocked(getRun).mockResolvedValue(run({ error: 'provider timeout' }));
    await createDeadLetterHandler()([job()]);
    expect(markRunFailed).toHaveBeenCalledWith(RUN_ID, 'provider timeout');
  });

  it('uses a generic message when nothing was recorded', async () => {
    vi.mocked(getRun).mockResolvedValue(run());
    await createDeadLetterHandler()([job()]);
    expect(markRunFailed).toHaveBeenCalledWith(
      RUN_ID,
      'The job failed after all retries.'
    );
  });

  it('ignores dead jobs without a run id', async () => {
    await createDeadLetterHandler()([job({})]);
    expect(markRunFailed).not.toHaveBeenCalled();
  });
});
