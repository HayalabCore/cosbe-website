import { randomUUID } from 'node:crypto';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  addRunUsage,
  assertRunBudget,
  cancelRun,
  createRun,
  getRun,
  markRunFailed,
  markRunStarted,
  markRunSucceeded,
  recordRunError,
  runStep,
  TokenCeilingExceededError,
} from './runs-repository';

const adminId = randomUUID();

beforeAll(async () => {
  await prisma.adminUser.create({
    data: { id: adminId, email: `runs-${adminId}@test.local` },
  });
});

beforeEach(async () => {
  await prisma.studioRun.deleteMany({ where: { createdById: adminId } });
});

afterAll(async () => {
  await prisma.studioRun.deleteMany({ where: { createdById: adminId } });
  await prisma.adminUser.delete({ where: { id: adminId } });
});

function newRun(extra: { tokenCeiling?: number } = {}) {
  return createRun(prisma, {
    kind: 'system_check',
    createdById: adminId,
    ...extra,
  });
}

describe('studio runs repository', () => {
  it('enables RLS on the studio run tables', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ relname: string; relrowsecurity: boolean }>
    >`SELECT relname, relrowsecurity FROM pg_class
      WHERE relname IN ('studio_runs', 'studio_run_steps')`;
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });

  it('creates a queued run with zero usage and empty input', async () => {
    const run = await newRun();
    expect(run.status).toBe('queued');
    expect(run.tokensIn).toBe(0);
    expect(run.tokensOut).toBe(0);
    expect(run.input).toEqual({});
  });

  it('moves queued → running → succeeded and stamps times', async () => {
    const run = await newRun();
    expect(await markRunStarted(run.id)).toBe(true);
    await markRunSucceeded(run.id);
    const done = await getRun(run.id);
    expect(done?.status).toBe('succeeded');
    expect(done?.startedAt).toBeInstanceOf(Date);
    expect(done?.finishedAt).toBeInstanceOf(Date);
  });

  it('keeps the first startedAt when a retry starts the run again', async () => {
    const run = await newRun();
    await markRunStarted(run.id);
    const first = (await getRun(run.id))?.startedAt;
    await new Promise((r) => setTimeout(r, 20));
    expect(await markRunStarted(run.id)).toBe(true);
    expect((await getRun(run.id))?.startedAt).toEqual(first);
  });

  it('does not start a cancelled run', async () => {
    const run = await newRun();
    expect(await cancelRun(run.id)).toBe(true);
    expect(await markRunStarted(run.id)).toBe(false);
    expect((await getRun(run.id))?.status).toBe('cancelled');
  });

  it('never changes a terminal run', async () => {
    const run = await newRun();
    await markRunStarted(run.id);
    await markRunSucceeded(run.id);
    await markRunFailed(run.id, 'late failure');
    expect(await cancelRun(run.id)).toBe(false);
    const after = await getRun(run.id);
    expect(after?.status).toBe('succeeded');
    expect(after?.error).toBeNull();
  });

  it('records an attempt error without ending the run', async () => {
    const run = await newRun();
    await markRunStarted(run.id);
    await recordRunError(run.id, 'timeout talking to provider');
    const after = await getRun(run.id);
    expect(after?.status).toBe('running');
    expect(after?.error).toBe('timeout talking to provider');
  });

  it('runStep stores output and skips the function once succeeded', async () => {
    const run = await newRun();
    await markRunStarted(run.id);
    const fn = vi.fn(async () => ({ value: 1 }));
    expect(await runStep(run.id, { key: 'a', ordinal: 0 }, fn)).toEqual({
      value: 1,
    });
    expect(await runStep(run.id, { key: 'a', ordinal: 0 }, fn)).toEqual({
      value: 1,
    });
    expect(fn).toHaveBeenCalledTimes(1);
    const step = (await getRun(run.id))?.steps[0];
    expect(step?.status).toBe('succeeded');
    expect(step?.attempts).toBe(1);
  });

  it('runStep marks a failed step and counts the retry attempt', async () => {
    const run = await newRun();
    await markRunStarted(run.id);
    await expect(
      runStep(run.id, { key: 'b', ordinal: 1 }, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    let step = (await getRun(run.id))?.steps[0];
    expect(step?.status).toBe('failed');
    expect(step?.error).toBe('boom');

    await runStep(run.id, { key: 'b', ordinal: 1 }, async () => ({ ok: true }));
    step = (await getRun(run.id))?.steps[0];
    expect(step?.status).toBe('succeeded');
    expect(step?.error).toBeNull();
    expect(step?.attempts).toBe(2);
  });

  it('addRunUsage accumulates and enforces the token ceiling', async () => {
    const run = await newRun({ tokenCeiling: 100 });
    await addRunUsage(run.id, { inputTokens: 40, outputTokens: 10 });
    await expect(
      addRunUsage(run.id, { inputTokens: 40, outputTokens: 20 })
    ).rejects.toBeInstanceOf(TokenCeilingExceededError);
    const after = await getRun(run.id);
    expect(after?.tokensIn).toBe(80);
    expect(after?.tokensOut).toBe(30);
  });

  it('records success when cancel lands after the work has finished', async () => {
    const run = await newRun();
    await markRunStarted(run.id);
    expect(await cancelRun(run.id)).toBe(true);
    await markRunSucceeded(run.id);
    expect((await getRun(run.id))?.status).toBe('succeeded');
  });

  it('assertRunBudget refuses an estimate that would pass the ceiling', async () => {
    const run = await newRun({ tokenCeiling: 100 });
    await addRunUsage(run.id, { inputTokens: 90, outputTokens: 0 });
    await expect(assertRunBudget(run.id, 20)).rejects.toBeInstanceOf(
      TokenCeilingExceededError
    );
    await expect(assertRunBudget(run.id, 10)).resolves.toBeUndefined();
  });

  it('addRunUsage never throws without a ceiling', async () => {
    const run = await newRun();
    await addRunUsage(run.id, { inputTokens: 1_000_000, outputTokens: 1 });
    expect((await getRun(run.id))?.tokensIn).toBe(1_000_000);
  });
});
