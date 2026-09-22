import { Prisma } from '@prisma/client';
import { embedTexts, type UsageSink } from '@/ai/generate';
import { prisma } from '@/lib/prisma';
import { mergeRrf } from './rrf';

export type SearchScope = {
  sourceIds: string[];
  /** Per-source [start, end) character ranges, e.g. ticked chapters. */
  charRanges?: Record<string, Array<[number, number]>>;
};

export type RetrievedChunk = {
  id: string;
  sourceId: string;
  ordinal: number;
  text: string;
  charStart: number;
  charEnd: number;
  locator: Record<string, unknown>;
  score: number;
};

const CANDIDATES = 30;

type Row = Omit<RetrievedChunk, 'score'>;

function scopeSql(scope: SearchScope): Prisma.Sql {
  const perSource = scope.sourceIds.map((id) => {
    const ranges = scope.charRanges?.[id];
    if (!ranges?.length) return Prisma.sql`c.source_id = ${id}::uuid`;
    const overlaps = ranges.map(
      ([start, end]) =>
        Prisma.sql`(c.char_start < ${end} AND c.char_end > ${start})`
    );
    return Prisma.sql`(c.source_id = ${id}::uuid AND (${Prisma.join(overlaps, ' OR ')}))`;
  });
  return Prisma.sql`s.status = 'ready' AND (${Prisma.join(perSource, ' OR ')})`;
}

const COLUMNS = Prisma.sql`c.id, c.source_id AS "sourceId", c.ordinal, c.text,
  c.char_start AS "charStart", c.char_end AS "charEnd", c.locator`;

export async function searchChunks(input: {
  scope: SearchScope;
  query: string;
  queryEmbedding: number[];
  limit?: number;
}): Promise<RetrievedChunk[]> {
  if (input.scope.sourceIds.length === 0) return [];
  const where = scopeSql(input.scope);
  const vector = `[${input.queryEmbedding.join(',')}]`;

  const [semantic, keyword] = await Promise.all([
    prisma.$queryRaw<Row[]>`
      SELECT ${COLUMNS} FROM studio_source_chunks c
      JOIN studio_sources s ON s.id = c.source_id
      WHERE ${where} AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${vector}::vector
      LIMIT ${CANDIDATES}`,
    input.query.trim()
      ? prisma.$queryRaw<Row[]>`
          SELECT ${COLUMNS} FROM studio_source_chunks c
          JOIN studio_sources s ON s.id = c.source_id
          WHERE ${where} AND c.text &@~ ${input.query}
          ORDER BY pgroonga_score(c.tableoid, c.ctid) DESC
          LIMIT ${CANDIDATES}`
      : Promise.resolve([] as Row[]),
  ]);

  const byId = new Map<string, Row>();
  for (const row of [...semantic, ...keyword]) byId.set(row.id, row);
  return mergeRrf([semantic.map((r) => r.id), keyword.map((r) => r.id)])
    .slice(0, input.limit ?? 12)
    .map(({ id, score }) => ({ ...byId.get(id)!, score }));
}

/** Embeds the query, then searches. Used by outline/writing (P1c) and the agent (P1d). */
export async function searchSources(input: {
  scope: SearchScope;
  query: string;
  limit?: number;
  onUsage?: UsageSink;
  signal?: AbortSignal;
}): Promise<RetrievedChunk[]> {
  const [queryEmbedding] = await embedTexts([input.query], {
    onUsage: input.onUsage,
    signal: input.signal,
  });
  return searchChunks({ ...input, queryEmbedding });
}
