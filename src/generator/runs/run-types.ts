import type { Permission } from '@/lib/permissions';

/** Later plans append kinds (ingest, outline, write, ...). */
export const RUN_KINDS = [
  'system_check',
  'ingest',
  'outline',
  'write',
  'rewrite_section',
  'translate',
] as const;
export type RunKind = (typeof RUN_KINDS)[number];

export function isRunKind(value: string): value is RunKind {
  return (RUN_KINDS as readonly string[]).includes(value);
}

export const RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

const TERMINAL: readonly string[] = ['succeeded', 'failed', 'cancelled'];

export function isTerminalRunStatus(status: string): boolean {
  return TERMINAL.includes(status);
}

/** Permission the run's creator must still hold when the worker executes it. */
export const RUN_KIND_PERMISSION: Record<RunKind, Permission> = {
  system_check: 'studio.use',
  ingest: 'studio.use',
  outline: 'studio.use',
  write: 'studio.use',
  rewrite_section: 'studio.use',
  translate: 'studio.use',
};

const DEFAULT_TOKEN_CEILING = 400_000;

export function runTokenCeiling(
  env: Record<string, string | undefined> = process.env
): number {
  const value = Number(env.STUDIO_RUN_TOKEN_CEILING);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_TOKEN_CEILING;
}

/** Thrown by executors for failures a retry cannot fix (bad input, missing data). */
export class NonRetryableRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableRunError';
  }
}

const MAX_ERROR_LENGTH = 2000;

export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}
