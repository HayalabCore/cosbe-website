import type { PgBoss } from 'pg-boss';
import { createAndEnqueueRun } from '../queue/enqueue';
import { ingestTokenCeiling } from '../runs/run-types';
import { MAX_TEXT_SOURCE_CHARS } from './source-types';

/** `chars` is the source's text length; unknown sizes get the largest allowed. */
export function enqueueIngest(
  boss: PgBoss,
  sourceId: string,
  createdById: string,
  chars: number = MAX_TEXT_SOURCE_CHARS
) {
  return createAndEnqueueRun(boss, {
    kind: 'ingest',
    sourceId,
    createdById,
    tokenCeiling: ingestTokenCeiling(chars),
  });
}
