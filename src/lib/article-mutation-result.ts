export const SLUG_CONFLICT_ERROR = 'SLUG_CONFLICT';
export const SAVE_FAILED_ERROR = 'SAVE_FAILED';

export type ArticleMutationResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string };

export function isArticleMutationFailure(
  value: unknown
): value is Extract<ArticleMutationResult, { ok: false }> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    (value as { ok: unknown }).ok === false &&
    'error' in value &&
    typeof (value as { error: unknown }).error === 'string'
  );
}
