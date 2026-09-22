import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { EMBEDDING_DIMENSIONS } from '@/ai/models';
import {
  createSource,
  replaceChunks,
  setSourceMeta,
  setSourceStatus,
} from '../sources/sources-repository';
import { linkSource } from '../sources/projects-repository';
import { chunksForSection } from '../executors/write';
import { aliasChunks, buildScope, getChunks } from './scope';
import type { PieceData } from './pieces-repository';

const adminId = randomUUID();
let projectId: string;
let linked: string;
let unlinked: string;
const vec = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.01);

async function source(title: string) {
  const s = await createSource({
    kind: 'text',
    title,
    text: 'x',
    createdById: adminId,
  });
  await replaceChunks(
    s.id,
    [0, 1].map((o) => ({
      ordinal: o,
      text: `${title}-${o}`,
      charStart: o * 100,
      charEnd: o * 100 + 50,
      locator: {},
      embedding: vec,
    })),
    'test'
  );
  await setSourceStatus(s.id, 'ready');
  return s.id;
}

beforeAll(async () => {
  await prisma.adminUser.create({
    data: { id: adminId, email: `sc-${adminId}@test.local` },
  });
  projectId = (
    await prisma.studioProject.create({
      data: { name: 'p', createdById: adminId },
    })
  ).id;
  linked = await source('linked');
  unlinked = await source('unlinked');
  await linkSource(projectId, linked, adminId);
  await setSourceMeta(linked, {
    chapters: [
      { title: 'c0', startS: 0, endS: 60, charStart: 0, charEnd: 60 },
      { title: 'c1', startS: 60, endS: null, charStart: 100, charEnd: 200 },
    ],
  });
});

afterAll(async () => {
  await prisma.studioProject.deleteMany({ where: { createdById: adminId } });
  await prisma.studioSource.deleteMany({ where: { createdById: adminId } });
  await prisma.adminUser.delete({ where: { id: adminId } });
});

const piece = (selection: PieceData['selection']) =>
  ({ projectId, selection }) as PieceData;

describe('buildScope', () => {
  it('keeps only selected sources linked to the project', async () => {
    const scope = await buildScope(
      piece({ sourceIds: [linked, unlinked], chapters: {} })
    );
    expect(scope.sourceIds).toEqual([linked]);
  });

  it('turns ticked chapters into character ranges', async () => {
    const scope = await buildScope(
      piece({ sourceIds: [linked], chapters: { [linked]: [1] } })
    );
    expect(scope.charRanges).toEqual({ [linked]: [[100, 200]] });
  });

  it('omits a source when ticked chapters resolve to no ranges', async () => {
    const scope = await buildScope(
      piece({ sourceIds: [linked], chapters: { [linked]: [99] } })
    );
    expect(scope.sourceIds).toEqual([]);
    expect(scope.charRanges).toEqual({});
  });
});

describe('chunks and aliases', () => {
  it('loads chunks in the requested order with source titles', async () => {
    const ids = (
      await prisma.studioSourceChunk.findMany({
        where: { sourceId: linked },
        orderBy: { ordinal: 'asc' },
      })
    ).map((c) => c.id);
    const chunks = await getChunks([ids[1], ids[0]]);
    expect(chunks.map((c) => c.text)).toEqual(['linked-1', 'linked-0']);
    expect(chunks[0].sourceTitle).toBe('linked');
    const aliases = aliasChunks(ids);
    expect(aliases.toAlias.get(ids[0])).toBe('c1');
    expect(aliases.toId.get('c2')).toBe(ids[1]);
  });
});

// Boilerplate avoids embedding calls but must obey the same evidence boundary.
it('excludes planned chunks from unlinked sources and unticked chapters', async () => {
  const ids = (
    await prisma.studioSourceChunk.findMany({
      where: { sourceId: { in: [linked, unlinked] } },
    })
  ).map((c) => c.id);
  const chunks = await chunksForSection(
    piece({ sourceIds: [linked, unlinked], chapters: { [linked]: [1] } }),
    {
      id: 'o',
      heading: 'H',
      intent: '',
      chunkIds: ids,
      estChars: 100,
      kind: 'boilerplate',
      stale: false,
    },
    {}
  );
  expect(chunks.map((c) => c.text)).toEqual(['linked-1']);
  expect(
    await chunksForSection(
      piece({ sourceIds: [], chapters: {} }),
      {
        id: 'o',
        heading: 'H',
        intent: '',
        chunkIds: ids,
        estChars: 100,
        kind: 'boilerplate',
        stale: false,
      },
      {}
    )
  ).toEqual([]);
});
