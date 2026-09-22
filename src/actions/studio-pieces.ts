'use server';

import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { withPieceLock } from '@/generator/pieces/piece-lock';
import { cancelPieceRuns } from '@/generator/runs/runs-repository';
import { z } from 'zod';
import { requirePermission } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { createArticleRecord } from '@/lib/articles';
import { allocateUniqueSlug } from '@/lib/articles-repository';
import { generateSlug } from '@/lib/article-utils';
import { revalidateArticlePaths } from '@/lib/article-revalidation';
import {
  createArticleSchema,
  toCreateArticlePayload,
} from '@/lib/validation/article';
import { getWebBoss } from '@/lib/studio/web-boss';
import type { StudioResult } from '@/lib/studio/action-types';
import {
  toActiveRunDTO,
  toPieceDTO,
  type PieceDTO,
  type PieceListItemDTO,
} from '@/lib/studio/piece-dto';
import {
  createAndEnqueueRun,
  PieceRunConflictError,
} from '@/generator/queue/enqueue';
import { runTokenCeiling } from '@/generator/runs/run-types';
import {
  createPiece,
  getDefaultTemplate,
  getPiece,
  listPieces,
  listSnapshots,
  listTemplates,
  readPiece,
  restoreSnapshot,
  takeSnapshot,
  updatePiece,
  type PieceData,
} from '@/generator/pieces/pieces-repository';
import {
  briefSchema,
  selectionSchema,
  type OutlineSection,
  type PieceStage,
} from '@/generator/pieces/piece-types';
import {
  canHandOff,
  canStartOutline,
  canStartWriting,
  canTranslate,
  isLocked,
  stageAfterOutlineEdit,
} from '@/generator/pieces/stages';
import { toArticleBlocks } from '@/generator/pieces/to-article-blocks';
import { getChunks } from '@/generator/pieces/scope';
import { listProjectSources } from '@/generator/sources/projects-repository';
import { ARTICLE_CREATE_CATEGORIES } from '@/lib/api/article-create-metadata';
import type { ContentCategory } from '@/types';

const uuid = z.uuid();
const ACTIVE = ['queued', 'running'];
type Fail = {
  ok: false;
  error: 'NOT_FOUND' | 'LOCKED' | 'BUSY' | 'INVALID_INPUT';
};

async function loadEditable(
  id: string,
  opts: { allowBusy?: boolean } = {},
  db: Prisma.TransactionClient = prisma
): Promise<PieceData | Fail> {
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  const row = await getPiece(id, db);
  if (!row) return { ok: false, error: 'NOT_FOUND' };
  const piece = readPiece(row);
  if (isLocked(piece.stage)) return { ok: false, error: 'LOCKED' };
  if (!opts.allowBusy && (await activeRun(id, db)))
    return { ok: false, error: 'BUSY' };
  return piece;
}

const isFail = (value: PieceData | Fail): value is Fail => 'ok' in value;

function activeRun(pieceId: string, db: Prisma.TransactionClient = prisma) {
  return db.studioRun.findFirst({
    where: { pieceId, status: { in: ACTIVE } },
    orderBy: { createdAt: 'desc' },
    include: { steps: { orderBy: { ordinal: 'asc' } } },
  });
}

async function enqueue(
  piece: PieceData,
  userId: string,
  kind: 'outline' | 'write' | 'translate' | 'rewrite_section',
  input: Record<string, unknown> = {}
): Promise<StudioResult<{ runId: string }>> {
  try {
    const run = await createAndEnqueueRun(await getWebBoss(), {
      kind,
      pieceId: piece.id,
      createdById: userId,
      input: input as never,
      tokenCeiling: runTokenCeiling(),
    });
    return { ok: true, data: { runId: run.id } };
  } catch (error) {
    if (error instanceof PieceRunConflictError)
      return { ok: false, error: error.reason };
    console.error('[studio-pieces enqueue]', error);
    return { ok: false, error: 'FAILED' };
  }
}

