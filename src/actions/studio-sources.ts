'use server';

import { z } from 'zod';
import { requirePermission } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { getWebBoss } from '@/lib/studio/web-boss';
import type { StudioResult } from '@/lib/studio/action-types';
import { toSourceDTO, type SourceDTO } from '@/lib/studio/source-dto';
import {
  createPdfUploadUrl,
  MAX_PDF_BYTES,
  pdfObjectExists,
  pdfStoragePath,
  removeSourceObject,
} from '@/lib/studio/source-storage';
import { enqueueIngest } from '@/generator/sources/enqueue-ingest';
import { linkSource } from '@/generator/sources/projects-repository';
import { MAX_TEXT_SOURCE_CHARS } from '@/generator/sources/source-types';
import {
  countProjectLinks,
  createSource,
  deleteSource,
  getSource,
  listSources,
  setSourceStatus,
} from '@/generator/sources/sources-repository';

const id = z.uuid();
const projectId = z.uuid().optional();

const QUEUE_FAILED = 'Could not queue processing.';

/** A missing or archived project must not receive a new source. */
async function projectIsOpen(projectId: string): Promise<boolean> {
  const project = await prisma.studioProject.findUnique({
    where: { id: projectId },
    select: { archivedAt: true },
  });
  return Boolean(project && !project.archivedAt);
}

/**
 * Links the new source, then queues ingest. A failed link deletes the row.
 * A failed enqueue marks it failed so it is never left pending without a job.
 */
async function afterCreate(sourceId: string, userId: string, project?: string) {
  try {
    if (project) await linkSource(project, sourceId, userId);
  } catch (error) {
    await deleteSource(sourceId);
    throw error;
  }
  try {
    await enqueueIngest(await getWebBoss(), sourceId, userId);
  } catch (error) {
    await setSourceStatus(sourceId, 'failed', QUEUE_FAILED);
    throw error;
  }
}

export async function listSourcesAction(
  query?: string
): Promise<StudioResult<SourceDTO[]>> {
  await requirePermission('studio.use');
  const rows = await listSources({ query: query?.trim() || undefined });
  return { ok: true, data: rows.map(toSourceDTO) };
}

export async function createTextSourceAction(input: {
  title: string;
  text: string;
  projectId?: string;
}): Promise<StudioResult<{ sourceId: string }>> {
  const ctx = await requirePermission('studio.use');
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(200),
      text: z.string().trim().min(1).max(MAX_TEXT_SOURCE_CHARS),
      projectId,
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  if (parsed.data.projectId && !(await projectIsOpen(parsed.data.projectId))) {
    return { ok: false, error: 'NOT_FOUND' };
  }
  try {
    const source = await createSource({
      kind: 'text',
      title: parsed.data.title,
      text: parsed.data.text,
      createdById: ctx.admin.id,
    });
    await afterCreate(source.id, ctx.admin.id, parsed.data.projectId);
    return { ok: true, data: { sourceId: source.id } };
  } catch (error) {
    console.error('[createTextSourceAction]', error);
    return { ok: false, error: 'FAILED' };
  }
}

