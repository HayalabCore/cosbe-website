import { Prisma, type StudioSource } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { Chunk } from '../text/chunker';
import type { SourceKind, SourceMeta, SourceStatus } from './source-types';

export type CreateSourceInput = {
  kind: SourceKind;
  title: string;
  createdById: string;
  status?: SourceStatus;
  text?: string;
  articleId?: string;
  storagePath?: string;
  originUrl?: string;
  youtubeVideoId?: string;
  meta?: SourceMeta;
};

export function createSource(input: CreateSourceInput): Promise<StudioSource> {
  return prisma.studioSource.create({
    data: {
      kind: input.kind,
      title: input.title,
      status: input.status ?? 'pending',
      createdById: input.createdById,
      text: input.text ?? null,
      charCount: input.text?.length ?? 0,
      articleId: input.articleId ?? null,
      storagePath: input.storagePath ?? null,
      originUrl: input.originUrl ?? null,
      youtubeVideoId: input.youtubeVideoId ?? null,
      meta: (input.meta ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export function getSource(id: string) {
  return prisma.studioSource.findUnique({ where: { id } });
}

export function listSources(filter: {
  query?: string;
  kind?: SourceKind;
  status?: SourceStatus;
  ids?: string[];
  take?: number;
}) {
  return prisma.studioSource.findMany({
    where: {
      kind: filter.kind,
      status: filter.status,
      id: filter.ids ? { in: filter.ids } : undefined,
      title: filter.query
        ? { contains: filter.query, mode: 'insensitive' }
        : undefined,
    },
    orderBy: { createdAt: 'desc' },
    take: filter.take ?? 200,
    select: {
      id: true,
      kind: true,
      status: true,
      error: true,
      title: true,
      language: true,
      charCount: true,
      originUrl: true,
      articleId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { projects: true, chunks: true } },
    },
  });
}

export type SourceListItem = Awaited<ReturnType<typeof listSources>>[number];

export async function setSourceStatus(
  id: string,
  status: SourceStatus,
  error: string | null = null
): Promise<void> {
  await prisma.studioSource.update({ where: { id }, data: { status, error } });
}

export async function setSourceText(
  id: string,
  input: {
    text: string;
    language: string;
    contentHash: string;
    meta?: SourceMeta;
  }
): Promise<void> {
  await prisma.studioSource.update({
    where: { id },
    data: {
      text: input.text,
      charCount: input.text.length,
      language: input.language,
      contentHash: input.contentHash,
      ...(input.meta ? { meta: input.meta as Prisma.InputJsonValue } : {}),
    },
  });
}

export async function setSourceMeta(
  id: string,
  meta: SourceMeta
): Promise<void> {
  await prisma.studioSource.update({
    where: { id },
    data: { meta: meta as Prisma.InputJsonValue },
  });
}

const INSERT_BATCH = 50;

/** Deletes old chunks and inserts new ones (with vectors) atomically. */
export async function replaceChunks(
  sourceId: string,
  chunks: Array<Chunk & { embedding: number[] }>,
  embeddingModel: string
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await tx.studioSourceChunk.deleteMany({ where: { sourceId } });
      for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
        const rows = chunks.slice(i, i + INSERT_BATCH).map(
          (c) =>
            Prisma.sql`(${sourceId}::uuid, ${c.ordinal}, ${c.text}, ${c.charStart}, ${c.charEnd},
              ${JSON.stringify(c.locator)}::jsonb, ${`[${c.embedding.join(',')}]`}::vector, ${embeddingModel})`
        );
        await tx.$executeRaw`
          INSERT INTO studio_source_chunks
            (source_id, ordinal, text, char_start, char_end, locator, embedding, embedding_model)
          VALUES ${Prisma.join(rows)}`;
      }
    },
    { timeout: 60_000 }
  );
}

export function countProjectLinks(sourceId: string): Promise<number> {
  return prisma.studioProjectSource.count({ where: { sourceId } });
}

export async function deleteSource(id: string): Promise<void> {
  await prisma.studioSource.delete({ where: { id } });
}
