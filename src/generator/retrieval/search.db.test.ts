import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { EMBEDDING_DIMENSIONS } from '@/ai/models';
import {
  createSource,
  replaceChunks,
  setSourceStatus,
} from '../sources/sources-repository';
import { searchChunks } from './search';

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

  it('treats query syntax characters as plain text', async () => {
    const results = await searchChunks({
      scope: { sourceIds: [ready] },
      query: 'AI "導入 (手順 -OR',
      queryEmbedding: vec(2),
      limit: 5,
    });
    expect(results.length).toBeGreaterThan(0);
  });
});
