import { BLOCK_REASONS } from '@/generator/pieces/stages';
import { RUN_ERROR_CODES } from '@/generator/runs/run-types';
import type { StudioErrorCode } from '@/lib/studio/action-types';

type T = (key: string, values?: Record<string, string>) => string;

const REASONS: readonly string[] = [...BLOCK_REASONS, 'DEFAULT_TEMPLATE'];
const ERRORS: readonly string[] = [
  'BUSY',
  'LOCKED',
  'NO_AUTHOR',
  'INVALID_INPUT',
  'NOT_FOUND',
  'FORBIDDEN',
];

/** An action's failure, in the admin's language. */
export function errorText(
  t: T,
  failure: { error: StudioErrorCode; reason?: string }
): string {
  if (failure.reason && REASONS.includes(failure.reason))
    return t(`workspace.reasons.${failure.reason}`);
  return t(
    `workspace.errors.${ERRORS.includes(failure.error) ? failure.error : 'FAILED'}`
  );
}

/** A run's stored error (`CODE` or `CODE:detail`); raw provider text stays out of the UI. */
export function runErrorText(t: T, error: string): string {
  const at = error.indexOf(':');
  const code = at === -1 ? error : error.slice(0, at);
  const detail = at === -1 ? '' : error.slice(at + 1);
  if ((BLOCK_REASONS as readonly string[]).includes(code))
    return t(`workspace.reasons.${code}`);
  if ((RUN_ERROR_CODES as readonly string[]).includes(code))
    return t(`workspace.runErrors.${code}`, { detail });
  return t('workspace.runErrors.RUN_FAILED', { detail: '' });
}

/** Snapshots written before these keys existed used free text. */
const LEGACY_HISTORY: Record<string, string> = {
  'edit outline': 'edit_outline',
  'change sources': 'change_sources',
  'before undo': 'before_undo',
};
const HISTORY = [
  'outline',
  'write',
  'translate',
  'edit_outline',
  'change_sources',
  'before_undo',
  'edit_text',
];

export function historyLabel(t: T, reason: string): string {
  if (reason.startsWith('rewrite:'))
    return t('workspace.history.rewrite', { heading: reason.slice(8) });
  const key = LEGACY_HISTORY[reason] ?? reason;
  return HISTORY.includes(key) ? t(`workspace.history.${key}`) : reason;
}

/** Rows written before gaps became codes, and a check that now runs live. */
const LEGACY_NO_MATERIAL = /^No source material for 「(.+)」\.$/;
const LEGACY_LENGTH = /^The sources support about \d+ characters/;

/**
 * One outline gap for display. The model's own gaps are shown as written;
 * codes are worded in the admin's language; the old length sentence is
 * dropped because the outline step computes that warning itself.
 */
export function gapText(t: T, gap: string): string | null {
  if (LEGACY_LENGTH.test(gap)) return null;
  const heading = gap.startsWith('NO_MATERIAL:')
    ? gap.slice('NO_MATERIAL:'.length)
    : LEGACY_NO_MATERIAL.exec(gap)?.[1];
  return heading === undefined ? gap : t('outline.gapNoMaterial', { heading });
}
