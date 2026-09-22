import { z } from 'zod';
import { searchSources } from '../retrieval/search';
import type { RunExecutor } from '../runs/run-handler';
import { NonRetryableRunError } from '../runs/run-types';
import { isRunCancelled } from '../runs/runs-repository';
import { finishArticle } from '../pieces/finish';
import { sectionPlainText, type OutlineSection } from '../pieces/piece-types';
import {
  getPiece,
  readPiece,
  saveSection,
  setStage,
  takeSnapshot,
  updatePiece,
  type PieceData,
} from '../pieces/pieces-repository';
import { buildScope, getChunks, type LoadedChunk } from '../pieces/scope';
import { canStartWriting } from '../pieces/stages';
import { writeSection } from '../pieces/write-section';
import { loadPiece, loadTemplate, parseRunInput } from './piece-context';

const inputSchema = z.object({ sectionIds: z.array(z.string()).optional() });
const EXTRA_CHUNKS = 4;
const MAX_CHUNKS = 10;

/** The outline's chunks first, topped up by retrieval on the section's intent. */
export async function chunksForSection(
  piece: Pick<PieceData, 'projectId' | 'selection'>,
  section: OutlineSection,
  options: {
    onUsage?: (u: {
      inputTokens: number;
      outputTokens: number;
    }) => Promise<void>;
    signal?: AbortSignal;
    ensureBudget?: (estimatedTokens: number) => Promise<void>;
  }
): Promise<LoadedChunk[]> {
  const scope = await buildScope(piece);
  const planned = await getChunks(section.chunkIds, scope);
  if (section.kind === 'boilerplate') return planned;
  const extra = await searchSources({
    scope,
    query: `${section.heading} ${section.intent}`,
    limit: EXTRA_CHUNKS,
    ...options,
  });
  const seen = new Set(planned.map((c) => c.id));
  const more = await getChunks(
    extra.map((e) => e.id).filter((id) => !seen.has(id)),
    scope
  );
  return [...planned, ...more].slice(0, MAX_CHUNKS);
}

function tail(text: string): string {
  return text.slice(-200);
}

export const writeExecutor: RunExecutor = async ({
  run,
  step,
  recordUsage,
  signal,
  ensureBudget,
}) => {
  let piece = await loadPiece(run.pieceId);
  const blocked = canStartWriting(piece);
  if (blocked) throw new NonRetryableRunError(blocked);
  const input = parseRunInput(inputSchema, run.input ?? {});
  const written = new Set(piece.sections.map((s) => s.outlineId));
  const targets = piece.outline.filter((o) =>
    input.sectionIds
      ? input.sectionIds.includes(o.id)
      : !written.has(o.id) || o.stale
  );

  await step('prepare', 0, async () => {
    await takeSnapshot(piece.id, 'write', run.id);
    await setStage(piece.id, 'writing', run.id);
    return { targets: targets.length };
  });
  const template = await loadTemplate(piece);
  const usage = { onUsage: recordUsage, signal, ensureBudget };

  for (const [index, section] of targets.entries()) {
    if (await isRunCancelled(run.id)) {
      throw new NonRetryableRunError('The run was cancelled.');
    }
    await step(`section:${section.id}`, index + 1, async () => {
      piece = readPiece((await getPiece(piece.id))!);
      const position = piece.outline.findIndex((o) => o.id === section.id);
      const previous = piece.sections.find(
        (s) => s.outlineId === piece.outline[position - 1]?.id
      );
      const result = await writeSection(
        {
          brief: piece.brief,
          template,
          outline: piece.outline,
          section,
          chunks: await chunksForSection(piece, section, usage),
          previousTail: previous ? tail(sectionPlainText(previous)) : '',
        },
        usage
      );
      await saveSection(piece.id, result, run.id);
      await updatePiece(
        piece.id,
        {
          outline: piece.outline.map((o) =>
            o.id === section.id ? { ...o, stale: false } : o
          ),
        },
        run.id
      );
      return { flags: result.flags.length };
    });
  }

  await step('finish', targets.length + 1, async () => {
    piece = readPiece((await getPiece(piece.id))!);
    const finish = await finishArticle(piece.sections, piece.brief, usage);
    await updatePiece(
      piece.id,
      {
        title: finish.title,
        excerpt: finish.excerpt,
        seo: finish.seo,
        stage: 'review',
      },
      run.id
    );
    return { title: finish.title };
  });
};
