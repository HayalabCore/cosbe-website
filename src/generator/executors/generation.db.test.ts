import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Job } from 'pg-boss';

const queue: object[] = [];
vi.mock('@/ai/models', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/ai/models')>();
  const { MockLanguageModelV4, MockEmbeddingModelV4 } = await import('ai/test');
  return {
    ...actual,
    languageModelForTask: () =>
      new MockLanguageModelV4({
        doGenerate: async () => ({
          content: [{ type: 'text', text: JSON.stringify(queue.shift()) }],
          finishReason: { unified: 'stop', raw: undefined },
          usage: {
            inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 1, text: 1, reasoning: 0 },
          },
          warnings: [],
        }),
      }),
    embeddingModel: () =>
      new MockEmbeddingModelV4({
        maxEmbeddingsPerCall: 100,
        doEmbed: async ({ values }) => ({
          embeddings: values.map(() =>
            Array.from({ length: actual.EMBEDDING_DIMENSIONS }, () => 0.01)
          ),
          usage: { tokens: 1 },
          warnings: [],
        }),
      }),
  };
});

import { prisma } from '@/lib/prisma';
import { EMBEDDING_DIMENSIONS } from '@/ai/models';
import { createSource, replaceChunks, setSourceStatus } from '../sources/sources-repository';
import { linkSource } from '../sources/projects-repository';
import { createPiece, getPiece, readPiece, updatePiece } from '../pieces/pieces-repository';
import { createRun, getRun } from '../runs/runs-repository';
import { handleRunJob } from '../runs/run-handler';
import { RUN_EXECUTORS } from '.';

const adminId = randomUUID();
let pieceId: string;

/** Same shape as run-handler.test.ts's job() helper. */
function job(kind: string, runId: string): Job<unknown> {
  return {
    id: 'j',
    name: `studio.run.${kind}`,
    data: { runId },
    expireInSeconds: 900,
    heartbeatSeconds: 60,
    signal: new AbortController().signal,
  };
}

async function run(
  kind: 'outline' | 'write' | 'translate' | 'rewrite_section',
  input = {}
) {
  const r = await createRun(prisma, { kind, createdById: adminId, pieceId, input });
  await handleRunJob(job(kind, r.id), RUN_EXECUTORS);
  return getRun(r.id);
}

beforeAll(async () => {
  await prisma.adminUser.create({
    data: { id: adminId, email: `gen-${adminId}@test.local` },
  });
  const role = await prisma.role.findUniqueOrThrow({ where: { key: 'super-admin' } });
  await prisma.userRole.create({ data: { userId: adminId, roleId: role.id } });
  const project = await prisma.studioProject.create({
    data: { name: 'gen', createdById: adminId },
  });
  const source = await createSource({
    kind: 'text',
    title: 'メモ',
    text: 'x',
    createdById: adminId,
  });
  await replaceChunks(
    source.id,
    [
      {
        ordinal: 0,
        text: '課題を一つに絞ります。',
        charStart: 0,
        charEnd: 11,
        locator: {},
        embedding: Array(EMBEDDING_DIMENSIONS).fill(0.01),
      },
    ],
    'test'
  );
  await setSourceStatus(source.id, 'ready');
  await linkSource(project.id, source.id, adminId);
  pieceId = (
    await createPiece({
      projectId: project.id,
      createdById: adminId,
      templateId: null,
      category: 'useful-info',
    })
  ).id;
  await updatePiece(pieceId, {
    stage: 'brief',
    selection: { sourceIds: [source.id], chapters: {} },
    brief: { goal: '導入手順', audience: '', keywords: [], tone: '', targetLength: 'auto' },
  });
});

afterAll(async () => {
  await prisma.studioProject.deleteMany({ where: { createdById: adminId } });
  await prisma.studioSource.deleteMany({ where: { createdById: adminId } });
  await prisma.adminUser.delete({ where: { id: adminId } });
});

describe('generation runs', () => {
  it('outline → write → translate → rewrite', async () => {
    queue.push({
      titleOptions: ['AI導入'],
      sections: [
        {
          heading: '課題',
          intent: 'why',
          chunkRefs: ['c1'],
          estChars: 200,
          kind: 'source',
        },
      ],
      gaps: [],
    });
    expect((await run('outline'))?.status).toBe('succeeded');
    let piece = readPiece((await getPiece(pieceId))!);
    expect(piece.stage).toBe('outline');
    expect(piece.outline).toHaveLength(1);

    queue.push(
      {
        blocks: [
          {
            type: 'paragraph',
            sentences: [{ text: '課題を一つに絞ります。', cite: ['c1'], connective: false }],
          },
        ],
      },
      {
        title: 'AI導入の始め方',
        excerpt: '要約',
        seo: { title: 'S', description: 'D', keywords: ['AI'] },
      }
    );
    expect((await run('write'))?.status).toBe('succeeded');
    piece = readPiece((await getPiece(pieceId))!);
    expect(piece.stage).toBe('review');
    expect(piece.sections[0].flags).toEqual([]);
    expect(piece.title).toBe('AI導入の始め方');

    queue.push(
      { heading: 'The problem', blocks: [{ type: 'paragraph', text: 'Narrow it down.' }] },
      { titleEn: 'Getting started', excerptEn: 'Summary' }
    );
    expect((await run('translate'))?.status).toBe('succeeded');
    piece = readPiece((await getPiece(pieceId))!);
    expect(piece.stage).toBe('ready');
    expect(piece.sections[0].en?.heading).toBe('The problem');

    queue.push({
      blocks: [
        {
          type: 'paragraph',
          sentences: [{ text: '課題を絞ります。', cite: ['c1'], connective: false }],
        },
      ],
    });
    expect(
      (
        await run('rewrite_section', {
          sectionId: piece.outline[0].id,
          instruction: '短く',
        })
      )?.status
    ).toBe('succeeded');
    piece = readPiece((await getPiece(pieceId))!);
    expect(piece.sections[0].enStale).toBe(true);
    expect(await prisma.studioPieceSnapshot.count({ where: { pieceId } })).toBeGreaterThanOrEqual(
      4
    );
  });

  it('fails rewrite without retry on invalid input', async () => {
    const r = await createRun(prisma, {
      kind: 'rewrite_section',
      createdById: adminId,
      pieceId,
      input: { instruction: '短く' },
    });
    await handleRunJob(job('rewrite_section', r.id), RUN_EXECUTORS);
    const finished = await getRun(r.id);
    expect(finished?.status).toBe('failed');
    expect(finished?.error).toMatch(/Invalid run input/);
  });
});