export async function listPiecesAction(
  filter: { projectId?: string } = {}
): Promise<StudioResult<PieceListItemDTO[]>> {
  await requirePermission('studio.use');
  const rows = await listPieces(filter);
  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.id,
      title: row.title,
      projectName: row.project.name,
      stage: row.stage as PieceStage,
      articleStatus: row.article?.status ?? null,
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function createPieceAction(input: {
  projectId: string;
}): Promise<StudioResult<{ pieceId: string }>> {
  const ctx = await requirePermission('studio.use');
  if (!uuid.safeParse(input.projectId).success)
    return { ok: false, error: 'INVALID_INPUT' };
  const project = await prisma.studioProject.findUnique({
    where: { id: input.projectId },
  });
  if (!project || project.archivedAt) return { ok: false, error: 'NOT_FOUND' };
  const template = await getDefaultTemplate();
  const piece = await createPiece({
    projectId: project.id,
    createdById: ctx.admin.id,
    templateId: template?.id ?? null,
    category: template?.defaultCategory ?? 'useful-info',
  });
  return { ok: true, data: { pieceId: piece.id } };
}

export async function getPieceAction(
  id: string
): Promise<StudioResult<PieceDTO>> {
  await requirePermission('studio.use');
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  const row = await getPiece(id);
  if (!row) return { ok: false, error: 'NOT_FOUND' };
  const piece = readPiece(row);
  const [run, last, article] = await Promise.all([
    activeRun(id),
    prisma.studioRun.findFirst({
      where: { pieceId: id },
      orderBy: { createdAt: 'desc' },
      select: { status: true, error: true },
    }),
    piece.articleId
      ? prisma.article.findUnique({
          where: { id: piece.articleId },
          select: { id: true, status: true, slug: true },
        })
      : null,
  ]);
  return {
    ok: true,
    data: toPieceDTO(piece, {
      activeRun: toActiveRunDTO(run),
      lastRunError: last?.status === 'failed' ? last.error : null,
      article,
    }),
  };
}

const setupSchema = z.object({
  selection: selectionSchema.optional(),
  brief: briefSchema.optional(),
  templateId: z.uuid().nullable().optional(),
  category: z.enum(ARTICLE_CREATE_CATEGORIES).optional(),
  authorId: z.uuid().nullable().optional(),
});

export async function updatePieceSetupAction(
  id: string,
  patch: z.input<typeof setupSchema>
): Promise<StudioResult<undefined>> {
  await requirePermission('studio.use');
  const parsed = setupSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  return withPieceLock(id, async (tx) => {
    const piece = await loadEditable(id, {}, tx);
    if (isFail(piece)) return piece;
    let stage = piece.stage;
    if (parsed.data.selection && (stage === 'sources' || stage === 'brief')) {
      stage = parsed.data.selection.sourceIds.length > 0 ? 'brief' : 'sources';
    }
    const scopeChanged =
      parsed.data.selection &&
      JSON.stringify(parsed.data.selection) !== JSON.stringify(piece.selection);
    if (scopeChanged) {
      await takeSnapshot(id, 'change sources', undefined, tx);
      stage =
        parsed.data.selection!.sourceIds.length === 0
          ? 'sources'
          : piece.outline.length > 0
            ? 'outline'
            : 'brief';
    }
    await updatePiece(
      id,
      {
        ...parsed.data,
        stage,
        ...(scopeChanged
          ? {
              outline: piece.outline.map((o) => ({ ...o, stale: true })),
              sections: [],
              titleEn: null,
              excerpt: null,
              excerptEn: null,
              seo: null,
            }
          : {}),
      },
      undefined,
      tx
    );
    return { ok: true, data: undefined };
  });
}

const RULES = {
  outline: canStartOutline,
  write: canStartWriting,
  translate: canTranslate,
} as const;

export async function startRunAction(
  id: string,
  kind: keyof typeof RULES
): Promise<StudioResult<{ runId: string }>> {
  const ctx = await requirePermission('studio.use');
  const piece = await loadEditable(id);
  if (isFail(piece)) return piece;
  const blocked = RULES[kind](piece as never);
  if (blocked) return { ok: false, error: 'BLOCKED', reason: blocked };
  return enqueue(piece, ctx.admin.id, kind);
}

export async function rewriteSectionAction(
  id: string,
  input: { sectionId: string; instruction: string }
): Promise<StudioResult<{ runId: string }>> {
  const ctx = await requirePermission('studio.use');
  const parsed = z
    .object({
      sectionId: z.string().min(1),
      instruction: z.string().trim().min(1).max(1000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const piece = await loadEditable(id);
  if (isFail(piece)) return piece;
  if (!piece.sections.some((s) => s.outlineId === parsed.data.sectionId))
    return { ok: false, error: 'NOT_FOUND' };
  return enqueue(piece, ctx.admin.id, 'rewrite_section', parsed.data);
}

const outlineRowSchema = z.object({
  id: z.string().optional(),
  heading: z.string().trim().min(1).max(200),
  intent: z.string().max(1000),
  chunkIds: z.array(z.string()).max(50),
  kind: z.enum(['source', 'boilerplate']),
  estChars: z.number().int().nonnegative(),
});

export async function saveOutlineAction(
  id: string,
  rows: z.input<typeof outlineRowSchema>[]
): Promise<StudioResult<undefined>> {
  await requirePermission('studio.use');
  const parsed = z.array(outlineRowSchema).max(30).safeParse(rows);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  return withPieceLock(id, async (tx) => {
    const piece = await loadEditable(id, {}, tx);
    if (isFail(piece)) return piece;
    const previous = new Map(
      piece.outline.map((o, i) => [o.id, { section: o, index: i }])
    );
    const outline: OutlineSection[] = parsed.data.map((row, index) => {
      const before = row.id ? previous.get(row.id) : undefined;
      const changed =
        !before ||
        before.index !== index ||
        before.section.heading !== row.heading ||
        before.section.intent !== row.intent ||
        before.section.chunkIds.join() !== row.chunkIds.join();
      return {
        id: before ? before.section.id : randomUUID(),
        heading: row.heading,
        intent: row.intent,
        chunkIds: row.chunkIds,
        kind: row.kind,
        estChars: row.estChars,
        stale: before ? before.section.stale || changed : false,
      };
    });
    const kept = new Set(outline.map((o) => o.id));
    await takeSnapshot(id, 'edit outline', undefined, tx);
    await updatePiece(
      id,
      {
        outline,
        sections: piece.sections.filter((s) => kept.has(s.outlineId)),
        stage: stageAfterOutlineEdit(piece.stage),
      },
      undefined,
      tx
    );
    return { ok: true, data: undefined };
  });
}

export async function undoAction(
  id: string,
  snapshotId: string
): Promise<StudioResult<undefined>> {
  await requirePermission('studio.use');
  if (!uuid.safeParse(snapshotId).success)
    return { ok: false, error: 'INVALID_INPUT' };
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  return withPieceLock(id, async (tx) => {
    const piece = await loadEditable(id, {}, tx);
    if (isFail(piece)) return piece;
    const snapshot = await tx.studioPieceSnapshot.findUnique({
      where: { id: snapshotId },
      select: { pieceId: true },
    });
    if (!snapshot || snapshot.pieceId !== id)
      return { ok: false, error: 'NOT_FOUND' };
    await takeSnapshot(id, 'before undo', undefined, tx);
    await restoreSnapshot(snapshotId, tx);
    return { ok: true, data: undefined };
  });
}

export async function listSnapshotsAction(
  id: string
): Promise<
  StudioResult<Array<{ id: string; reason: string; createdAt: string }>>
> {
  await requirePermission('studio.use');
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  const rows = await listSnapshots(id);
  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function cancelRunAction(
  id: string
): Promise<StudioResult<undefined>> {
  await requirePermission('studio.use');
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  await cancelPieceRuns(id);
  return { ok: true, data: undefined };
}

export async function getChunksAction(
  ids: string[]
): Promise<
  StudioResult<
    Array<{
      id: string;
      sourceTitle: string;
      text: string;
      locator: Record<string, unknown>;
    }>
  >
> {
  await requirePermission('studio.use');
  const parsed = z.array(z.uuid()).max(20).safeParse(ids);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const chunks = await getChunks(parsed.data);
  return {
    ok: true,
    data: chunks.map((c) => ({
      id: c.id,
      sourceTitle: c.sourceTitle,
      text: c.text,
      locator: c.locator,
    })),
  };
}

export async function listPieceChoicesAction(id: string): Promise<
  StudioResult<{
    sources: Array<{
      id: string;
      title: string;
      status: string;
      kind: string;
      chapters: Array<{ title: string }>;
    }>;
    templates: Array<{ id: string; name: string; defaultCategory: string }>;
    authors: Array<{ id: string; name: string; designation: string }>;
  }>
> {
  await requirePermission('studio.use');
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  const row = await getPiece(id);
  if (!row) return { ok: false, error: 'NOT_FOUND' };
  const [sources, templates, authors] = await Promise.all([
    listProjectSources(row.projectId),
    listTemplates(),
    prisma.author.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, designation: true },
    }),
  ]);
  return {
    ok: true,
    data: {
      sources: sources.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        kind: s.kind,
        chapters: (
          (s.meta as { chapters?: Array<{ title: string }> }).chapters ?? []
        ).map((c) => ({ title: c.title })),
      })),
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        defaultCategory: t.defaultCategory,
      })),
      authors,
    },
  };
}

