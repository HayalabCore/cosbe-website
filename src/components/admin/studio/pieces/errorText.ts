import type { StudioErrorCode } from '@/lib/studio/action-types';

type T = (key: string) => string;

export function errorText(t: T, failure: { error: StudioErrorCode; reason?: string }): string {
  if (failure.reason) return failure.reason;
  const known = ['BUSY', 'LOCKED', 'NO_AUTHOR'];
  return t(`workspace.errors.${known.includes(failure.error) ? failure.error : 'FAILED'}`);
}
