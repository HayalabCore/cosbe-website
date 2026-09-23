import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { EMBEDDING_DIMENSIONS } from '@/ai/models';
import { createRun, markRunFailed } from '../runs/runs-repository';
import {
  claimFailedSource,
  countProjectLinks,
  createSource,
  deleteSourceGuarded,
  deleteSource,
  getSource,
  listSources,
  replaceChunks,
  setSourceStatus,
  setSourceText,
} from './sources-repository';
import {
  createProject,
  linkSource,
  listProjectSources,
  unlinkSource,
} from './projects-repository';

const adminId = randomUUID();
const vec = (n: number) =>
  Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => (i === n ? 1 : 0));

beforeAll(async () => {
  await prisma.adminUser.create({
    data: { id: adminId, email: `src-${adminId}@test.local` },
  });
});

afterAll(async () => {
  await prisma.studioRun.deleteMany({ where: { createdById: adminId } });
  await prisma.studioProject.deleteMany({ where: { createdById: adminId } });
  await prisma.studioSource.deleteMany({ where: { createdById: adminId } });
  await prisma.adminUser.delete({ where: { id: adminId } });
});

describe('sources repository', () => {
  it('creates, updates and lists sources', async () => {
    const s = await createSource({
      kind: 'text',
      title: 'メモ',
      text: '本文',
      createdById: adminId,
    });
    expect(s.status).toBe('pending');
    await setSourceText(s.id, {
      text: '本文です。',
      language: 'ja',
      contentHash: 'h1',
    });
    await setSourceStatus(s.id, 'ready');
    const again = await getSource(s.id);
    expect(again).toMatchObject({
      status: 'ready',
      charCount: 5,
      language: 'ja',
    });
    const list = await listSources({ query: 'メモ' });
    expect(list.map((x) => x.id)).toContain(s.id);
  });

  it('replaces chunks with embeddings in one transaction', async () => {
    const s = await createSource({
      kind: 'text',
      title: 'chunks',
      text: 'x',
      createdById: adminId,
    });
    const chunk = (ordinal: number) => ({
      ordinal,
      text: `chunk ${ordinal}`,
      charStart: ordinal * 10,
      charEnd: ordinal * 10 + 7,
      locator: {},
      embedding: vec(ordinal),
    });
    await replaceChunks(s.id, [chunk(0), chunk(1)], 'test-model');
    await replaceChunks(s.id, [chunk(0)], 'test-model');
    const rows = await prisma.$queryRaw<
      Array<{ ordinal: number; dims: number }>
    >`
      SELECT ordinal, vector_dims(embedding) AS dims FROM studio_source_chunks WHERE source_id = ${s.id}::uuid`;
    expect(rows).toEqual([{ ordinal: 0, dims: EMBEDDING_DIMENSIONS }]);
  });

  it('links sources to projects and counts links', async () => {
    const s = await createSource({
      kind: 'text',
      title: 'linked',
      text: 'x',
      createdById: adminId,
    });
    const p = await createProject({ name: 'Webinar', createdById: adminId });
    await linkSource(p.id, s.id, adminId);
    await linkSource(p.id, s.id, adminId); // idempotent
    expect(await countProjectLinks(s.id)).toBe(1);
    expect((await listProjectSources(p.id)).map((x) => x.id)).toEqual([s.id]);
    await unlinkSource(p.id, s.id);
    expect(await countProjectLinks(s.id)).toBe(0);
    await deleteSource(s.id);
    expect(await getSource(s.id)).toBeNull();
  });

  it('fails a still-processing source when its run fails', async () => {
    const s = await createSource({
      kind: 'text',
      title: 'dies',
      text: 'x',
      createdById: adminId,
      status: 'processing',
    });
    const run = await createRun(prisma, {
      kind: 'ingest',
      sourceId: s.id,
      createdById: adminId,
    });
    await markRunFailed(run.id, 'The job failed after all retries.');
    expect(await getSource(s.id)).toMatchObject({
      status: 'failed',
      error: 'The job failed after all retries.',
    });
  });

  it('lets only the creator delete an unlinked source without the delete permission', async () => {
    const otherId = randomUUID();
    await prisma.adminUser.create({
      data: { id: otherId, email: `src-o-${otherId}@test.local` },
    });
    try {
      const mine = await createSource({ kind: 'text', title: 'm', text: 'x', createdById: adminId });
      const theirs = await createSource({ kind: 'text', title: 't', text: 'x', createdById: otherId });
      const plain = { id: adminId, canDeleteShared: false };
      expect(await deleteSourceGuarded(theirs.id, plain)).toMatchObject({ result: 'LINKED' });
      expect(await getSource(theirs.id)).not.toBeNull();
      expect(await deleteSourceGuarded(mine.id, plain)).toMatchObject({ result: 'OK' });
      expect(await getSource(mine.id)).toBeNull();

      const project = await createProject({ name: 'p', createdById: adminId });
      const linked = await createSource({ kind: 'text', title: 'l', text: 'x', createdById: adminId });
      await linkSource(project.id, linked.id, adminId);
      expect(await deleteSourceGuarded(linked.id, plain)).toMatchObject({ result: 'LINKED' });
      expect(
        await deleteSourceGuarded(linked.id, { id: adminId, canDeleteShared: true })
      ).toMatchObject({ result: 'OK' });
      expect(await deleteSourceGuarded(randomUUID(), plain)).toMatchObject({ result: 'NOT_FOUND' });
    } finally {
      await prisma.studioSource.deleteMany({ where: { createdById: otherId } });
      await prisma.adminUser.delete({ where: { id: otherId } });
    }
  });

  it('claims only failed sources for a retry, once', async () => {
    const s = await createSource({ kind: 'text', title: 'r', text: 'x', createdById: adminId });
    await setSourceStatus(s.id, 'ready');
    expect(await claimFailedSource(s.id)).toBe(false);
    await setSourceStatus(s.id, 'failed', 'boom');
    const claims = await Promise.all([claimFailedSource(s.id), claimFailedSource(s.id)]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect((await getSource(s.id))?.status).toBe('pending');
  });
});
