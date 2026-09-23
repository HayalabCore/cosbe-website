import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { generateStructured, type AiCallOptions } from '@/ai/generate';
import { instructions } from '@/ai/prompts/outline.v1';
import type { SearchScope } from '../retrieval/search';
import type { SourceMeta } from '../sources/source-types';
import { prisma } from '@/lib/prisma';
import { briefLines, type Brief, type OutlineSection } from './piece-types';
import { escapeMaterial } from './write-section';
import {
  aliasChunks,
  chunkIdsForOrdinals,
  listScopeChunks,
  type LoadedChunk,
} from './scope';

export type OutlineMaterial =
  | { mode: 'chunks'; chunks: LoadedChunk[] }
  | {
      mode: 'digest';
      items: Array<{
        sourceTitle: string;
        label: string;
        text: string;
        chunkIds: string[];
      }>;
    };

const MAX_DIRECT_CHARS = 60_000;

export const outlineSchema = z.object({
  titleOptions: z.array(z.string()),
  sections: z.array(
    z.object({
      heading: z.string(),
      intent: z.string(),
      chunkRefs: z.array(z.string()),
      estChars: z.number().int(),
      kind: z.enum(['source', 'boilerplate']),
    })
  ),
  gaps: z.array(z.string()),
});

/** Whole chunks when they fit; otherwise the cached digests (no truncation). */
export async function loadOutlineMaterial(
  scope: SearchScope,
  maxChars = MAX_DIRECT_CHARS
): Promise<OutlineMaterial> {
  const chunks = await listScopeChunks(scope);
  if (chunks.reduce((n, c) => n + c.text.length, 0) <= maxChars)
    return { mode: 'chunks', chunks };
  const inScope = new Set(chunks.map((c) => `${c.sourceId}:${c.ordinal}`));
  const sources = await prisma.studioSource.findMany({
    where: { id: { in: scope.sourceIds } },
    select: { id: true, title: true, meta: true },
  });
  const items: Extract<OutlineMaterial, { mode: 'digest' }>['items'] = [];
  for (const source of sources) {
    for (const section of (source.meta as SourceMeta).digest ?? []) {
      for (const point of section.points) {
        const ordinals = point.chunkOrdinals.filter((o) =>
          inScope.has(`${source.id}:${o}`)
        );
        if (ordinals.length === 0) continue;
        items.push({
          sourceTitle: source.title,
          label: section.label,
          text: point.text,
          chunkIds: await chunkIdsForOrdinals(source.id, ordinals),
        });
      }
    }
  }
  return { mode: 'digest', items };
}

function renderMaterial(
  material: OutlineMaterial,
  alias: (id: string) => string
): string {
  if (material.mode === 'chunks') {
    return material.chunks
      .map(
        (c) => `[${alias(c.id)}] (${c.sourceTitle})\n${escapeMaterial(c.text)}`
      )
      .join('\n\n');
  }
  return material.items
    .map(
      (i) =>
        `${i.chunkIds.map((id) => `[${alias(id)}]`).join('')} (${i.sourceTitle} / ${i.label}) ${escapeMaterial(i.text)}`
    )
    .join('\n');
}

export async function planOutline(
  input: {
    brief: Brief;
    template: { instructions: string } | null;
    material: OutlineMaterial;
  },
  options: AiCallOptions = {}
): Promise<{ title: string; outline: OutlineSection[]; gaps: string[] }> {
  const ids =
    input.material.mode === 'chunks'
      ? input.material.chunks.map((c) => c.id)
      : [...new Set(input.material.items.flatMap((i) => i.chunkIds))];
  const aliases = aliasChunks(ids);
  const result = await generateStructured(
    'outline',
    {
      schema: outlineSchema,
      schemaName: 'article_outline',
      instructions: instructions({
        template: input.template?.instructions ?? '',
        targetLength: input.brief.targetLength,
      }),
      prompt: [
        ...briefLines(input.brief),
        '<material>',
        renderMaterial(input.material, (id) => aliases.toAlias.get(id)!),
        '</material>',
      ]
        .filter(Boolean)
        .join('\n'),
    },
    options
  );

  const gaps = [...result.gaps];
  const outline: OutlineSection[] = [];
  for (const section of result.sections) {
    const chunkIds = section.chunkRefs
      .map((ref) => aliases.toId.get(ref.replace(/[[\]]/g, '')))
      .filter((id): id is string => Boolean(id));
    if (section.kind === 'source' && chunkIds.length === 0) {
      // A code the UI words in the admin's language; the model's own gaps
      // are free text and stay as written.
      gaps.push(`NO_MATERIAL:${section.heading}`);
      continue;
    }
    outline.push({
      id: randomUUID(),
      heading: section.heading,
      intent: section.intent,
      chunkIds,
      estChars: Math.max(0, section.estChars),
      kind: section.kind,
      stale: false,
    });
  }
  // Length against the target is not a gap: the editor sees it computed
  // live from the outline (lengthShortfall) as sections change.
  return { title: result.titleOptions[0] ?? '', outline, gaps };
}
