import { prisma } from '@/lib/prisma';
import type { SearchScope } from '../retrieval/search';
import type { SourceMeta } from '../sources/source-types';
import type { PieceData } from './pieces-repository';

export type LoadedChunk = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  ordinal: number;
  text: string;
  locator: Record<string, unknown>;
};

/** Selection ∩ project links ∩ ready sources, with ticked chapters as char ranges. */
export async function buildScope(
  piece: Pick<PieceData, 'projectId' | 'selection'>
): Promise<SearchScope> {
  const rows = await prisma.studioSource.findMany({
    where: {
      id: { in: piece.selection.sourceIds },
      status: 'ready',
      projects: { some: { projectId: piece.projectId } },
    },
    select: { id: true, meta: true },
  });
  const charRanges: Record<string, Array<[number, number]>> = {};
  const omit = new Set<string>();
  for (const row of rows) {
    const ticked = piece.selection.chapters[row.id];
    if (ticked === undefined) continue;
    // An explicit empty list means "no chapter", never "whole source".
    if (ticked.length === 0) {
      omit.add(row.id);
      continue;
    }
    const chapters = (row.meta as SourceMeta).chapters ?? [];
    const ranges = ticked
      .map((i) => chapters[i])
      .filter(Boolean)
      .map((c) => [c.charStart, c.charEnd] as [number, number]);
    // Empty ranges mean "whole source" in retrieval — fail closed instead.
    if (ranges.length === 0) {
      omit.add(row.id);
      continue;
    }
    charRanges[row.id] = ranges;
  }
  const order = new Map(piece.selection.sourceIds.map((id, i) => [id, i]));
  return {
    sourceIds: rows
      .filter((r) => !omit.has(r.id))
      .map((r) => r.id)
      .sort((a, b) => order.get(a)! - order.get(b)!),
    charRanges,
  };
}

const chunkSelect = {
  id: true,
  sourceId: true,
  ordinal: true,
  text: true,
  locator: true,
  charStart: true,
  charEnd: true,
  source: { select: { title: true } },
} as const;

type ChunkRow = {
  id: string;
  sourceId: string;
  ordinal: number;
  text: string;
  locator: unknown;
  source: { title: string };
};

function toLoaded(row: ChunkRow): LoadedChunk {
  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceTitle: row.source.title,
    ordinal: row.ordinal,
    text: row.text,
    locator: row.locator as Record<string, unknown>,
  };
}

export async function getChunks(
  ids: string[],
  scope?: SearchScope
): Promise<LoadedChunk[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.studioSourceChunk.findMany({
    where: {
      id: { in: ids },
      ...(scope ? { sourceId: { in: scope.sourceIds } } : {}),
    },
    select: chunkSelect,
  });
  const byId = new Map(
    rows
      .filter((r) => {
        const ranges = scope?.charRanges?.[r.sourceId];
        return (
          !ranges?.length ||
          ranges.some(([start, end]) => r.charStart < end && r.charEnd > start)
        );
      })
      .map((r) => [r.id, toLoaded(r)])
  );
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

export async function listScopeChunks(
  scope: SearchScope
): Promise<LoadedChunk[]> {
  const rows = await prisma.studioSourceChunk.findMany({
    where: { sourceId: { in: scope.sourceIds } },
    orderBy: [{ sourceId: 'asc' }, { ordinal: 'asc' }],
    select: chunkSelect,
  });
  return rows
    .filter((r) => {
      const ranges = scope.charRanges?.[r.sourceId];
      return (
        !ranges?.length ||
        ranges.some(([s, e]) => r.charStart < e && r.charEnd > s)
      );
    })
    .map(toLoaded);
}

export async function chunkIdsForOrdinals(
  sourceId: string,
  ordinals: number[]
): Promise<string[]> {
  const rows = await prisma.studioSourceChunk.findMany({
    where: { sourceId, ordinal: { in: ordinals } },
    select: { id: true, ordinal: true },
  });
  const byOrdinal = new Map(rows.map((r) => [r.ordinal, r.id]));
  return ordinals.flatMap((o) => (byOrdinal.has(o) ? [byOrdinal.get(o)!] : []));
}

export type Aliases = {
  toAlias: Map<string, string>;
  toId: Map<string, string>;
};

/** Short per-call names so models never handle UUIDs. */
export function aliasChunks(ids: string[]): Aliases {
  const toAlias = new Map<string, string>();
  const toId = new Map<string, string>();
  ids.forEach((id, i) => {
    toAlias.set(id, `c${i + 1}`);
    toId.set(`c${i + 1}`, id);
  });
  return { toAlias, toId };
}
