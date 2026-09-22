import type { RunExecutor } from '../runs/run-handler';
import { NonRetryableRunError } from '../runs/run-types';
import { loadOutlineMaterial, planOutline } from '../pieces/outline';
import { buildScope } from '../pieces/scope';
import { canStartOutline } from '../pieces/stages';
import { takeSnapshot, updatePiece } from '../pieces/pieces-repository';
import { loadPiece, loadTemplate } from './piece-context';

export const outlineExecutor: RunExecutor = async ({
  run,
  step,
  recordUsage,
  signal,
}) => {
  const piece = await loadPiece(run.pieceId);
  const blocked = canStartOutline(piece);
  if (blocked) throw new NonRetryableRunError(blocked);
  await step('outline', 0, async () => {
    const scope = await buildScope(piece);
    if (scope.sourceIds.length === 0)
      throw new NonRetryableRunError('None of the selected sources is ready.');
    const material = await loadOutlineMaterial(scope);
    const result = await planOutline(
      { brief: piece.brief, template: await loadTemplate(piece), material },
      { onUsage: recordUsage, signal }
    );
    await takeSnapshot(piece.id, 'outline', run.id);
    await updatePiece(
      piece.id,
      {
        outline: result.outline,
        gaps: result.gaps,
        title: result.title,
        sections: [],
        stage: 'outline',
      },
      run.id
    );
    return { sections: result.outline.length, gaps: result.gaps.length };
  });
};
