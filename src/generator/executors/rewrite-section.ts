import { z } from 'zod';
import type { RunExecutor } from '../runs/run-handler';
import { NonRetryableRunError } from '../runs/run-types';
import { sectionPlainText } from '../pieces/piece-types';
import { saveSection, takeSnapshot } from '../pieces/pieces-repository';
import { writeSection } from '../pieces/write-section';
import { loadPiece, loadTemplate, parseRunInput } from './piece-context';
import { chunksForSection } from './write';

const inputSchema = z.object({
  sectionId: z.string(),
  instruction: z.string().min(1).max(1000),
});

export const rewriteSectionExecutor: RunExecutor = async ({
  run,
  step,
  recordUsage,
  signal,
}) => {
  const piece = await loadPiece(run.pieceId);
  const input = parseRunInput(inputSchema, run.input ?? {});
  const section = piece.outline.find((o) => o.id === input.sectionId);
  const current = piece.sections.find((s) => s.outlineId === input.sectionId);
  if (!section || !current) throw new NonRetryableRunError('That section does not exist.');
  const usage = { onUsage: recordUsage, signal };
  await step('rewrite', 0, async () => {
    await takeSnapshot(piece.id, `rewrite:${section.heading}`, run.id);
    const position = piece.outline.findIndex((o) => o.id === section.id);
    const previous = piece.sections.find(
      (s) => s.outlineId === piece.outline[position - 1]?.id
    );
    const result = await writeSection(
      {
        brief: piece.brief,
        template: await loadTemplate(piece),
        outline: piece.outline,
        section,
        chunks: await chunksForSection(piece, section, usage),
        previousTail: previous ? sectionPlainText(previous).slice(-200) : '',
        instruction: input.instruction,
        current: current.blocks,
      },
      usage
    );
    await saveSection(piece.id, { ...result, en: current.en, enStale: current.en !== null });
    return { flags: result.flags.length };
  });
};