export async function createDraftPostAction(
  id: string
): Promise<StudioResult<{ articleId: string }>> {
  await requirePermission('studio.use', 'articles.edit');
  if (!uuid.safeParse(id).success)
    return { ok: false as const, error: 'INVALID_INPUT' as const };
  const result = await withPieceLock(id, async (tx) => {
    const piece = await loadEditable(id, {}, tx);
    if (isFail(piece)) return piece;
    const blocked = canHandOff(piece);
    if (blocked)
      return { ok: false as const, error: 'BLOCKED' as const, reason: blocked };
    const author = piece.authorId
      ? await tx.author.findUnique({ where: { id: piece.authorId } })
      : null;
    if (!author) return { ok: false as const, error: 'NO_AUTHOR' as const };
    const slug = await allocateUniqueSlug(
      generateSlug(piece.titleEn || piece.title),
      undefined,
      tx
    );
    const parsed = createArticleSchema.safeParse({
      slug,
      title: piece.title,
      titleEn: piece.titleEn ?? undefined,
      excerpt: piece.excerpt ?? undefined,
      excerptEn: piece.excerptEn ?? undefined,
      status: 'draft',
      category: piece.category,
      tags: piece.seo?.keywords ?? [],
      author: { name: author.name, designation: author.designation },
      blocks: toArticleBlocks(piece.sections),
      seo: piece.seo
        ? {
            metaTitle: piece.seo.title,
            metaDescription: piece.seo.description,
            keywords: piece.seo.keywords,
          }
        : undefined,
    });
    if (!parsed.success) {
      console.error('[createDraftPostAction]', parsed.error.issues);
      return { ok: false as const, error: 'FAILED' as const };
    }
    const payload = toCreateArticlePayload(parsed.data);
    const articleId = await createArticleRecord(payload, tx);
    await updatePiece(
      id,
      { articleId, handedOffAt: new Date(), stage: 'handed_off' },
      undefined,
      tx
    );
    return {
      ok: true as const,
      data: { articleId },
      slug: payload.slug,
      category: payload.category,
    };
  });
  if (!result.ok) return result;
  revalidateArticlePaths(result.slug, result.category as ContentCategory);
  return { ok: true, data: result.data };
}

export async function duplicatePieceAction(
  id: string
): Promise<StudioResult<{ pieceId: string }>> {
  const ctx = await requirePermission('studio.use');
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  const row = await getPiece(id);
  if (!row) return { ok: false, error: 'NOT_FOUND' };
  const source = readPiece(row);
  const copy = await createPiece({
    projectId: source.projectId,
    createdById: ctx.admin.id,
    templateId: source.templateId,
    category: source.category,
  });
  await updatePiece(copy.id, {
    brief: source.brief,
    selection: source.selection,
    authorId: source.authorId,
    stage: source.selection.sourceIds.length > 0 ? 'brief' : 'sources',
  });
  return { ok: true, data: { pieceId: copy.id } };
}
