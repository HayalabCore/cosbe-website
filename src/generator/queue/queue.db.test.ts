import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgBoss } from 'pg-boss';
import { prisma } from '@/lib/prisma';
import { RUN_EXECUTORS } from '../executors';
import {
  createDeadLetterHandler,
  createRunHandler,
  type RunExecutors,
} from '../runs/run-handler';
import { createPiece, updatePiece } from '../pieces/pieces-repository';
import { cancelRun } from '../runs/runs-repository';
import { getRun } from '../runs/runs-repository';
import { RUN_KINDS } from '../runs/run-types';
import { createAndEnqueueRun } from './enqueue';
import {
  DEAD_LETTER_QUEUE,
  ensureQueues,
  queueForKind,
  RUN_QUEUE_SETTINGS,
} from './queues';

const QUEUE = queueForKind('system_check');
const allowedId = randomUUID();
const deniedId = randomUUID();
const roleKey = `studio-e2e-${allowedId}`;

let workerBoss: PgBoss;
let webBoss: PgBoss;

async function waitForRun(id: string, statuses: string[], timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const run = await getRun(id);
    if (run && statuses.includes(run.status)) return run;
    if (Date.now() > deadline) {
      throw new Error(`Run ${id} is still ${run?.status ?? 'missing'}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

async function work(executors: RunExecutors) {
  await workerBoss.offWork(QUEUE, { wait: true });
  await workerBoss.work(
    QUEUE,
    { batchSize: 1, pollingIntervalSeconds: 0.5 },
    createRunHandler(executors)
  );
}

beforeAll(async () => {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  workerBoss = new PgBoss({ connectionString: url, max: 2 });
  workerBoss.on('error', (e) => console.error(e));
  await workerBoss.start();
  // Every run queue (e.g. one a local worker created) references the dead
  // letter queue, so delete them all before it.
  for (const name of [...RUN_KINDS.map(queueForKind), DEAD_LETTER_QUEUE]) {
    if (await workerBoss.getQueue(name)) await workerBoss.deleteQueue(name);
  }
  await ensureQueues(workerBoss, ['system_check', 'outline', 'write'], {
    ...RUN_QUEUE_SETTINGS,
    retryLimit: 0,
    retryBackoff: false,
    retryDelay: 0,
  });
  await workerBoss.work(
    DEAD_LETTER_QUEUE,
    { batchSize: 1, pollingIntervalSeconds: 0.5 },
    createDeadLetterHandler()
  );

  // Same settings as getWebBoss(); jobs are still inserted through Prisma.
  webBoss = new PgBoss({
    connectionString: url,
    max: 1,
    supervise: false,
    schedule: false,
    migrate: false,
    createSchema: false,
  });
  await webBoss.start();

  const role = await prisma.role.create({
    data: {
      key: roleKey,
      name: 'Studio e2e',
      permissions: { create: [{ permission: 'studio.use' }] },
    },
  });
  await prisma.adminUser.create({
    data: { id: allowedId, email: `studio-ok-${allowedId}@test.local` },
  });
  await prisma.adminUser.create({
    data: { id: deniedId, email: `studio-no-${deniedId}@test.local` },
  });
  await prisma.userRole.create({
    data: { userId: allowedId, roleId: role.id },
  });
}, 30_000);

afterAll(async () => {
  await workerBoss?.stop({ graceful: false });
  await webBoss?.stop({ graceful: false });
  await prisma.studioProject.deleteMany({ where: { createdById: allowedId } });
  await prisma.studioRun.deleteMany({
    where: { createdById: { in: [allowedId, deniedId] } },
  });
  await prisma.adminUser.deleteMany({
    where: { id: { in: [allowedId, deniedId] } },
  });
  await prisma.role.deleteMany({ where: { key: roleKey } });
});

describe('studio queue end to end', () => {
  it('runs a system check enqueued by the web side', async () => {
    await work(RUN_EXECUTORS);
    const run = await createAndEnqueueRun(webBoss, {
      kind: 'system_check',
      createdById: allowedId,
    });
    const done = await waitForRun(run.id, ['succeeded', 'failed']);
    expect(done.status).toBe('succeeded');
    expect(done.steps).toHaveLength(1);
    expect(done.steps[0].key).toBe('ping');
    expect(done.steps[0].output).toMatchObject({ worker: expect.any(String) });
  }, 20_000);

  it('dead-letters a failing job and marks its run failed', async () => {
    await work({
      system_check: async () => {
        throw new Error('boom');
      },
    });
    const run = await createAndEnqueueRun(webBoss, {
      kind: 'system_check',
      createdById: allowedId,
    });
    const done = await waitForRun(run.id, ['failed', 'succeeded']);
    expect(done.status).toBe('failed');
    expect(done.error).toBe('boom');
  }, 20_000);

  it('rejects queued work after a forced password reset', async () => {
    await work(RUN_EXECUTORS);
    await prisma.adminUser.update({
      where: { id: allowedId },
      data: { mustChangePassword: true },
    });
    try {
      const run = await createAndEnqueueRun(webBoss, {
        kind: 'system_check',
        createdById: allowedId,
      });
      const done = await waitForRun(run.id, ['failed', 'succeeded']);
      expect(done.status).toBe('failed');
      expect(done.error).toBe('FORBIDDEN');
      expect(done.steps).toHaveLength(0);
    } finally {
      await prisma.adminUser.update({
        where: { id: allowedId },
        data: { mustChangePassword: false },
      });
    }
  }, 20_000);

  it('fails runs whose creator lacks studio.use', async () => {
    await work(RUN_EXECUTORS);
    const run = await createAndEnqueueRun(webBoss, {
      kind: 'system_check',
      createdById: deniedId,
    });
    const done = await waitForRun(run.id, ['failed', 'succeeded']);
    expect(done.status).toBe('failed');
    expect(done.error).toBe('FORBIDDEN');
    expect(done.steps).toHaveLength(0);
  }, 20_000);
});

it('serializes competing kinds and permits a replacement after cancellation', async () => {
  const project = await prisma.studioProject.create({
    data: { name: 'race', createdById: allowedId },
  });
  const piece = await createPiece({
    projectId: project.id,
    createdById: allowedId,
    templateId: null,
    category: 'notice',
  });
  const results = await Promise.allSettled(
    (['outline', 'write'] as const).map((kind) =>
      createAndEnqueueRun(webBoss, {
        kind,
        pieceId: piece.id,
        createdById: allowedId,
      })
    )
  );
  const accepted = results.filter((r) => r.status === 'fulfilled');
  expect(accepted).toHaveLength(1);
  expect(results.find((r) => r.status === 'rejected')).toMatchObject({
    reason: { reason: 'BUSY' },
  });
  const first = accepted[0];
  if (first.status !== 'fulfilled') throw new Error('missing accepted run');
  await cancelRun(first.value.id);
  const replacement = await createAndEnqueueRun(webBoss, {
    kind: first.value.kind as 'outline' | 'write',
    pieceId: piece.id,
    createdById: allowedId,
  });
  expect(replacement.id).not.toBe(first.value.id);
  await cancelRun(replacement.id);
  await updatePiece(piece.id, { stage: 'handed_off' });
  await expect(
    createAndEnqueueRun(webBoss, {
      kind: 'write',
      pieceId: piece.id,
      createdById: allowedId,
    })
  ).rejects.toMatchObject({ reason: 'LOCKED' });
});

it('refuses a job for an archived piece', async () => {
  const project = await prisma.studioProject.create({
    data: { name: 'archived', createdById: allowedId },
  });
  const piece = await createPiece({
    projectId: project.id,
    createdById: allowedId,
    templateId: null,
    category: 'notice',
  });
  await prisma.studioPiece.update({
    where: { id: piece.id },
    data: { archivedAt: new Date() },
  });
  await expect(
    createAndEnqueueRun(webBoss, {
      kind: 'outline',
      pieceId: piece.id,
      createdById: allowedId,
    })
  ).rejects.toMatchObject({ reason: 'LOCKED' });
});

it('gives long-running kinds a longer job expiry', async () => {
  const project = await prisma.studioProject.create({
    data: { name: 'expiry', createdById: allowedId },
  });
  const piece = await createPiece({
    projectId: project.id,
    createdById: allowedId,
    templateId: null,
    category: 'notice',
  });
  const run = await createAndEnqueueRun(webBoss, {
    kind: 'write',
    pieceId: piece.id,
    createdById: allowedId,
  });
  const [job] = await prisma.$queryRaw<Array<{ expire_seconds: number }>>`
    SELECT expire_seconds FROM pgboss.job WHERE data->>'runId' = ${run.id}`;
  expect(job.expire_seconds).toBe(3600);
  await cancelRun(run.id);
});

it('restarting the worker updates existing queues instead of failing', async () => {
  await expect(
    ensureQueues(workerBoss, ['system_check'])
  ).resolves.toBeUndefined();
  await expect(
    ensureQueues(workerBoss, ['system_check'])
  ).resolves.toBeUndefined();
  expect(
    (await workerBoss.getQueue(queueForKind('system_check')))?.policy
  ).toBe('singleton');
});
