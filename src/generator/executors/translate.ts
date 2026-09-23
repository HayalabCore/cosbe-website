import type { RunExecutor } from '../runs/run-handler';
import { NonRetryableRunError } from '../runs/run-types';
import { isRunCancelled } from '../runs/runs-repository';
import {
  getPiece,
  readPiece,
  saveSection,
  setStage,
  takeSnapshot,
  updatePiece,
} from '../pieces/pieces-repository';
import { canTranslate } from '../pieces/stages';
import { translateMeta, translateSection } from '../pieces/translate';
import { loadPiece } from './piece-context';
import { VERSION as TRANSLATE_VERSION } from '@/ai/prompts/translate.v1';

export const translateExecutor: RunExecutor = async ({
  run,
  step,
  recordUsage,
  signal,
  ensureBudget,
}) => {
  const piece = await loadPiece(run.pieceId);
  const blocked = canTranslate(piece);
  if (blocked) throw new NonRetryableRunError(blocked);
  const usage = { onUsage: recordUsage, signal, ensureBudget };
  await step('prepare', 0, async () => {
    await takeSnapshot(piece.id, 'translate', run.id);
    await setStage(piece.id, 'translating', run.id);
    return {};
  });
  const targets = piece.sections.filter((s) => s.en === null || s.enStale);
  for (const [index, section] of targets.entries()) {
    if (await isRunCancelled(run.id)) {
      throw new NonRetryableRunError('The run was cancelled.');
    }
    await step(
      `section:${section.outlineId}`,
      index + 1,
      async () => {
        const en = await translateSection(section, usage);
        await saveSection(piece.id, { ...section, en, enStale: false }, run.id);
        return { blocks: en.blocks.length };
      },
      { promptVersion: TRANSLATE_VERSION }
    );
  }
  await step(
    'meta',
    targets.length + 1,
    async () => {
      const latest = readPiece((await getPiece(piece.id))!);
      const meta = await translateMeta(
        { title: latest.title, excerpt: latest.excerpt ?? '' },
        usage
      );
      await updatePiece(
        piece.id,
        {
          titleEn: meta.titleEn,
          excerptEn: meta.excerptEn,
          stage: 'ready',
        },
        run.id
      );
      return {};
    },
    { promptVersion: TRANSLATE_VERSION }
  );
};
