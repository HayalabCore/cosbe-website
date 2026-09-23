'use server';

import { z } from 'zod';
import { requirePermission } from '@/lib/authz';
import { getWebBoss } from '@/lib/studio/web-boss';
import { createAndEnqueueRun } from '@/generator/queue/enqueue';
import { getRun } from '@/generator/runs/runs-repository';
import { toRunStatusDTO } from '@/lib/studio/run-dto';
import type { RunStatusDTO, StudioResult } from '@/lib/studio/action-types';

/** A deployment check for whoever runs the worker, not an editing tool. */
export async function startSystemCheckAction(): Promise<
  StudioResult<{ runId: string }>
> {
  const ctx = await requirePermission('studio.system');
  try {
    const run = await createAndEnqueueRun(await getWebBoss(), {
      kind: 'system_check',
      createdById: ctx.admin.id,
    });
    return { ok: true, data: { runId: run.id } };
  } catch (error) {
    console.error('[startSystemCheckAction]', error);
    return { ok: false, error: 'FAILED' };
  }
}

export async function getRunStatusAction(
  runId: string
): Promise<StudioResult<RunStatusDTO>> {
  await requirePermission('studio.use');
  const parsed = z.uuid().safeParse(runId);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const run = await getRun(parsed.data);
  if (!run) return { ok: false, error: 'NOT_FOUND' };
  return { ok: true, data: toRunStatusDTO(run) };
}
