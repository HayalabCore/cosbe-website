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

/**
 * Ingest cost is bounded by the source size: Japanese embeds at about one
 * token per character (plus chunk overlap), and each digest group may need a
 * second pass over the same passages, plus output. Five tokens per character
 * covers that worst case (see ingest-budget.test.ts); the generation default
 * would stop a large Japanese source part way.
 */
export function ingestTokenCeiling(
  chars: number,
  env: Record<string, string | undefined> = process.env
): number {
  return Math.max(runTokenCeiling(env), Math.ceil(chars * 5));
}

/**
 * Codes the worker stores as a run's error (`CODE` or `CODE:detail`) so the
 * UI can translate them; stage-rule codes (BlockReason) are used as well.
 */
export const RUN_ERROR_CODES = [
  'FORBIDDEN',
  'NO_MATERIAL',
  'TRANSLATION_SHAPE',
  'TOKEN_CEILING',
  'RUN_FAILED',
] as const;
export type RunErrorCode = (typeof RUN_ERROR_CODES)[number];

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
