import type { PieceStage } from '@/generator/pieces/piece-types';

/**
 * What the editor sees: four steps. The engine's eight stages include
 * machine states (writing, translating) that are shown as progress inside
 * a step, not as steps of their own.
 */
export const STEPS = ['setup', 'outline', 'draft', 'handoff'] as const;
export type Step = (typeof STEPS)[number];

const STEP_OF: Record<PieceStage, Step> = {
  sources: 'setup',
  brief: 'setup',
  outline: 'outline',
  writing: 'draft',
  review: 'draft',
  translating: 'handoff',
  ready: 'handoff',
  handed_off: 'handoff',
};

export function stepOf(stage: PieceStage): Step {
  return STEP_OF[stage];
}

export function stepIndex(step: Step): number {
  return STEPS.indexOf(step);
}

/**
 * Steps up to the piece's own can be opened; later ones are not ready yet.
 * A reviewed draft can go on to the handoff without anything else happening.
 */
export function canOpen(step: Step, stage: PieceStage): boolean {
  if (step === 'handoff' && stage === 'review') return true;
  return stepIndex(step) <= stepIndex(stepOf(stage));
}
