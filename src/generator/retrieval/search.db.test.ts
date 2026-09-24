import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { EMBEDDING_DIMENSIONS } from '@/ai/models';
import {
  createSource,
  replaceChunks,
  setSourceStatus,
} from '../sources/sources-repository';
import { searchChunks, semanticSql } from './search';

const adminId = randomUUID();
const vec = (n: number) =>
  Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => (i === n ? 1 : 0));
let ready: string;
let other: string;
let pending: string;

async function source(
  title: string,
  texts: string[],
  status: 'ready' | 'pending'
) {
  const s = await createSource({
    kind: 'text',
    title,
    text: 'x',
    createdById: adminId,
  });
  await replaceChunks(
    s.id,
    texts.map((text, i) => ({
      ordinal: i,
      text,
      charStart: i * 100,
      charEnd: i * 100 + text.length,
      locator: {},
      embedding: vec(i),
    })),
    'test'
  );
  await setSourceStatus(s.id, status);
  return s.id;
}

beforeAll(async () => {
  await prisma.adminUser.create({
    data: { id: adminId, email: `ret-${adminId}@test.local` },
  });
  ready = await source(
    'ready',
    ['製造業のAI導入の手順', '料金プランの比較', '導入後の効果測定'],
    'ready'
  );
  other = await source('other', ['AI導入の失敗例'], 'ready');
  pending = await source('pending', ['AI導入の秘密'], 'pending');
});

afterAll(async () => {
  await prisma.studioSource.deleteMany({ where: { createdById: adminId } });
  await prisma.adminUser.delete({ where: { id: adminId } });
});

describe('searchChunks', () => {
  it('finds Japanese keywords and nearest vectors within scope only', async () => {
    const results = await searchChunks({
      scope: { sourceIds: [ready, pending] },
      query: 'AI導入',
      queryEmbedding: vec(1),
      limit: 5,
    });
    const texts = results.map((r) => r.text);
    expect(texts).toContain('製造業のAI導入の手順'); // keyword
    expect(texts).toContain('料金プランの比較'); // vector
    expect(texts).not.toContain('AI導入の失敗例'); // other source
    expect(texts).not.toContain('AI導入の秘密'); // not ready
  });

  it('restricts to character ranges when given', async () => {
    const results = await searchChunks({
      scope: {
        sourceIds: [ready, other],
        charRanges: { [ready]: [[200, 300]] },
      },
      query: '導入',
      queryEmbedding: vec(0),
      limit: 10,
    });
    const fromReady = results
      .filter((r) => r.sourceId === ready)
      .map((r) => r.text);
    expect(fromReady).toEqual(['導入後の効果測定']);
    expect(results.some((r) => r.sourceId === other)).toBe(true);
  });

  it('returns nothing for an empty scope', async () => {
    expect(
      await searchChunks({
        scope: { sourceIds: [] },
        query: 'AI',
        queryEmbedding: vec(0),
      })
    ).toEqual([]);
  });

  it('does not fail on query syntax in model-written text', async () => {
    await expect(
      searchChunks({
        scope: { sourceIds: [ready] },
        query: '見出し (未閉 "引用 OR -除外',
        queryEmbedding: vec(2),
        limit: 5,
      })
    ).resolves.toBeDefined();
  });

  it('matches a Japanese sentence by its content words, not as one phrase', async () => {
    const results = await searchChunks({
      scope: { sourceIds: [ready] },
      query: '製造業における効果の測定について',
      // Equidistant from every stored vector: only the keyword half can rank.
      queryEmbedding: vec(50),
      limit: 2,
    });
    expect(results.map((r) => r.text).sort()).toEqual(
      ['導入後の効果測定', '製造業のAI導入の手順'].sort()
    );
  });

  it('finds in-scope chunks even when the vector index is used and many out-of-scope chunks are nearer', async () => {
    const crowd = await createSource({
      kind: 'text',
      title: 'crowd',
      text: 'x',
      createdById: adminId,
    });
    await replaceChunks(
      crowd.id,
      Array.from({ length: 200 }, (_, i) => ({
        ordinal: i,
        text: `crowd ${i}`,
        charStart: i * 10,
        charEnd: i * 10 + 5,
        locator: {},
        // Distinct points all much nearer the query than the in-scope chunk.
        embedding: vec(7).map((v, d) => (d === 10 + i ? 0.1 : v)),
      })),
      'test'
    );
    await setSourceStatus(crowd.id, 'ready');
    const results = await prisma.$transaction(async (tx) => {
      // Large libraries make the planner pick the HNSW index; force it here.
      await tx.$executeRaw`SET LOCAL enable_seqscan = off`;
      await tx.$executeRaw`SET LOCAL enable_sort = off`;
      await tx.$executeRaw`SET LOCAL hnsw.ef_search = 10`;
      return searchChunks({
        scope: { sourceIds: [other] },
        query: '',
        queryEmbedding: vec(7),
        limit: 5,
        db: tx,
      });
    });
    expect(results.map((r) => r.text)).toEqual(['AI導入の失敗例']);
  });

  it('materializes only ids and distances for the scope, not chunk text or vectors', async () => {
    const plan = await prisma.$queryRaw<
      Array<{ 'QUERY PLAN': string }>
    >`EXPLAIN (VERBOSE) ${semanticSql({ sourceIds: [ready] }, vec(1))}`;
    const lines = plan.map((r) => r['QUERY PLAN']);
    const cte = lines.findIndex((l) => l.includes('CTE scoped'));
    expect(cte).toBeGreaterThanOrEqual(0);
    const output = lines
      .slice(cte)
      .find((l) => l.trim().startsWith('Output:'))!;
    expect(output).not.toMatch(/\bc\.text\b/);
    expect(output).not.toMatch(/\bc\.embedding\b(?!\s*<=>)/);
  });
});
