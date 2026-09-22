import type { PgBoss } from 'pg-boss';
import { createAndEnqueueRun } from '../queue/enqueue';

export function enqueueIngest(
  boss: PgBoss,
  sourceId: string,
  createdById: string
) {
  return createAndEnqueueRun(boss, { kind: 'ingest', sourceId, createdById });
}