export async function createArticleSourceAction(input: {
  articleId: string;
  projectId?: string;
}): Promise<StudioResult<{ sourceId: string }>> {
  const ctx = await requirePermission('studio.use');
  const parsed = z.object({ articleId: id, projectId }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const article = await prisma.article.findUnique({
    where: { id: parsed.data.articleId },
    select: { id: true, title: true },
  });
  if (!article) return { ok: false, error: 'NOT_FOUND' };
  if (parsed.data.projectId && !(await projectIsOpen(parsed.data.projectId))) {
    return { ok: false, error: 'NOT_FOUND' };
  }
  try {
    const source = await createSource({
      kind: 'article',
      title: article.title,
      articleId: article.id,
      createdById: ctx.admin.id,
    });
    await afterCreate(source.id, ctx.admin.id, parsed.data.projectId);
    return { ok: true, data: { sourceId: source.id } };
  } catch (error) {
    console.error('[createArticleSourceAction]', error);
    return { ok: false, error: 'FAILED' };
  }
}

export async function listArticleChoicesAction(
  query: string
): Promise<
  StudioResult<Array<{ id: string; title: string; category: string }>>
> {
  await requirePermission('studio.use');
  const rows = await prisma.article.findMany({
    where: {
      status: { in: ['published', 'draft'] },
      title: query.trim()
        ? { contains: query.trim(), mode: 'insensitive' }
        : undefined,
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: { id: true, title: true, category: true },
  });
  return { ok: true, data: rows };
}

export async function startPdfUploadAction(input: {
  filename: string;
  size: number;
  projectId?: string;
}): Promise<StudioResult<{ sourceId: string; path: string; token: string }>> {
  const ctx = await requirePermission('studio.use');
  const parsed = z
    .object({
      filename: z
        .string()
        .min(1)
        .max(300)
        .regex(/\.pdf$/i),
      size: z.number().int().positive(),
      projectId,
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  if (parsed.data.size > MAX_PDF_BYTES)
    return { ok: false, error: 'TOO_LARGE' };
  if (parsed.data.projectId && !(await projectIsOpen(parsed.data.projectId))) {
    return { ok: false, error: 'NOT_FOUND' };
  }
  let sourceId: string | null = null;
  try {
    const source = await createSource({
      kind: 'pdf',
      title: parsed.data.filename.replace(/\.pdf$/i, ''),
      createdById: ctx.admin.id,
      meta: { fileSize: parsed.data.size },
    });
    sourceId = source.id;
    const path = pdfStoragePath(source.id, parsed.data.filename);
    await prisma.studioSource.update({
      where: { id: source.id },
      data: { storagePath: path },
    });
    const signed = await createPdfUploadUrl(path);
    if (parsed.data.projectId)
      await linkSource(parsed.data.projectId, source.id, ctx.admin.id);
    return {
      ok: true,
      data: { sourceId: source.id, path: signed.path, token: signed.token },
    };
  } catch (error) {
    console.error('[startPdfUploadAction]', error);
    // Nothing was uploaded yet, so drop the row rather than leave it pending.
    if (sourceId) {
      try {
        await deleteSource(sourceId);
      } catch (cleanupError) {
        console.error('[startPdfUploadAction] cleanup', cleanupError);
      }
    }
    return { ok: false, error: 'FAILED' };
  }
}

/** Called after the browser finished uploading. PDFs are stored, not ingested (P1). */
export async function finishPdfUploadAction(
  sourceId: string
): Promise<StudioResult<undefined>> {
  await requirePermission('studio.use');
  if (!id.safeParse(sourceId).success)
    return { ok: false, error: 'INVALID_INPUT' };
  const source = await getSource(sourceId);
  if (!source || source.kind !== 'pdf' || !source.storagePath)
    return { ok: false, error: 'NOT_FOUND' };
  if (!(await pdfObjectExists(source.storagePath))) {
    await setSourceStatus(sourceId, 'failed', 'The upload did not complete.');
    return { ok: false, error: 'FAILED' };
  }
  await setSourceStatus(sourceId, 'stored');
  return { ok: true, data: undefined };
}

export async function retryIngestAction(
  sourceId: string
): Promise<StudioResult<undefined>> {
  const ctx = await requirePermission('studio.use');
  if (!id.safeParse(sourceId).success)
    return { ok: false, error: 'INVALID_INPUT' };
  const source = await getSource(sourceId);
  if (!source) return { ok: false, error: 'NOT_FOUND' };
  if (
    source.kind === 'pdf' ||
    source.status === 'pending' ||
    source.status === 'processing'
  )
    return { ok: false, error: 'INVALID_INPUT' };
  await setSourceStatus(sourceId, 'pending');
  try {
    await enqueueIngest(await getWebBoss(), sourceId, ctx.admin.id);
  } catch (error) {
    console.error('[retryIngestAction]', error);
    await setSourceStatus(sourceId, 'failed', QUEUE_FAILED);
    return { ok: false, error: 'FAILED' };
  }
  return { ok: true, data: undefined };
}

export async function deleteSourceAction(
  sourceId: string
): Promise<StudioResult<undefined>> {
  const ctx = await requirePermission('studio.use');
  if (!id.safeParse(sourceId).success)
    return { ok: false, error: 'INVALID_INPUT' };
  const source = await getSource(sourceId);
  if (!source) return { ok: false, error: 'NOT_FOUND' };
  if (
    (await countProjectLinks(sourceId)) > 0 &&
    !ctx.actor.permissions.has('studio.sources.delete')
  ) {
    return { ok: false, error: 'LINKED' };
  }
  if (source.storagePath) await removeSourceObject(source.storagePath);
  await deleteSource(sourceId);
  return { ok: true, data: undefined };
}
