import { Prisma } from '@prisma/client';
import { embedTexts, type UsageSink } from '@/ai/generate';
import { prisma } from '@/lib/prisma';
import { keywordTerms } from './keywords';
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

/**
 * Exact scan over the scope. The HNSW index filters only after its
 * nearest-neighbour search, so a project's few sources inside a large library
 * would get few or no hits. Scopes are small (≤ 40 sources).
 */
export function semanticSql(scope: SearchScope, queryEmbedding: number[]): Prisma.Sql {
  const vector = `[${queryEmbedding.join(',')}]`;
  // Only ids and distances are materialized; text and columns are joined
  // back for the few winners, so a large scope never copies every chunk.
  return Prisma.sql`
      WITH scoped AS MATERIALIZED (
        SELECT c.id, c.embedding <=> ${vector}::vector AS distance
        FROM studio_source_chunks c
        JOIN studio_sources s ON s.id = c.source_id
        WHERE ${scopeSql(scope)} AND c.embedding IS NOT NULL
      ),
      nearest AS (
        SELECT id, distance FROM scoped ORDER BY distance LIMIT ${CANDIDATES}
      )
      SELECT ${COLUMNS} FROM nearest n
      JOIN studio_source_chunks c ON c.id = n.id
      ORDER BY n.distance`;
}

export async function searchChunks(input: {
  scope: SearchScope;
  query: string;
  queryEmbedding: number[];
  limit?: number;
  /** Tests pass a transaction; production uses the shared client. */
  db?: Prisma.TransactionClient;
}): Promise<RetrievedChunk[]> {
  if (input.scope.sourceIds.length === 0) return [];
  const db = input.db ?? prisma;
  const where = scopeSql(input.scope);
  const terms = keywordTerms(input.query);

  const [semantic, keyword] = await Promise.all([
    db.$queryRaw<Row[]>(semanticSql(input.scope, input.queryEmbedding)),
    // Any-keyword match on literal terms: no query syntax reaches Groonga.
    terms.length > 0
      ? db.$queryRaw<Row[]>`
          SELECT ${COLUMNS} FROM studio_source_chunks c
          JOIN studio_sources s ON s.id = c.source_id
          WHERE ${where} AND c.text &@| ${terms}::text[]
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
  ensureBudget?: (estimatedTokens: number) => Promise<void>;
}): Promise<RetrievedChunk[]> {
  if (input.scope.sourceIds.length === 0) return [];
  const [queryEmbedding] = await embedTexts([input.query], {
    onUsage: input.onUsage,
    signal: input.signal,
    ensureBudget: input.ensureBudget,
  });
  return searchChunks({ ...input, queryEmbedding });
}
