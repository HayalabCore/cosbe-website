import type { Brief, OutlineSection, PieceStage, Section, Selection } from './piece-types';

export const STAGE_ORDER: readonly PieceStage[] = [
  'sources', 'brief', 'outline', 'writing', 'review', 'translating', 'ready', 'handed_off',
];

export function canStartOutline(p: { selection: Selection; brief: Brief }): string | null {
  if (p.selection.sourceIds.length === 0) return 'Select at least one source.';
  if (!p.brief.goal.trim()) return 'Describe the goal of the article in the brief.';
  return null;
}

export function canStartWriting(p: { outline: OutlineSection[] }): string | null {
  return p.outline.length === 0 ? 'The outline has no sections.' : null;
}

export function canTranslate(p: { sections: Section[] }): string | null {
  return p.sections.length === 0 ? 'Write the article before translating it.' : null;
}

export function canHandOff(p: { stage: PieceStage; sections: Section[]; title: string }): string | null {
  if (p.stage !== 'review' && p.stage !== 'ready') return 'Finish writing before creating the draft post.';
  if (!p.title.trim()) return 'The article needs a title.';
  if (p.sections.length === 0) return 'The article has no sections.';
  return null;
}

export function isLocked(stage: PieceStage): boolean {
  return stage === 'handed_off';
}

export function stageAfterOutlineEdit(stage: PieceStage): PieceStage {
  return STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf('outline') ? 'outline' : stage;
}
