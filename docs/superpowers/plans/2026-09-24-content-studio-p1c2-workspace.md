# Content Studio P1c-2 — Pieces Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editors can create a piece in a project, pick sources, write a brief, generate and edit the outline, have the article written, review it with citations, rewrite sections, undo, translate, and click **Create draft post** — which creates a normal `articles` draft and locks the piece; the studio then tracks the post's status.

**Architecture:** Server actions in `src/actions/studio-pieces.ts` validate, check permissions and stage rules (`src/generator/pieces/stages.ts`), take snapshots, and enqueue P1c-1 runs; they never call a model. Handoff runs synchronously in the action (database work only) using the existing `createArticleRecord` path. The workspace (`/admin/studio/pieces/[id]`) polls `getPieceAction` every 2 s while a run is active and shows a stage rail plus one panel per stage.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl, Tailwind v4 (existing admin classes), Zod 4, Vitest 4 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-22-content-studio-design.md` (§4.6 handoff, §6 UI)

**Builds on:** P1c-1 (pieces tables, run kinds, `toArticleBlocks`, `stages.ts`, `runTokenCeiling`). Stack the commit on `feat/content-studio`.

## Global Constraints

- **Do not run `git add`/`git commit`**; the user commits.
- **Never run migrations, scripts or DB tests against the Supabase database in `.env`**; local test DB only (CLAUDE.md "Tests"), URLs inline.
- Every action calls `requirePermission('studio.use')`; handoff additionally requires `articles.edit`. Pages guard with `hasPermission('studio.use')`.
- One active run per piece: actions refuse to enqueue while a `queued`/`running` run exists for the piece (`BUSY`).
- Locked pieces (`handed_off`) accept only `duplicatePieceAction` and reads.
- No manual text editing in the studio; hand edits happen in the post editor after handoff.
- Citations are shown in the studio only; handoff output comes from `toArticleBlocks` (no citation data).
- Admin copy in both `messages/admin-en.json` and `messages/admin-ja.json` under `studio`.
- Buttons use the existing primary class `rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed` and the slate palette used by `SourceLibrary`.
- Verification: `yarn test`, `yarn type-check`, `yarn lint`, DB slice on the local test DB.

## File Map

| File | Responsibility |
| --- | --- |
| `src/lib/studio/action-types.ts` | Adds `BUSY`, `BLOCKED`, `LOCKED` codes and an optional `reason` |
| `src/lib/studio/piece-dto.ts` | Serializable piece, list item and run DTOs |
| `src/actions/studio-pieces.ts` | Piece actions incl. handoff and duplicate |
| `src/actions/studio-templates.ts` | Template list/create/update/delete (`studio.templates.manage`) |
| `src/components/admin/studio/pieces/*` | List, workspace, stage rail, panels, citation popover |
| `src/components/admin/studio/TemplateManager.tsx` | Templates tab |
| `src/app/admin/(protected)/studio/page.tsx`, `studio/pieces/[id]/page.tsx`, `studio/templates/page.tsx` | Pages |
| `messages/admin-*.json` | Copy |

---

### Task 1: Result types and DTOs

**Files:**
- Modify: `src/lib/studio/action-types.ts`
- Create: `src/lib/studio/piece-dto.ts`
- Test: `src/lib/studio/piece-dto.test.ts`

**Interfaces:**
- `StudioErrorCode` adds `'BUSY' | 'BLOCKED' | 'LOCKED' | 'NO_AUTHOR' | 'FORBIDDEN'`; failure shape becomes `{ ok: false; error: StudioErrorCode; reason?: string }`
- `type ActiveRunDTO = { id: string; kind: string; status: RunStatus; error: string | null; steps: Array<{ key: string; status: string }> }`
- `type PieceDTO = PieceData`-shaped plain object with ISO dates, plus `activeRun: ActiveRunDTO | null`, `lastRunError: string | null`, `article: { id: string; status: string; slug: string } | null`
- `type PieceListItemDTO = { id: string; title: string; projectName: string; stage: PieceStage; articleStatus: string | null; updatedAt: string }`
- `toPieceDTO(data: PieceData, extras): PieceDTO`, `toActiveRunDTO(run: RunWithSteps | null): ActiveRunDTO | null`

- [ ] **Step 1: Action types**

Replace the result types in `src/lib/studio/action-types.ts` with:

```ts
export type StudioErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'FAILED'
  | 'LINKED'
  | 'TOO_LARGE'
  | 'BUSY'
  | 'BLOCKED'
  | 'LOCKED'
  | 'NO_AUTHOR'
  | 'FORBIDDEN';

export type StudioResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: StudioErrorCode; reason?: string };
```

(keep `RunStatusDTO` as it is.) Run `yarn type-check` — existing callers still compile because `reason` is optional.

- [ ] **Step 2: DTOs (test first)**

Create `src/lib/studio/piece-dto.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { toActiveRunDTO, toPieceDTO } from './piece-dto';
import type { PieceData } from '@/generator/pieces/pieces-repository';

const data = {
  id: 'p1', projectId: 'pr', templateId: null, stage: 'review', title: 'T', titleEn: null,
  excerpt: null, excerptEn: null, seo: null,
  brief: { goal: 'g', audience: '', keywords: [], tone: '', targetLength: 'auto' },
  selection: { sourceIds: [], chapters: {} }, outline: [], gaps: [], sections: [],
  category: 'notice', authorId: null, articleId: null, handedOffAt: null, createdById: null,
  createdAt: new Date('2026-09-24T00:00:00Z'), updatedAt: new Date('2026-09-24T00:01:00Z'),
} as PieceData;

describe('piece DTOs', () => {
  it('serializes dates and attaches extras', () => {
    const dto = toPieceDTO(data, { activeRun: null, lastRunError: 'boom', article: null });
    expect(dto.updatedAt).toBe('2026-09-24T00:01:00.000Z');
    expect(dto.handedOffAt).toBeNull();
    expect(dto.lastRunError).toBe('boom');
  });

  it('maps an active run with step statuses', () => {
    const run = {
      id: 'r', kind: 'write', status: 'running', error: null,
      steps: [{ key: 'section:a', status: 'succeeded' }, { key: 'section:b', status: 'running' }],
    };
    expect(toActiveRunDTO(run as never)).toEqual({
      id: 'r', kind: 'write', status: 'running', error: null,
      steps: [{ key: 'section:a', status: 'succeeded' }, { key: 'section:b', status: 'running' }],
    });
    expect(toActiveRunDTO(null)).toBeNull();
  });
});
```

Create `src/lib/studio/piece-dto.ts`:

```ts
import type { PieceData } from '@/generator/pieces/pieces-repository';
import type { PieceStage } from '@/generator/pieces/piece-types';
import type { RunWithSteps } from '@/generator/runs/runs-repository';
import type { RunStatus } from '@/generator/runs/run-types';

export type ActiveRunDTO = {
  id: string;
  kind: string;
  status: RunStatus;
  error: string | null;
  steps: Array<{ key: string; status: string }>;
};

export type PieceDTO = Omit<PieceData, 'createdAt' | 'updatedAt' | 'handedOffAt'> & {
  createdAt: string;
  updatedAt: string;
  handedOffAt: string | null;
  activeRun: ActiveRunDTO | null;
  lastRunError: string | null;
  article: { id: string; status: string; slug: string } | null;
};

export type PieceListItemDTO = {
  id: string;
  title: string;
  projectName: string;
  stage: PieceStage;
  articleStatus: string | null;
  updatedAt: string;
};

export function toActiveRunDTO(run: RunWithSteps | null): ActiveRunDTO | null {
  if (!run) return null;
  return {
    id: run.id,
    kind: run.kind,
    status: run.status as RunStatus,
    error: run.error,
    steps: run.steps.map((s) => ({ key: s.key, status: s.status })),
  };
}

export function toPieceDTO(
  data: PieceData,
  extras: Pick<PieceDTO, 'activeRun' | 'lastRunError' | 'article'>
): PieceDTO {
  return {
    ...data,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
    handedOffAt: data.handedOffAt?.toISOString() ?? null,
    ...extras,
  };
}
```

Run `yarn vitest run --project unit src/lib/studio/piece-dto.test.ts` → PASS.

---

### Task 2: Piece actions

**Files:**
- Create: `src/actions/studio-pieces.ts`
- Test: `src/actions/studio-pieces.test.ts`

**Interfaces (all `StudioResult`):**
- `listPiecesAction(filter?: { projectId?: string }) → PieceListItemDTO[]`
- `createPieceAction({ projectId }) → { pieceId }` — default template; category = template's `defaultCategory` or `useful-info`
- `getPieceAction(id) → PieceDTO`
- `updatePieceSetupAction(id, patch: { selection?; brief?; templateId?: string | null; category?; authorId?: string | null }) →` — refuses locked/busy; stage becomes `brief` once a source is selected (only while stage is `sources`/`brief`)
- `startRunAction(id, kind: 'outline' | 'write' | 'translate') → { runId }` — checks the stage rule for that kind
- `rewriteSectionAction(id, { sectionId, instruction }) → { runId }`
- `saveOutlineAction(id, outline: Array<{ id?: string; heading: string; intent: string; chunkIds: string[]; kind: 'source' | 'boilerplate'; estChars: number }>)` — snapshot; new ids for new rows; sections whose heading/intent/chunks changed or that were moved become `stale`; sections for removed rows are dropped; stage via `stageAfterOutlineEdit`
- `undoAction(id, snapshotId)` — snapshot current ("before undo") then restore
- `listSnapshotsAction(id) → Array<{ id; reason; createdAt }>`
- `cancelRunAction(id)`
- `getChunksAction(ids: string[]) → Array<{ id; sourceTitle; text; locator }>` (max 20)
- `createDraftPostAction(id) → { articleId }` — requires `articles.edit`
- `duplicatePieceAction(id) → { pieceId }`
- `listPieceChoicesAction(pieceId) → { sources; templates; authors }` for the setup panels

- [ ] **Step 1: Failing tests**

Create `src/actions/studio-pieces.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, TEST_USER } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/lib/studio/web-boss', () => ({ getWebBoss: vi.fn(async () => ({})) }));
vi.mock('@/generator/queue/enqueue', () => ({ createAndEnqueueRun: vi.fn(async () => ({ id: 'run1' })) }));
vi.mock('@/lib/article-revalidation', () => ({ revalidateArticlePaths: vi.fn() }));
vi.mock('@/lib/articles', () => ({ createArticleRecord: vi.fn(async () => 'art1') }));
vi.mock('@/lib/articles-repository', () => ({ allocateUniqueSlug: vi.fn(async (s: string) => s) }));
vi.mock('@/generator/pieces/pieces-repository', () => ({
  getPiece: vi.fn(),
  readPiece: vi.fn((row) => row),
  createPiece: vi.fn(async () => ({ id: 'p2' })),
  updatePiece: vi.fn(),
  takeSnapshot: vi.fn(async () => ({ id: 'snap' })),
  restoreSnapshot: vi.fn(),
  listSnapshots: vi.fn(async () => []),
  listPieces: vi.fn(async () => []),
  getDefaultTemplate: vi.fn(async () => null),
  listTemplates: vi.fn(async () => []),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    studioRun: { findFirst: vi.fn(async () => null), updateMany: vi.fn() },
    studioProject: { findUnique: vi.fn(async () => ({ id: 'proj', archivedAt: null })) },
    author: { findUnique: vi.fn(), findMany: vi.fn(async () => []) },
    article: { findUnique: vi.fn(async () => null) },
  },
}));

import { prisma } from '@/lib/prisma';
import { createAndEnqueueRun } from '@/generator/queue/enqueue';
import { createArticleRecord } from '@/lib/articles';
import { getPiece, restoreSnapshot, takeSnapshot, updatePiece } from '@/generator/pieces/pieces-repository';
import {
  createDraftPostAction,
  duplicatePieceAction,
  rewriteSectionAction,
  saveOutlineAction,
  startRunAction,
  undoAction,
  updatePieceSetupAction,
} from './studio-pieces';

const ID = '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';
const section = {
  outlineId: 'o1', heading: '課題', flags: [], enStale: false, en: null,
  blocks: [{ type: 'paragraph', sentences: [{ text: '本文。', cite: ['k'], connective: false }] }],
};
const piece = (over = {}) => ({
  id: ID, projectId: 'proj', templateId: null, stage: 'brief', title: '', titleEn: null,
  excerpt: null, excerptEn: null, seo: null,
  brief: { goal: '導入', audience: '', keywords: [], tone: '', targetLength: 'auto' },
  selection: { sourceIds: ['s1'], chapters: {} },
  outline: [{ id: 'o1', heading: '課題', intent: 'i', chunkIds: ['k'], estChars: 100, kind: 'source', stale: false }],
  gaps: [], sections: [], category: 'notice', authorId: 'a1', articleId: null, handedOffAt: null,
  createdById: null, createdAt: new Date(), updatedAt: new Date(), ...over,
});

describe('piece actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
    vi.mocked(getPiece).mockResolvedValue(piece() as never);
  });

  it('starts an outline run with the token ceiling', async () => {
    expect(await startRunAction(ID, 'outline')).toEqual({ ok: true, data: { runId: 'run1' } });
    expect(createAndEnqueueRun).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      kind: 'outline', pieceId: ID, createdById: TEST_USER.id, tokenCeiling: expect.any(Number),
    }));
  });

  it('refuses while another run is active', async () => {
    vi.mocked(prisma.studioRun.findFirst).mockResolvedValueOnce({ id: 'r' } as never);
    expect(await startRunAction(ID, 'write')).toMatchObject({ ok: false, error: 'BUSY' });
  });

  it('reports why a stage rule blocks the run', async () => {
    vi.mocked(getPiece).mockResolvedValue(piece({ brief: { goal: ' ', audience: '', keywords: [], tone: '', targetLength: 'auto' } }) as never);
    expect(await startRunAction(ID, 'outline')).toMatchObject({ ok: false, error: 'BLOCKED', reason: expect.stringMatching(/goal/i) });
  });

  it('refuses edits to a handed-off piece', async () => {
    vi.mocked(getPiece).mockResolvedValue(piece({ stage: 'handed_off' }) as never);
    expect(await updatePieceSetupAction(ID, { category: 'notice' })).toMatchObject({ ok: false, error: 'LOCKED' });
  });

  it('marks changed outline sections stale and rewinds the stage', async () => {
    vi.mocked(getPiece).mockResolvedValue(piece({ stage: 'review', sections: [section] }) as never);
    await saveOutlineAction(ID, [{ id: 'o1', heading: '課題（改）', intent: 'i', chunkIds: ['k'], kind: 'source', estChars: 100 }]);
    expect(takeSnapshot).toHaveBeenCalled();
    expect(updatePiece).toHaveBeenCalledWith(ID, expect.objectContaining({
      stage: 'outline',
      outline: [expect.objectContaining({ id: 'o1', stale: true })],
    }));
  });

  it('drops sections whose outline row was removed', async () => {
    vi.mocked(getPiece).mockResolvedValue(piece({ stage: 'review', sections: [section] }) as never);
    await saveOutlineAction(ID, [{ heading: '新しい節', intent: '', chunkIds: ['k'], kind: 'source', estChars: 100 }]);
    expect(updatePiece).toHaveBeenCalledWith(ID, expect.objectContaining({ sections: [] }));
  });

  it('enqueues a section rewrite', async () => {
    vi.mocked(getPiece).mockResolvedValue(piece({ stage: 'review', sections: [section] }) as never);
    await rewriteSectionAction(ID, { sectionId: 'o1', instruction: '短く' });
    expect(createAndEnqueueRun).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      kind: 'rewrite_section', input: { sectionId: 'o1', instruction: '短く' },
    }));
  });

  it('undo snapshots the current state first', async () => {
    await undoAction(ID, 'b1c2b0e8-8a8e-4f5e-9d4c-1f2a3b4c5d6e');
    expect(takeSnapshot).toHaveBeenCalledWith(ID, 'before undo');
    expect(restoreSnapshot).toHaveBeenCalled();
  });

  it('creates a draft post without citations and locks the piece', async () => {
    vi.mocked(getPiece).mockResolvedValue(piece({ stage: 'ready', title: 'AI導入', sections: [section] }) as never);
    vi.mocked(prisma.author.findUnique).mockResolvedValue({ id: 'a1', name: '山田', designation: 'Editor', avatarUrl: null } as never);
    expect(await createDraftPostAction(ID)).toEqual({ ok: true, data: { articleId: 'art1' } });
    const created = vi.mocked(createArticleRecord).mock.calls[0][0];
    expect(created.status).toBe('draft');
    expect(JSON.stringify(created.blocks)).not.toContain('"cite"');
    expect(updatePiece).toHaveBeenCalledWith(ID, expect.objectContaining({ stage: 'handed_off', articleId: 'art1' }));
  });

  it('requires articles.edit for handoff', async () => {
    authed(['studio.use']);
    await expect(createDraftPostAction(ID)).rejects.toThrow('Forbidden');
  });

  it('needs an author for handoff', async () => {
    vi.mocked(getPiece).mockResolvedValue(piece({ stage: 'ready', title: 'T', sections: [section], authorId: null }) as never);
    expect(await createDraftPostAction(ID)).toMatchObject({ ok: false, error: 'NO_AUTHOR' });
  });

  it('duplicates a locked piece into an editable one', async () => {
    vi.mocked(getPiece).mockResolvedValue(piece({ stage: 'handed_off' }) as never);
    expect(await duplicatePieceAction(ID)).toEqual({ ok: true, data: { pieceId: 'p2' } });
    expect(updatePiece).toHaveBeenCalledWith('p2', expect.objectContaining({ stage: 'brief' }));
  });
});
```

Run `yarn vitest run --project unit src/actions/studio-pieces.test.ts` → FAIL.

- [ ] **Step 2: Implement**

Create `src/actions/studio-pieces.ts`:

```ts
'use server';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requirePermission } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { createArticleRecord } from '@/lib/articles';
import { allocateUniqueSlug } from '@/lib/articles-repository';
import { generateSlug } from '@/lib/article-utils';
import { revalidateArticlePaths } from '@/lib/article-revalidation';
import { createArticleSchema, toCreateArticlePayload } from '@/lib/validation/article';
import { getWebBoss } from '@/lib/studio/web-boss';
import type { StudioResult } from '@/lib/studio/action-types';
import { toActiveRunDTO, toPieceDTO, type PieceDTO, type PieceListItemDTO } from '@/lib/studio/piece-dto';
import { createAndEnqueueRun } from '@/generator/queue/enqueue';
import { runTokenCeiling } from '@/generator/runs/run-types';
import {
  createPiece, getDefaultTemplate, getPiece, listPieces, listSnapshots, listTemplates,
  readPiece, restoreSnapshot, takeSnapshot, updatePiece, type PieceData,
} from '@/generator/pieces/pieces-repository';
import { briefSchema, selectionSchema, type OutlineSection, type PieceStage } from '@/generator/pieces/piece-types';
import { canHandOff, canStartOutline, canStartWriting, canTranslate, isLocked, stageAfterOutlineEdit } from '@/generator/pieces/stages';
import { toArticleBlocks } from '@/generator/pieces/to-article-blocks';
import { getChunks } from '@/generator/pieces/scope';
import { listProjectSources } from '@/generator/sources/projects-repository';
import { ARTICLE_CREATE_CATEGORIES } from '@/lib/api/article-create-metadata';
import type { ContentCategory } from '@/types';

const uuid = z.uuid();
const ACTIVE = ['queued', 'running'];
type Fail = { ok: false; error: 'NOT_FOUND' | 'LOCKED' | 'BUSY' | 'INVALID_INPUT' };

async function loadEditable(id: string, opts: { allowBusy?: boolean } = {}): Promise<PieceData | Fail> {
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  const row = await getPiece(id);
  if (!row) return { ok: false, error: 'NOT_FOUND' };
  const piece = readPiece(row);
  if (isLocked(piece.stage)) return { ok: false, error: 'LOCKED' };
  if (!opts.allowBusy && (await activeRun(id))) return { ok: false, error: 'BUSY' };
  return piece;
}

const isFail = (value: PieceData | Fail): value is Fail => 'ok' in value;

function activeRun(pieceId: string) {
  return prisma.studioRun.findFirst({
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
      kind, pieceId: piece.id, createdById: userId, input: input as never, tokenCeiling: runTokenCeiling(),
    });
    return { ok: true, data: { runId: run.id } };
  } catch (error) {
    console.error('[studio-pieces enqueue]', error);
    return { ok: false, error: 'FAILED' };
  }
}

export async function listPiecesAction(filter: { projectId?: string } = {}): Promise<StudioResult<PieceListItemDTO[]>> {
  await requirePermission('studio.use');
  const rows = await listPieces(filter);
  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.id, title: row.title, projectName: row.project.name, stage: row.stage as PieceStage,
      articleStatus: row.article?.status ?? null, updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function createPieceAction(input: { projectId: string }): Promise<StudioResult<{ pieceId: string }>> {
  const ctx = await requirePermission('studio.use');
  if (!uuid.safeParse(input.projectId).success) return { ok: false, error: 'INVALID_INPUT' };
  const project = await prisma.studioProject.findUnique({ where: { id: input.projectId } });
  if (!project || project.archivedAt) return { ok: false, error: 'NOT_FOUND' };
  const template = await getDefaultTemplate();
  const piece = await createPiece({
    projectId: project.id, createdById: ctx.admin.id,
    templateId: template?.id ?? null, category: template?.defaultCategory ?? 'useful-info',
  });
  return { ok: true, data: { pieceId: piece.id } };
}

export async function getPieceAction(id: string): Promise<StudioResult<PieceDTO>> {
  await requirePermission('studio.use');
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  const row = await getPiece(id);
  if (!row) return { ok: false, error: 'NOT_FOUND' };
  const piece = readPiece(row);
  const [run, last, article] = await Promise.all([
    activeRun(id),
    prisma.studioRun.findFirst({ where: { pieceId: id }, orderBy: { createdAt: 'desc' }, select: { status: true, error: true } }),
    piece.articleId ? prisma.article.findUnique({ where: { id: piece.articleId }, select: { id: true, status: true, slug: true } }) : null,
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

export async function updatePieceSetupAction(id: string, patch: z.input<typeof setupSchema>): Promise<StudioResult<undefined>> {
  await requirePermission('studio.use');
  const parsed = setupSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const piece = await loadEditable(id);
  if (isFail(piece)) return piece;
  let stage = piece.stage;
  if (parsed.data.selection && (stage === 'sources' || stage === 'brief')) {
    stage = parsed.data.selection.sourceIds.length > 0 ? 'brief' : 'sources';
  }
  await updatePiece(id, { ...parsed.data, stage });
  return { ok: true, data: undefined };
}

const RULES = {
  outline: canStartOutline,
  write: canStartWriting,
  translate: canTranslate,
} as const;

export async function startRunAction(id: string, kind: keyof typeof RULES): Promise<StudioResult<{ runId: string }>> {
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
  const parsed = z.object({ sectionId: z.string().min(1), instruction: z.string().trim().min(1).max(1000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const piece = await loadEditable(id);
  if (isFail(piece)) return piece;
  if (!piece.sections.some((s) => s.outlineId === parsed.data.sectionId)) return { ok: false, error: 'NOT_FOUND' };
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

export async function saveOutlineAction(id: string, rows: z.input<typeof outlineRowSchema>[]): Promise<StudioResult<undefined>> {
  await requirePermission('studio.use');
  const parsed = z.array(outlineRowSchema).max(30).safeParse(rows);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const piece = await loadEditable(id);
  if (isFail(piece)) return piece;
  const previous = new Map(piece.outline.map((o, i) => [o.id, { section: o, index: i }]));
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
      heading: row.heading, intent: row.intent, chunkIds: row.chunkIds, kind: row.kind, estChars: row.estChars,
      stale: before ? before.section.stale || changed : false,
    };
  });
  const kept = new Set(outline.map((o) => o.id));
  await takeSnapshot(id, 'edit outline');
  await updatePiece(id, {
    outline,
    sections: piece.sections.filter((s) => kept.has(s.outlineId)),
    stage: stageAfterOutlineEdit(piece.stage),
  });
  return { ok: true, data: undefined };
}

export async function undoAction(id: string, snapshotId: string): Promise<StudioResult<undefined>> {
  await requirePermission('studio.use');
  if (!uuid.safeParse(snapshotId).success) return { ok: false, error: 'INVALID_INPUT' };
  const piece = await loadEditable(id);
  if (isFail(piece)) return piece;
  await takeSnapshot(id, 'before undo');
  await restoreSnapshot(snapshotId);
  return { ok: true, data: undefined };
}

export async function listSnapshotsAction(id: string): Promise<StudioResult<Array<{ id: string; reason: string; createdAt: string }>>> {
  await requirePermission('studio.use');
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  const rows = await listSnapshots(id);
  return { ok: true, data: rows.map((r) => ({ id: r.id, reason: r.reason, createdAt: r.createdAt.toISOString() })) };
}

export async function cancelRunAction(id: string): Promise<StudioResult<undefined>> {
  await requirePermission('studio.use');
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  await prisma.studioRun.updateMany({
    where: { pieceId: id, status: { in: ACTIVE } },
    data: { status: 'cancelled', finishedAt: new Date() },
  });
  return { ok: true, data: undefined };
}

export async function getChunksAction(ids: string[]): Promise<StudioResult<Array<{ id: string; sourceTitle: string; text: string; locator: Record<string, unknown> }>>> {
  await requirePermission('studio.use');
  const parsed = z.array(z.uuid()).max(20).safeParse(ids);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const chunks = await getChunks(parsed.data);
  return { ok: true, data: chunks.map((c) => ({ id: c.id, sourceTitle: c.sourceTitle, text: c.text, locator: c.locator })) };
}

export async function listPieceChoicesAction(id: string): Promise<StudioResult<{
  sources: Array<{ id: string; title: string; status: string; kind: string; chapters: Array<{ title: string }> }>;
  templates: Array<{ id: string; name: string; defaultCategory: string }>;
  authors: Array<{ id: string; name: string; designation: string }>;
}>> {
  await requirePermission('studio.use');
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  const row = await getPiece(id);
  if (!row) return { ok: false, error: 'NOT_FOUND' };
  const [sources, templates, authors] = await Promise.all([
    listProjectSources(row.projectId),
    listTemplates(),
    prisma.author.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, designation: true } }),
  ]);
  return {
    ok: true,
    data: {
      sources: sources.map((s) => ({
        id: s.id, title: s.title, status: s.status, kind: s.kind,
        chapters: ((s.meta as { chapters?: Array<{ title: string }> }).chapters ?? []).map((c) => ({ title: c.title })),
      })),
      templates: templates.map((t) => ({ id: t.id, name: t.name, defaultCategory: t.defaultCategory })),
      authors,
    },
  };
}

export async function createDraftPostAction(id: string): Promise<StudioResult<{ articleId: string }>> {
  await requirePermission('studio.use', 'articles.edit');
  const piece = await loadEditable(id);
  if (isFail(piece)) return piece;
  const blocked = canHandOff(piece);
  if (blocked) return { ok: false, error: 'BLOCKED', reason: blocked };
  const author = piece.authorId ? await prisma.author.findUnique({ where: { id: piece.authorId } }) : null;
  if (!author) return { ok: false, error: 'NO_AUTHOR' };
  const slug = await allocateUniqueSlug(generateSlug(piece.titleEn || piece.title));
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
    seo: piece.seo ? { metaTitle: piece.seo.title, metaDescription: piece.seo.description, keywords: piece.seo.keywords } : undefined,
  });
  if (!parsed.success) {
    console.error('[createDraftPostAction]', parsed.error.issues);
    return { ok: false, error: 'FAILED' };
  }
  const payload = toCreateArticlePayload(parsed.data);
  const articleId = await createArticleRecord(payload);
  await updatePiece(id, { articleId, handedOffAt: new Date(), stage: 'handed_off' });
  revalidateArticlePaths(payload.slug, payload.category as ContentCategory);
  return { ok: true, data: { articleId } };
}

export async function duplicatePieceAction(id: string): Promise<StudioResult<{ pieceId: string }>> {
  const ctx = await requirePermission('studio.use');
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  const row = await getPiece(id);
  if (!row) return { ok: false, error: 'NOT_FOUND' };
  const source = readPiece(row);
  const copy = await createPiece({
    projectId: source.projectId, createdById: ctx.admin.id,
    templateId: source.templateId, category: source.category,
  });
  await updatePiece(copy.id, {
    brief: source.brief, selection: source.selection, authorId: source.authorId,
    stage: source.selection.sourceIds.length > 0 ? 'brief' : 'sources',
  });
  return { ok: true, data: { pieceId: copy.id } };
}
```

If `createArticleRecord`'s parameter type does not match `toCreateArticlePayload`'s return, follow how `src/app/api/articles/route.ts` calls them (it passes the payload straight through). Run the test → PASS; `yarn type-check && yarn lint` → PASS.

- [ ] **Step 3: Handoff DB test**

Create `src/actions/studio-pieces.db.test.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { authed } from '@/test/authz';

vi.mock('@/lib/authz', () => ({ requirePermission: vi.fn(), requireAnyPermission: vi.fn(), requireActiveSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/lib/studio/web-boss', () => ({ getWebBoss: vi.fn() }));

import { prisma } from '@/lib/prisma';
import { createPiece, getPiece, readPiece, updatePiece } from '@/generator/pieces/pieces-repository';
import { createDraftPostAction } from './studio-pieces';

const adminId = randomUUID();
let pieceId: string;
let authorId: string;

beforeAll(async () => {
  await prisma.adminUser.create({ data: { id: adminId, email: `ho-${adminId}@test.local` } });
  const project = await prisma.studioProject.create({ data: { name: 'handoff', createdById: adminId } });
  authorId = (await prisma.author.create({ data: { name: `Handoff ${adminId}`, designation: 'Editor' } })).id;
  pieceId = (await createPiece({ projectId: project.id, createdById: adminId, templateId: null, category: 'notice' })).id;
  await updatePiece(pieceId, {
    stage: 'ready', title: 'AI導入の始め方', authorId,
    sections: [{
      outlineId: 'o1', heading: '課題', flags: [], enStale: false, en: null,
      blocks: [{ type: 'paragraph', sentences: [{ text: '課題を一つに絞ります。', cite: ['chunk-secret'], connective: false }] }],
    }],
  });
});

afterAll(async () => {
  const piece = await getPiece(pieceId);
  if (piece?.articleId) await prisma.article.delete({ where: { id: piece.articleId } });
  await prisma.studioProject.deleteMany({ where: { createdById: adminId } });
  await prisma.author.delete({ where: { id: authorId } });
  await prisma.adminUser.delete({ where: { id: adminId } });
});

describe('createDraftPostAction', () => {
  it('creates a draft article without citations and locks the piece', async () => {
    authed();
    const result = await createDraftPostAction(pieceId);
    expect(result.ok).toBe(true);
    const piece = readPiece((await getPiece(pieceId))!);
    expect(piece.stage).toBe('handed_off');
    const article = await prisma.article.findUniqueOrThrow({ where: { id: piece.articleId! } });
    expect(article.status).toBe('draft');
    expect(JSON.stringify(article.blocks)).toContain('課題を一つに絞ります。');
    expect(JSON.stringify(article.blocks)).not.toContain('chunk-secret');
    expect(await createDraftPostAction(pieceId)).toMatchObject({ ok: false, error: 'LOCKED' });
  });
});
```

Run it on the local DB → PASS.

---

### Task 3: Template actions

**Files:**
- Create: `src/actions/studio-templates.ts`
- Test: `src/actions/studio-templates.test.ts`

**Interfaces:** `listTemplatesAction()` (`studio.use`); `createTemplateAction(input)`, `updateTemplateAction(id, input)`, `deleteTemplateAction(id)` (`studio.templates.manage`); input `{ name (1–80), description (≤300), instructions (1–4000), defaultCategory: ARTICLE_CREATE_CATEGORIES }`. Deleting the default template is refused (`BLOCKED`).

- [ ] **Step 1: Test first**

Create `src/actions/studio-templates.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed } from '@/test/authz';

vi.mock('@/lib/authz', () => ({ requirePermission: vi.fn(), requireAnyPermission: vi.fn(), requireActiveSession: vi.fn() }));
vi.mock('@/generator/pieces/pieces-repository', () => ({
  listTemplates: vi.fn(async () => []),
  getTemplate: vi.fn(),
  createTemplate: vi.fn(async () => ({ id: 't1' })),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));

import { createTemplate, deleteTemplate, getTemplate } from '@/generator/pieces/pieces-repository';
import { createTemplateAction, deleteTemplateAction } from './studio-templates';

const T = '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';
const input = { name: 'コラム', description: '', instructions: 'です・ます調', defaultCategory: 'useful-info' as const };

describe('template actions', () => {
  beforeEach(() => { vi.clearAllMocks(); authed(); });

  it('needs studio.templates.manage to create', async () => {
    authed(['studio.use']);
    await expect(createTemplateAction(input)).rejects.toThrow('Forbidden');
  });

  it('creates a template', async () => {
    expect(await createTemplateAction(input)).toEqual({ ok: true, data: { templateId: 't1' } });
    expect(createTemplate).toHaveBeenCalled();
  });

  it('refuses to delete the default template', async () => {
    vi.mocked(getTemplate).mockResolvedValue({ id: T, isDefault: true } as never);
    expect(await deleteTemplateAction(T)).toMatchObject({ ok: false, error: 'BLOCKED' });
    expect(deleteTemplate).not.toHaveBeenCalled();
  });
});
```

Create `src/actions/studio-templates.ts`:

```ts
'use server';

import { z } from 'zod';
import { requirePermission } from '@/lib/authz';
import { ARTICLE_CREATE_CATEGORIES } from '@/lib/api/article-create-metadata';
import type { StudioResult } from '@/lib/studio/action-types';
import { createTemplate, deleteTemplate, getTemplate, listTemplates, updateTemplate } from '@/generator/pieces/pieces-repository';

const fields = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(''),
  instructions: z.string().trim().min(1).max(4000),
  defaultCategory: z.enum(ARTICLE_CREATE_CATEGORIES),
});
const uuid = z.uuid();

export type TemplateDTO = z.infer<typeof fields> & { id: string; isDefault: boolean };

export async function listTemplatesAction(): Promise<StudioResult<TemplateDTO[]>> {
  await requirePermission('studio.use');
  const rows = await listTemplates();
  return {
    ok: true,
    data: rows.map((t) => ({
      id: t.id, name: t.name, description: t.description, instructions: t.instructions,
      defaultCategory: t.defaultCategory as TemplateDTO['defaultCategory'], isDefault: t.isDefault,
    })),
  };
}

export async function createTemplateAction(input: z.input<typeof fields>): Promise<StudioResult<{ templateId: string }>> {
  const ctx = await requirePermission('studio.templates.manage');
  const parsed = fields.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const row = await createTemplate({ ...parsed.data, createdById: ctx.admin.id });
  return { ok: true, data: { templateId: row.id } };
}

export async function updateTemplateAction(id: string, input: z.input<typeof fields>): Promise<StudioResult<undefined>> {
  await requirePermission('studio.templates.manage');
  const parsed = fields.safeParse(input);
  if (!uuid.safeParse(id).success || !parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  await updateTemplate(id, parsed.data);
  return { ok: true, data: undefined };
}

export async function deleteTemplateAction(id: string): Promise<StudioResult<undefined>> {
  await requirePermission('studio.templates.manage');
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  const template = await getTemplate(id);
  if (!template) return { ok: false, error: 'NOT_FOUND' };
  if (template.isDefault) return { ok: false, error: 'BLOCKED', reason: 'The default template cannot be deleted.' };
  await deleteTemplate(id);
  return { ok: true, data: undefined };
}
```

Run → PASS.

---

### Task 4: Copy

- [ ] Add under `studio` in `messages/admin-en.json`:

```json
    "tabs": { "overview": "Pieces", "library": "Source library", "projects": "Projects", "templates": "Templates" },
    "category": { "useful-info": "Column", "case-study": "Case study", "video": "Video", "notice": "Notice" },
    "stages": {
      "sources": "Sources", "brief": "Brief", "outline": "Outline", "writing": "Writing",
      "review": "Review", "translating": "Translate", "ready": "Draft post", "handed_off": "Published"
    },
    "pieces": {
      "title": "Pieces", "new": "New piece", "chooseProject": "Choose a project", "empty": "No pieces yet.",
      "columns": { "title": "Title", "project": "Project", "stage": "Stage", "updated": "Updated" },
      "untitled": "Untitled", "tracked": { "draft": "Draft post", "published": "Published", "archived": "Archived", "removed": "Post deleted" }
    },
    "workspace": {
      "back": "All pieces", "busy": "Working…", "cancel": "Cancel", "failed": "The last step failed: {error}",
      "undo": "History", "undoButton": "Restore", "noHistory": "No history yet.",
      "errors": { "BUSY": "Wait for the current step to finish.", "LOCKED": "This piece was already handed off.", "NO_AUTHOR": "Choose an author in the brief first.", "FAILED": "Something went wrong. Try again." }
    },
    "sourcesPanel": { "title": "Choose sources", "none": "Link sources to this project first.", "notReady": "Not ready", "next": "Continue to brief" },
    "brief": {
      "title": "Brief", "goal": "Goal of the article", "audience": "Audience", "keywords": "Keywords (comma-separated)",
      "tone": "Tone", "length": "Length", "auto": "What the sources support", "chars": "Target characters",
      "template": "Template", "category": "Category", "author": "Author", "save": "Save brief", "createOutline": "Create outline"
    },
    "outline": {
      "title": "Outline", "heading": "Heading", "intent": "What this section covers", "sources": "{count, plural, =0 {No source passages} one {# passage} other {# passages}}",
      "boilerplate": "Template section (no sources)", "add": "Add section", "remove": "Remove", "up": "Move up", "down": "Move down",
      "stale": "Changed — will be rewritten", "gaps": "Not covered by the sources", "save": "Save outline", "write": "Write article"
    },
    "writing": { "title": "Writing", "section": "Section {n} of {total}", "finishing": "Title, excerpt and SEO" },
    "review": {
      "title": "Review", "flags": "Needs attention", "citation": "Source", "connective": "Transition (no facts)",
      "actions": { "regenerate": "Regenerate", "expand": "Expand", "shorten": "Shorten", "formal": "More formal", "custom": "Custom instruction…" },
      "instructions": { "regenerate": "Rewrite this section from its sources.", "expand": "Expand this section with more detail from its sources.", "shorten": "Make this section about half as long.", "formal": "Make the tone more formal." },
      "customPrompt": "What should change in this section?", "translate": "Translate to English", "handoff": "Create draft post"
    },
    "translate": { "title": "Translation", "stale": "Changed since translation — translate again" },
    "handoff": { "title": "Draft post", "open": "Open in editor", "view": "View on site", "duplicate": "Duplicate piece", "status": "Post status: {status}" },
    "templates": {
      "title": "Templates", "new": "New template", "name": "Name", "description": "Description", "instructions": "Instructions for the writer",
      "defaultCategory": "Default category", "default": "Default", "save": "Save", "delete": "Delete"
    }
```

and the matching Japanese under `studio` in `messages/admin-ja.json`:

```json
    "tabs": { "overview": "記事", "library": "ソースライブラリ", "projects": "プロジェクト", "templates": "テンプレート" },
    "category": { "useful-info": "コラム", "case-study": "導入事例", "video": "動画", "notice": "お知らせ" },
    "stages": {
      "sources": "ソース", "brief": "概要", "outline": "構成", "writing": "執筆",
      "review": "確認", "translating": "翻訳", "ready": "下書き作成", "handed_off": "公開"
    },
    "pieces": {
      "title": "記事", "new": "新しい記事", "chooseProject": "プロジェクトを選択", "empty": "記事はまだありません。",
      "columns": { "title": "タイトル", "project": "プロジェクト", "stage": "段階", "updated": "更新日時" },
      "untitled": "無題", "tracked": { "draft": "下書き", "published": "公開済み", "archived": "アーカイブ", "removed": "投稿は削除されました" }
    },
    "workspace": {
      "back": "記事一覧", "busy": "処理中…", "cancel": "中止", "failed": "直前の処理に失敗しました: {error}",
      "undo": "履歴", "undoButton": "この状態に戻す", "noHistory": "履歴はまだありません。",
      "errors": { "BUSY": "現在の処理が終わるまでお待ちください。", "LOCKED": "この記事はすでに下書き投稿済みです。", "NO_AUTHOR": "先に概要で著者を選択してください。", "FAILED": "問題が発生しました。もう一度お試しください。" }
    },
    "sourcesPanel": { "title": "ソースを選択", "none": "先にこのプロジェクトへソースを追加してください。", "notReady": "未処理", "next": "概要へ進む" },
    "brief": {
      "title": "概要", "goal": "記事の目的", "audience": "読者", "keywords": "キーワード（カンマ区切り）",
      "tone": "トーン", "length": "文字数", "auto": "ソースに応じて", "chars": "目標文字数",
      "template": "テンプレート", "category": "カテゴリー", "author": "著者", "save": "概要を保存", "createOutline": "構成を作成"
    },
    "outline": {
      "title": "構成", "heading": "見出し", "intent": "この節で扱う内容", "sources": "{count, plural, =0 {ソース箇所なし} other {#件のソース箇所}}",
      "boilerplate": "テンプレートの節（ソース不要）", "add": "節を追加", "remove": "削除", "up": "上へ", "down": "下へ",
      "stale": "変更あり — 書き直されます", "gaps": "ソースに含まれていない内容", "save": "構成を保存", "write": "記事を執筆"
    },
    "writing": { "title": "執筆", "section": "{total}節中 {n}節目", "finishing": "タイトル・要約・SEO" },
    "review": {
      "title": "確認", "flags": "要確認", "citation": "出典", "connective": "つなぎの文（事実なし）",
      "actions": { "regenerate": "再生成", "expand": "詳しく", "shorten": "短く", "formal": "よりフォーマルに", "custom": "指示を入力…" },
      "instructions": { "regenerate": "この節をソースから書き直してください。", "expand": "ソースの内容でこの節をより詳しくしてください。", "shorten": "この節を約半分の長さにしてください。", "formal": "よりフォーマルな文体にしてください。" },
      "customPrompt": "この節をどう変更しますか？", "translate": "英語に翻訳", "handoff": "下書き投稿を作成"
    },
    "translate": { "title": "翻訳", "stale": "翻訳後に変更されました — 再翻訳してください" },
    "handoff": { "title": "下書き投稿", "open": "エディターで開く", "view": "サイトで見る", "duplicate": "記事を複製", "status": "投稿の状態: {status}" },
    "templates": {
      "title": "テンプレート", "new": "新しいテンプレート", "name": "名前", "description": "説明", "instructions": "執筆者への指示",
      "defaultCategory": "既定のカテゴリー", "default": "既定", "save": "保存", "delete": "削除"
    }
```

(Replace the existing `studio.tabs` object; keep all other existing `studio` keys.) Run `yarn test` to catch JSON mistakes.

---

### Task 5: Pieces list, stage rail and workspace shell

**Files:**
- Create: `src/components/admin/studio/pieces/PieceList.tsx`, `StageRail.tsx`, `PieceWorkspace.tsx`, `usePiece.ts`
- Modify: `src/components/admin/studio/StudioTabs.tsx`, `src/components/admin/studio/StudioHome.tsx`, `src/app/admin/(protected)/studio/page.tsx`
- Create: `src/app/admin/(protected)/studio/pieces/[id]/page.tsx`
- Test: `src/components/admin/studio/pieces/StageRail.test.tsx`, `PieceWorkspace.test.tsx`

**Interfaces:**
- `usePiece(id): { piece: PieceDTO | null; refresh(): Promise<void>; error: string | null }` — polls every 2 s while `piece.activeRun` is set
- `StageRail({ stage, articleStatus, viewing, onView })` — 8 steps; steps up to the current stage are clickable; the last shows the tracked post status
- `PieceWorkspace({ pieceId })` — header (title, back link), rail, busy banner with Cancel, failure banner (`lastRunError`), panel for the viewed stage, right column with the history (undo) list

- [ ] **Step 1: Stage rail (test first)**

Create `src/components/admin/studio/pieces/StageRail.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';
import StageRail from './StageRail';

describe('StageRail', () => {
  it('marks done, current and future stages and lets you view past ones', async () => {
    const onView = vi.fn();
    renderAdmin(<StageRail stage="review" articleStatus={null} viewing="review" onView={onView} />);
    expect(screen.getByRole('button', { name: /Review/ })).toHaveAttribute('aria-current', 'step');
    await userEvent.click(screen.getByRole('button', { name: /Outline/ }));
    expect(onView).toHaveBeenCalledWith('outline');
    expect(screen.getByRole('button', { name: /Draft post/ })).toBeDisabled();
  });

  it('shows the tracked post status after handoff', () => {
    renderAdmin(<StageRail stage="handed_off" articleStatus="published" viewing="handed_off" onView={vi.fn()} />);
    expect(screen.getByText('Published', { selector: 'small' })).toBeInTheDocument();
  });
});
```

Create `src/components/admin/studio/pieces/StageRail.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { STAGE_ORDER } from '@/generator/pieces/stages';
import type { PieceStage } from '@/generator/pieces/piece-types';

type Props = {
  stage: PieceStage;
  articleStatus: string | null;
  viewing: PieceStage;
  onView: (stage: PieceStage) => void;
};

export default function StageRail({ stage, articleStatus, viewing, onView }: Props) {
  const t = useTranslations('admin.studio');
  const current = STAGE_ORDER.indexOf(stage);
  return (
    <ol className="flex flex-wrap items-center gap-1 text-sm">
      {STAGE_ORDER.map((key, index) => {
        const done = index < current;
        const isCurrent = index === current;
        return (
          <li key={key} className="flex items-center gap-1">
            <button
              type="button"
              disabled={index > current}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => onView(key)}
              className={`rounded-full px-3 py-1 ${viewing === key ? 'ring-2 ring-slate-900' : ''} ${
                isCurrent ? 'bg-slate-900 text-white' : done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {done ? '✓ ' : ''}{t(`stages.${key}`)}
              {key === 'handed_off' && articleStatus && (
                <small className="ml-1">{t(`pieces.tracked.${articleStatus}`)}</small>
              )}
            </button>
            {index < STAGE_ORDER.length - 1 && <span className="text-slate-300">—</span>}
          </li>
        );
      })}
    </ol>
  );
}
```

`STAGE_ORDER` lives in engine code with no server-only imports, so the client bundle may import it. Run the test → PASS.

- [ ] **Step 2: Polling hook**

Create `src/components/admin/studio/pieces/usePiece.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPieceAction } from '@/actions/studio-pieces';
import type { PieceDTO } from '@/lib/studio/piece-dto';

const POLL_MS = 2000;

export function usePiece(id: string) {
  const [piece, setPiece] = useState<PieceDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await getPieceAction(id);
    if (result.ok) {
      setPiece(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void getPieceAction(id).then((result) => {
      if (cancelled) return;
      if (result.ok) setPiece(result.data);
      else setError(result.error);
    });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!piece?.activeRun) return;
    const timer = window.setTimeout(() => void refresh(), POLL_MS);
    return () => window.clearTimeout(timer);
  }, [piece, refresh]);

  return { piece, refresh, error };
}
```

- [ ] **Step 3: Workspace shell (test first)**

Create `src/components/admin/studio/pieces/PieceWorkspace.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

const base = {
  id: 'p1', projectId: 'pr', templateId: null, stage: 'writing', title: '', titleEn: null, excerpt: null, excerptEn: null,
  seo: null, brief: { goal: 'g', audience: '', keywords: [], tone: '', targetLength: 'auto' },
  selection: { sourceIds: ['s'], chapters: {} },
  outline: [{ id: 'o1', heading: 'A', intent: '', chunkIds: [], estChars: 1, kind: 'source', stale: false }, { id: 'o2', heading: 'B', intent: '', chunkIds: [], estChars: 1, kind: 'source', stale: false }],
  gaps: [], sections: [], category: 'notice', authorId: null, articleId: null, handedOffAt: null, createdById: null,
  createdAt: '', updatedAt: '', lastRunError: null, article: null,
  activeRun: { id: 'r', kind: 'write', status: 'running', error: null, steps: [{ key: 'prepare', status: 'succeeded' }, { key: 'section:o1', status: 'succeeded' }, { key: 'section:o2', status: 'running' }] },
};

vi.mock('@/actions/studio-pieces', () => ({
  getPieceAction: vi.fn(async () => ({ ok: true, data: base })),
  cancelRunAction: vi.fn(async () => ({ ok: true, data: undefined })),
  listSnapshotsAction: vi.fn(async () => ({ ok: true, data: [] })),
  listPieceChoicesAction: vi.fn(async () => ({ ok: true, data: { sources: [], templates: [], authors: [] } })),
}));

import PieceWorkspace from './PieceWorkspace';

describe('PieceWorkspace', () => {
  it('shows the writing progress for the active run', async () => {
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    expect(await screen.findByText('Section 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
```

Create `src/components/admin/studio/pieces/PieceWorkspace.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cancelRunAction } from '@/actions/studio-pieces';
import type { PieceStage } from '@/generator/pieces/piece-types';
import StageRail from './StageRail';
import { usePiece } from './usePiece';
import SourcesPanel from './SourcesPanel';
import BriefPanel from './BriefPanel';
import OutlinePanel from './OutlinePanel';
import WritingPanel from './WritingPanel';
import ReviewPanel from './ReviewPanel';
import TranslatePanel from './TranslatePanel';
import HandoffPanel from './HandoffPanel';
import HistoryList from './HistoryList';

export default function PieceWorkspace({ pieceId }: { pieceId: string }) {
  const t = useTranslations('admin.studio');
  const { piece, refresh } = usePiece(pieceId);
  // A stage the editor clicked, remembered together with the piece stage it was
  // clicked at: once the piece moves on, the view follows the piece again.
  const [picked, setPicked] = useState<{ at: PieceStage; view: PieceStage } | null>(null);

  if (!piece) return null;
  const viewing = picked && picked.at === piece.stage ? picked.view : piece.stage;
  const setViewing = (view: PieceStage) => setPicked({ at: piece.stage, view });
  const busy = Boolean(piece.activeRun);
  const panel = { piece, busy, refresh };

  return (
    <div className="space-y-5">
      <Link href="/admin/studio" className="text-sm text-slate-500">← {t('workspace.back')}</Link>
      <h2 className="text-xl font-semibold text-slate-900">{piece.title || t('pieces.untitled')}</h2>
      <StageRail stage={piece.stage} articleStatus={piece.article?.status ?? (piece.articleId ? 'removed' : null)} viewing={viewing} onView={setViewing} />
      {busy && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800">
          <span>{t('workspace.busy')}</span>
          <button type="button" onClick={() => void cancelRunAction(piece.id).then(refresh)} className="underline">
            {t('workspace.cancel')}
          </button>
        </div>
      )}
      {!busy && piece.lastRunError && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{t('workspace.failed', { error: piece.lastRunError })}</p>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <main>
          {viewing === 'sources' && <SourcesPanel {...panel} />}
          {viewing === 'brief' && <BriefPanel {...panel} />}
          {viewing === 'outline' && <OutlinePanel {...panel} />}
          {viewing === 'writing' && <WritingPanel {...panel} />}
          {viewing === 'review' && <ReviewPanel {...panel} />}
          {(viewing === 'translating' || viewing === 'ready') && <TranslatePanel {...panel} />}
          {viewing === 'handed_off' && <HandoffPanel {...panel} />}
        </main>
        <aside>
          <HistoryList {...panel} />
        </aside>
      </div>
    </div>
  );
}
```

Every panel receives `PanelProps = { piece: PieceDTO; busy: boolean; refresh: () => Promise<void> }` — define and export it from `src/components/admin/studio/pieces/panel-props.ts`:

```ts
import type { PieceDTO } from '@/lib/studio/piece-dto';

export type PanelProps = { piece: PieceDTO; busy: boolean; refresh: () => Promise<void> };
```

Create the panels in Task 6 before running this test. After Task 6, run the workspace test → PASS.

- [ ] **Step 4: Pieces list, tabs and pages**

Create `src/components/admin/studio/pieces/PieceList.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createPieceAction, listPiecesAction } from '@/actions/studio-pieces';
import { listProjectsAction, type ProjectDTO } from '@/actions/studio-projects';
import type { PieceListItemDTO } from '@/lib/studio/piece-dto';

export default function PieceList() {
  const t = useTranslations('admin.studio');
  const router = useRouter();
  const [pieces, setPieces] = useState<PieceListItemDTO[]>([]);
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    void listPiecesAction().then((r) => r.ok && setPieces(r.data));
    void listProjectsAction().then((r) => r.ok && setProjects(r.data));
  }, []);

  async function create() {
    if (!projectId) return;
    const result = await createPieceAction({ projectId });
    if (result.ok) router.push(`/admin/studio/pieces/${result.data.pieceId}`);
  }

  return (
    <section className="space-y-4">
      <div className="flex gap-2">
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label={t('pieces.chooseProject')} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
          <option value="">{t('pieces.chooseProject')}</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="button" disabled={!projectId} onClick={() => void create()} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed">
          {t('pieces.new')}
        </button>
      </div>
      {pieces.length === 0 ? (
        <p className="text-sm text-slate-500">{t('pieces.empty')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr><th className="py-2">{t('pieces.columns.title')}</th><th>{t('pieces.columns.project')}</th><th>{t('pieces.columns.stage')}</th><th>{t('pieces.columns.updated')}</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pieces.map((p) => (
              <tr key={p.id}>
                <td className="py-2"><Link href={`/admin/studio/pieces/${p.id}`} className="font-medium text-slate-900 hover:underline">{p.title || t('pieces.untitled')}</Link></td>
                <td className="text-slate-600">{p.projectName}</td>
                <td className="text-slate-600">
                  {t(`stages.${p.stage}`)}
                  {p.stage === 'handed_off' && p.articleStatus && ` · ${t(`pieces.tracked.${p.articleStatus}`)}`}
                </td>
                <td className="text-slate-500">{new Date(p.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
```

In `StudioTabs.tsx` add `{ key: 'templates', href: '/admin/studio/templates' }` to `TABS`. In `StudioHome.tsx` change the default body to:

```tsx
      {children ?? (
        <>
          <PieceList />
          <SystemCheckCard />
        </>
      )}
```

(import `PieceList` from `./pieces/PieceList`). Create `src/app/admin/(protected)/studio/pieces/[id]/page.tsx`:

```tsx
import PermissionNeeded from '@/components/admin/PermissionNeeded';
import StudioHome from '@/components/admin/studio/StudioHome';
import PieceWorkspace from '@/components/admin/studio/pieces/PieceWorkspace';
import { hasPermission } from '@/lib/authz';

export default async function StudioPiecePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await hasPermission('studio.use'))) return <PermissionNeeded permission="studio.use" />;
  const { id } = await params;
  return <StudioHome><PieceWorkspace pieceId={id} /></StudioHome>;
}
```

---

### Task 6: Stage panels

**Files:** Create in `src/components/admin/studio/pieces/`: `panel-props.ts` (Task 5), `SourcesPanel.tsx`, `BriefPanel.tsx`, `OutlinePanel.tsx`, `WritingPanel.tsx`, `ReviewPanel.tsx`, `CitationPopover.tsx`, `TranslatePanel.tsx`, `HandoffPanel.tsx`, `HistoryList.tsx`, `errorText.ts`. Tests: `OutlinePanel.test.tsx`, `ReviewPanel.test.tsx`, `HandoffPanel.test.tsx`.

**Interfaces:** each panel `(props: PanelProps) => JSX`; `errorText(t, result)` maps a failed `StudioResult` to copy (`reason` when present, else `workspace.errors.<code>`).

- [ ] **Step 1: Shared error text**

Create `errorText.ts`:

```ts
import type { StudioErrorCode } from '@/lib/studio/action-types';

type T = (key: string) => string;

export function errorText(t: T, failure: { error: StudioErrorCode; reason?: string }): string {
  if (failure.reason) return failure.reason;
  const known = ['BUSY', 'LOCKED', 'NO_AUTHOR'];
  return t(`workspace.errors.${known.includes(failure.error) ? failure.error : 'FAILED'}`);
}
```

- [ ] **Step 2: Sources and brief panels**

Create `SourcesPanel.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { listPieceChoicesAction, updatePieceSetupAction } from '@/actions/studio-pieces';
import type { PanelProps } from './panel-props';

type Choice = { id: string; title: string; status: string; kind: string; chapters: Array<{ title: string }> };

export default function SourcesPanel({ piece, busy, refresh }: PanelProps) {
  const t = useTranslations('admin.studio');
  const [sources, setSources] = useState<Choice[]>([]);
  const [selected, setSelected] = useState<string[]>(piece.selection.sourceIds);
  const [chapters, setChapters] = useState<Record<string, number[]>>(piece.selection.chapters);

  useEffect(() => {
    void listPieceChoicesAction(piece.id).then((r) => r.ok && setSources(r.data.sources));
  }, [piece.id]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function toggleChapter(sourceId: string, index: number, count: number) {
    setChapters((c) => {
      const current = c[sourceId] ?? Array.from({ length: count }, (_, i) => i);
      const next = current.includes(index) ? current.filter((i) => i !== index) : [...current, index].sort((a, b) => a - b);
      return { ...c, [sourceId]: next };
    });
  }

  async function save() {
    await updatePieceSetupAction(piece.id, { selection: { sourceIds: selected, chapters } });
    await refresh();
  }

  if (sources.length === 0) return <p className="text-sm text-slate-500">{t('sourcesPanel.none')}</p>;
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-slate-900">{t('sourcesPanel.title')}</h3>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {sources.map((s) => (
          <li key={s.id} className="px-4 py-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" disabled={s.status !== 'ready' || busy} checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
              <span className="font-medium text-slate-900">{s.title}</span>
              {s.status !== 'ready' && <span className="text-xs text-slate-400">{t('sourcesPanel.notReady')}</span>}
            </label>
            {selected.includes(s.id) && s.chapters.length > 0 && (
              <ul className="ml-6 mt-2 space-y-1">
                {s.chapters.map((c, i) => (
                  <li key={i}>
                    <label className="flex items-center gap-2 text-slate-600">
                      <input type="checkbox" checked={(chapters[s.id] ?? s.chapters.map((_, j) => j)).includes(i)} onChange={() => toggleChapter(s.id, i, s.chapters.length)} />
                      {c.title}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <button type="button" disabled={busy || selected.length === 0} onClick={() => void save()} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed">
        {t('sourcesPanel.next')}
      </button>
    </section>
  );
}
```

Create `BriefPanel.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { listPieceChoicesAction, startRunAction, updatePieceSetupAction } from '@/actions/studio-pieces';
import { ARTICLE_CREATE_CATEGORIES } from '@/lib/api/article-create-metadata';
import type { PanelProps } from './panel-props';
import { errorText } from './errorText';

export default function BriefPanel({ piece, busy, refresh }: PanelProps) {
  const t = useTranslations('admin.studio');
  const [goal, setGoal] = useState(piece.brief.goal);
  const [audience, setAudience] = useState(piece.brief.audience);
  const [keywords, setKeywords] = useState(piece.brief.keywords.join(', '));
  const [tone, setTone] = useState(piece.brief.tone);
  const [length, setLength] = useState(piece.brief.targetLength === 'auto' ? '' : String(piece.brief.targetLength));
  const [templateId, setTemplateId] = useState(piece.templateId ?? '');
  const [category, setCategory] = useState(piece.category);
  const [authorId, setAuthorId] = useState(piece.authorId ?? '');
  const [choices, setChoices] = useState<{ templates: Array<{ id: string; name: string }>; authors: Array<{ id: string; name: string; designation: string }> }>({ templates: [], authors: [] });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void listPieceChoicesAction(piece.id).then((r) => r.ok && setChoices(r.data));
  }, [piece.id]);

  async function save(): Promise<boolean> {
    const result = await updatePieceSetupAction(piece.id, {
      brief: {
        goal, audience, tone,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        targetLength: Number(length) > 0 ? Number(length) : 'auto',
      },
      templateId: templateId || null,
      category: category as (typeof ARTICLE_CREATE_CATEGORIES)[number],
      authorId: authorId || null,
    });
    if (!result.ok) setMessage(errorText(t, result));
    return result.ok;
  }

  async function createOutline() {
    if (!(await save())) return;
    const result = await startRunAction(piece.id, 'outline');
    if (!result.ok) setMessage(errorText(t, result));
    await refresh();
  }

  const field = 'mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm';
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-slate-900">{t('brief.title')}</h3>
      <label className="block text-sm">{t('brief.goal')}<textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} className={field} /></label>
      <label className="block text-sm">{t('brief.audience')}<input value={audience} onChange={(e) => setAudience(e.target.value)} className={field} /></label>
      <label className="block text-sm">{t('brief.keywords')}<input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={field} /></label>
      <label className="block text-sm">{t('brief.tone')}<input value={tone} onChange={(e) => setTone(e.target.value)} className={field} /></label>
      <label className="block text-sm">{t('brief.chars')}<input type="number" min={0} placeholder={t('brief.auto')} value={length} onChange={(e) => setLength(e.target.value)} className={field} /></label>
      <label className="block text-sm">{t('brief.template')}
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={field}>
          <option value="">—</option>
          {choices.templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>
      <label className="block text-sm">{t('brief.category')}
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
          {ARTICLE_CREATE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
        </select>
      </label>
      <label className="block text-sm">{t('brief.author')}
        <select value={authorId} onChange={(e) => setAuthorId(e.target.value)} className={field}>
          <option value="">—</option>
          {choices.authors.map((a) => <option key={a.id} value={a.id}>{a.name}（{a.designation}）</option>)}
        </select>
      </label>
      {message && <p className="text-sm text-red-600">{message}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void save().then(refresh)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">{t('brief.save')}</button>
        <button type="button" disabled={busy} onClick={() => void createOutline()} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed">{t('brief.createOutline')}</button>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Outline panel (test first)**

Create `OutlinePanel.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

vi.mock('@/actions/studio-pieces', () => ({
  saveOutlineAction: vi.fn(async () => ({ ok: true, data: undefined })),
  startRunAction: vi.fn(async () => ({ ok: true, data: { runId: 'r' } })),
}));

import { saveOutlineAction, startRunAction } from '@/actions/studio-pieces';
import OutlinePanel from './OutlinePanel';

const piece = {
  id: 'p1', stage: 'outline', gaps: ['事例がない'],
  outline: [
    { id: 'a', heading: '課題', intent: 'why', chunkIds: ['k1', 'k2'], estChars: 300, kind: 'source', stale: false },
    { id: 'b', heading: '手順', intent: 'how', chunkIds: ['k3'], estChars: 300, kind: 'source', stale: false },
  ],
} as never;

describe('OutlinePanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows gaps and passage counts', () => {
    renderAdmin(<OutlinePanel piece={piece} busy={false} refresh={vi.fn()} />);
    expect(screen.getByText('事例がない')).toBeInTheDocument();
    expect(screen.getByText('2 passages')).toBeInTheDocument();
  });

  it('reorders, edits and saves, then writes', async () => {
    const refresh = vi.fn();
    renderAdmin(<OutlinePanel piece={piece} busy={false} refresh={refresh} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]);
    const heading = screen.getAllByLabelText('Heading')[1];
    await userEvent.clear(heading);
    await userEvent.type(heading, '課題（改）');
    await userEvent.click(screen.getByRole('button', { name: 'Save outline' }));
    expect(saveOutlineAction).toHaveBeenCalledWith('p1', [
      expect.objectContaining({ id: 'b' }),
      expect.objectContaining({ id: 'a', heading: '課題（改）' }),
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Write article' }));
    expect(startRunAction).toHaveBeenCalledWith('p1', 'write');
  });
});
```

Create `OutlinePanel.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { saveOutlineAction, startRunAction } from '@/actions/studio-pieces';
import type { OutlineSection } from '@/generator/pieces/piece-types';
import type { PanelProps } from './panel-props';
import { errorText } from './errorText';

type Row = Omit<OutlineSection, 'id' | 'stale'> & { id?: string; stale: boolean };

export default function OutlinePanel({ piece, busy, refresh }: PanelProps) {
  const t = useTranslations('admin.studio');
  const [rows, setRows] = useState<Row[]>(piece.outline);
  const [message, setMessage] = useState<string | null>(null);

  function update(index: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function move(index: number, delta: number) {
    setRows((r) => {
      const next = [...r];
      const [row] = next.splice(index, 1);
      next.splice(index + delta, 0, row);
      return next;
    });
  }

  async function save(): Promise<boolean> {
    const result = await saveOutlineAction(piece.id, rows.map(({ stale: _stale, ...row }) => row));
    if (!result.ok) setMessage(errorText(t, result));
    await refresh();
    return result.ok;
  }

  async function write() {
    const result = await startRunAction(piece.id, 'write');
    if (!result.ok) setMessage(errorText(t, result));
    await refresh();
  }

  const field = 'mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm';
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-slate-900">{t('outline.title')}</h3>
      {piece.gaps.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">{t('outline.gaps')}</p>
          <ul className="list-disc pl-5">{piece.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
      )}
      <ol className="space-y-3">
        {rows.map((row, index) => (
          <li key={row.id ?? `new-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
            <label className="block text-sm">{t('outline.heading')}<input value={row.heading} onChange={(e) => update(index, { heading: e.target.value })} className={field} /></label>
            <label className="mt-2 block text-sm">{t('outline.intent')}<input value={row.intent} onChange={(e) => update(index, { intent: e.target.value })} className={field} /></label>
            <p className="mt-2 text-xs text-slate-500">
              {row.kind === 'boilerplate' ? t('outline.boilerplate') : t('outline.sources', { count: row.chunkIds.length })}
              {row.stale && ` · ${t('outline.stale')}`}
            </p>
            <div className="mt-2 flex gap-3 text-xs">
              <button type="button" disabled={index === 0} onClick={() => move(index, -1)}>{t('outline.up')}</button>
              <button type="button" disabled={index === rows.length - 1} onClick={() => move(index, 1)}>{t('outline.down')}</button>
              <button type="button" onClick={() => setRows((r) => r.filter((_, i) => i !== index))} className="text-red-600">{t('outline.remove')}</button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => setRows((r) => [...r, { heading: '', intent: '', chunkIds: [], estChars: 200, kind: 'boilerplate', stale: false }])} className="text-sm text-slate-700 underline">
        {t('outline.add')}
      </button>
      {message && <p className="text-sm text-red-600">{message}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void save()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">{t('outline.save')}</button>
        <button type="button" disabled={busy || rows.length === 0} onClick={() => void write()} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed">{t('outline.write')}</button>
      </div>
    </section>
  );
}
```

"Write article" is enabled only after saving when rows differ from `piece.outline` — simplest correct behaviour: `write()` first calls `save()` when `JSON.stringify(rows) !== JSON.stringify(piece.outline)`, then starts the run. Add that check at the top of `write()`. Run the test → PASS.

- [ ] **Step 4: Writing, review and citation popover (review test first)**

Create `WritingPanel.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { PanelProps } from './panel-props';

export default function WritingPanel({ piece }: PanelProps) {
  const t = useTranslations('admin.studio');
  const steps = piece.activeRun?.kind === 'write' ? piece.activeRun.steps : [];
  const sections = steps.filter((s) => s.key.startsWith('section:'));
  const current = sections.findIndex((s) => s.status === 'running');
  const finishing = steps.some((s) => s.key === 'finish' && s.status === 'running');
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-slate-900">{t('writing.title')}</h3>
      {sections.length > 0 && !finishing && (
        <p className="text-sm text-slate-700">{t('writing.section', { n: (current === -1 ? sections.length : current + 1), total: piece.outline.length })}</p>
      )}
      {finishing && <p className="text-sm text-slate-700">{t('writing.finishing')}</p>}
      <ol className="space-y-1 text-sm">
        {piece.outline.map((o) => {
          const done = piece.sections.some((s) => s.outlineId === o.id) && !o.stale;
          return <li key={o.id} className={done ? 'text-emerald-700' : 'text-slate-500'}>{done ? '✓' : '○'} {o.heading}</li>;
        })}
      </ol>
    </section>
  );
}
```

The workspace test expects "Section 2 of 2": with steps `section:o1` succeeded and `section:o2` running, `current = 1` → n = 2, total = 2. ✓

Create `ReviewPanel.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

vi.mock('@/actions/studio-pieces', () => ({
  rewriteSectionAction: vi.fn(async () => ({ ok: true, data: { runId: 'r' } })),
  startRunAction: vi.fn(async () => ({ ok: true, data: { runId: 'r' } })),
  createDraftPostAction: vi.fn(async () => ({ ok: true, data: { articleId: 'a' } })),
  getChunksAction: vi.fn(async () => ({ ok: true, data: [{ id: 'k1', sourceTitle: 'メモ', text: '課題を一つに絞ります', locator: {} }] })),
}));

import { getChunksAction, rewriteSectionAction } from '@/actions/studio-pieces';
import ReviewPanel from './ReviewPanel';

const piece = {
  id: 'p1', stage: 'review', title: 'AI導入',
  outline: [{ id: 'o1', heading: '課題', intent: '', chunkIds: ['k1'], estChars: 1, kind: 'source', stale: false }],
  sections: [{
    outlineId: 'o1', heading: '課題', enStale: false, en: null, flags: ['No citation for "x".'],
    blocks: [{ type: 'paragraph', sentences: [
      { text: 'まず課題を絞ります。', cite: ['k1'], connective: false },
      { text: 'では次へ。', cite: [], connective: true },
    ] }],
  }],
} as never;

describe('ReviewPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders sentences with citation markers and flags', () => {
    renderAdmin(<ReviewPanel piece={piece} busy={false} refresh={vi.fn()} />);
    expect(screen.getByText('まず課題を絞ります。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Source 1' })).toBeInTheDocument();
    expect(screen.getByText('No citation for "x".')).toBeInTheDocument();
  });

  it('shows the cited passage on demand', async () => {
    renderAdmin(<ReviewPanel piece={piece} busy={false} refresh={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Source 1' }));
    expect(getChunksAction).toHaveBeenCalledWith(['k1']);
    expect(await screen.findByText('課題を一つに絞ります')).toBeInTheDocument();
  });

  it('runs a section action', async () => {
    renderAdmin(<ReviewPanel piece={piece} busy={false} refresh={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Shorten' }));
    expect(rewriteSectionAction).toHaveBeenCalledWith('p1', { sectionId: 'o1', instruction: 'Make this section about half as long.' });
  });
});
```

Create `CitationPopover.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getChunksAction } from '@/actions/studio-pieces';

type Chunk = { id: string; sourceTitle: string; text: string; locator: Record<string, unknown> };

export default function CitationPopover({ ids, index }: { ids: string[]; index: number }) {
  const t = useTranslations('admin.studio.review');
  const [open, setOpen] = useState(false);
  const [chunks, setChunks] = useState<Chunk[] | null>(null);

  async function toggle() {
    setOpen((o) => !o);
    if (!chunks) {
      const result = await getChunksAction(ids);
      if (result.ok) setChunks(result.data);
    }
  }

  return (
    <span className="relative">
      <button type="button" aria-label={`${t('citation')} ${index}`} onClick={() => void toggle()} className="ml-0.5 align-super text-[10px] text-blue-700">
        [{index}]
      </button>
      {open && chunks && (
        <span className="absolute left-0 top-5 z-10 block w-80 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg">
          {chunks.map((c) => (
            <span key={c.id} className="block">
              <span className="block font-medium text-slate-900">{c.sourceTitle}</span>
              {c.text}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
```

Create `ReviewPanel.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createDraftPostAction, rewriteSectionAction, startRunAction } from '@/actions/studio-pieces';
import type { Sentence, StudioBlock } from '@/generator/pieces/piece-types';
import type { StudioResult } from '@/lib/studio/action-types';
import type { PanelProps } from './panel-props';
import CitationPopover from './CitationPopover';
import { errorText } from './errorText';

const ACTIONS = ['regenerate', 'expand', 'shorten', 'formal'] as const;

function Sentences({ sentences, counter }: { sentences: Sentence[]; counter: { n: number } }) {
  const t = useTranslations('admin.studio.review');
  return (
    <>
      {sentences.map((s, i) => (
        <span key={i} title={s.connective ? t('connective') : undefined} className={s.connective ? 'text-slate-500' : undefined}>
          {s.text}
          {s.cite.length > 0 && <CitationPopover ids={s.cite} index={++counter.n} />}
        </span>
      ))}
    </>
  );
}

function Block({ block, counter }: { block: StudioBlock; counter: { n: number } }) {
  switch (block.type) {
    case 'paragraph':
      return <p><Sentences sentences={block.sentences} counter={counter} /></p>;
    case 'quote':
      return <blockquote className="border-l-4 border-slate-200 pl-3"><Sentences sentences={block.sentences} counter={counter} /></blockquote>;
    case 'callout':
      return <div className="rounded-lg bg-slate-50 p-3">{block.title && <p className="font-medium">{block.title}</p>}<Sentences sentences={block.sentences} counter={counter} /></div>;
    case 'list':
      return <ul className="list-disc pl-5">{block.items.map((item, i) => <li key={i}><Sentences sentences={[item]} counter={counter} /></li>)}</ul>;
    case 'heading3':
      return <h4 className="font-semibold">{block.text}</h4>;
    case 'table':
      return (
        <table className="text-sm"><thead><tr>{block.headers.map((h) => <th key={h} className="pr-4 text-left">{h}</th>)}</tr></thead>
          <tbody>{block.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="pr-4">{c}</td>)}</tr>)}</tbody></table>
      );
  }
}

export default function ReviewPanel({ piece, busy, refresh }: PanelProps) {
  const t = useTranslations('admin.studio');
  const [message, setMessage] = useState<string | null>(null);
  const counter = { n: 0 };

  async function act(promise: Promise<StudioResult<unknown>>) {
    const r = await promise;
    if (!r.ok) setMessage(errorText(t, r));
    await refresh();
  }

  function rewrite(sectionId: string, instruction: string) {
    void act(rewriteSectionAction(piece.id, { sectionId, instruction }));
  }

  return (
    <section className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">{piece.title}</h3>
      {piece.sections.map((section) => (
        <article key={section.outlineId} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-800">
          <h4 className="text-base font-semibold text-slate-900">{section.heading}</h4>
          {section.flags.length > 0 && (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-medium">{t('review.flags')}</p>
              <ul className="list-disc pl-4">{section.flags.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          )}
          {section.blocks.map((block, i) => <Block key={i} block={block} counter={counter} />)}
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs">
            {ACTIONS.map((a) => (
              <button key={a} type="button" disabled={busy} onClick={() => rewrite(section.outlineId, t(`review.instructions.${a}`))} className="rounded-md border border-slate-200 px-2 py-1">
                {t(`review.actions.${a}`)}
              </button>
            ))}
            <button type="button" disabled={busy} onClick={() => { const text = window.prompt(t('review.customPrompt')); if (text) rewrite(section.outlineId, text); }} className="rounded-md border border-slate-200 px-2 py-1">
              {t('review.actions.custom')}
            </button>
          </div>
        </article>
      ))}
      {message && <p className="text-sm text-red-600">{message}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void act(startRunAction(piece.id, 'translate'))} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">{t('review.translate')}</button>
        <button type="button" disabled={busy} onClick={() => void act(createDraftPostAction(piece.id))} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed">{t('review.handoff')}</button>
      </div>
    </section>
  );
}
```

The custom-instruction button uses `window.prompt` — acceptable in the admin, and it keeps the plan free of another dialog component. Run the review test → PASS.

- [ ] **Step 5: Translate, handoff and history (handoff test first)**

Create `TranslatePanel.tsx` — JA/EN side by side per section: left column renders JA via the same `Block` rendering without citation buttons (reuse `sectionPlainText` split by blank lines), right column renders `section.en` (paragraph/quote text, list items, table) or the `translate.stale` note when `en` is null or `enStale`; below: **Translate to English** (`startRunAction(piece.id, 'translate')`) and **Create draft post** (`createDraftPostAction`), same button classes and `errorText` handling as `ReviewPanel`.

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createDraftPostAction, startRunAction } from '@/actions/studio-pieces';
import { sectionPlainText, type EnBlock } from '@/generator/pieces/piece-types';
import type { StudioResult } from '@/lib/studio/action-types';
import type { PanelProps } from './panel-props';
import { errorText } from './errorText';

function enText(block: EnBlock): string {
  switch (block.type) {
    case 'paragraph': case 'quote': case 'heading3': return block.text;
    case 'callout': return [block.title, block.text].filter(Boolean).join('\n');
    case 'list': return block.items.map((i) => `• ${i}`).join('\n');
    case 'table': return [block.headers.join(' | '), ...block.rows.map((r) => r.join(' | '))].join('\n');
  }
}

export default function TranslatePanel({ piece, busy, refresh }: PanelProps) {
  const t = useTranslations('admin.studio');
  const [message, setMessage] = useState<string | null>(null);
  async function act(promise: Promise<StudioResult<unknown>>) {
    const r = await promise;
    if (!r.ok) setMessage(errorText(t, r));
    await refresh();
  }
  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-slate-900">{t('translate.title')}</h3>
      {piece.titleEn && <p className="text-sm text-slate-600">{piece.title} / {piece.titleEn}</p>}
      {piece.sections.map((s) => (
        <div key={s.outlineId} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm md:grid-cols-2">
          <div className="whitespace-pre-line text-slate-800">{sectionPlainText(s)}</div>
          <div className="whitespace-pre-line text-slate-800">
            {s.en && !s.enStale
              ? [s.en.heading, ...s.en.blocks.map(enText)].join('\n\n')
              : <span className="text-amber-700">{t('translate.stale')}</span>}
          </div>
        </div>
      ))}
      {message && <p className="text-sm text-red-600">{message}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void act(startRunAction(piece.id, 'translate'))} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">{t('review.translate')}</button>
        <button type="button" disabled={busy} onClick={() => void act(createDraftPostAction(piece.id))} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed">{t('review.handoff')}</button>
      </div>
    </section>
  );
}
```

Create `HandoffPanel.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/actions/studio-pieces', () => ({ duplicatePieceAction: vi.fn() }));

import HandoffPanel from './HandoffPanel';

describe('HandoffPanel', () => {
  it('links to the editor and shows the tracked status', () => {
    renderAdmin(<HandoffPanel piece={{ id: 'p1', articleId: 'a1', article: { id: 'a1', status: 'published', slug: 'ai' }, category: 'notice' } as never} busy={false} refresh={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Open in editor' })).toHaveAttribute('href', '/admin/posts/a1');
    expect(screen.getByText('Post status: Published')).toBeInTheDocument();
  });

  it('says when the post was deleted', () => {
    renderAdmin(<HandoffPanel piece={{ id: 'p1', articleId: null, article: null, category: 'notice' } as never} busy={false} refresh={vi.fn()} />);
    expect(screen.getByText('Post status: Post deleted')).toBeInTheDocument();
  });
});
```

Create `HandoffPanel.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { duplicatePieceAction } from '@/actions/studio-pieces';
import type { PanelProps } from './panel-props';

export default function HandoffPanel({ piece }: PanelProps) {
  const t = useTranslations('admin.studio');
  const router = useRouter();
  const status = piece.article?.status ?? 'removed';
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-slate-900">{t('handoff.title')}</h3>
      <p className="text-sm text-slate-700">{t('handoff.status', { status: t(`pieces.tracked.${status}`) })}</p>
      <div className="flex gap-3 text-sm">
        {piece.article && <Link href={`/admin/posts/${piece.article.id}`} className="underline">{t('handoff.open')}</Link>}
        <button type="button" onClick={async () => { const r = await duplicatePieceAction(piece.id); if (r.ok) router.push(`/admin/studio/pieces/${r.data.pieceId}`); }} className="underline">
          {t('handoff.duplicate')}
        </button>
      </div>
    </section>
  );
}
```

Create `HistoryList.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { listSnapshotsAction, undoAction } from '@/actions/studio-pieces';
import type { PanelProps } from './panel-props';

export default function HistoryList({ piece, busy, refresh }: PanelProps) {
  const t = useTranslations('admin.studio.workspace');
  const [items, setItems] = useState<Array<{ id: string; reason: string; createdAt: string }>>([]);
  useEffect(() => {
    void listSnapshotsAction(piece.id).then((r) => r.ok && setItems(r.data));
  }, [piece.id, piece.updatedAt]);
  const locked = piece.stage === 'handed_off';
  return (
    <section className="space-y-2 text-sm">
      <h3 className="font-semibold text-slate-900">{t('undo')}</h3>
      {items.length === 0 && <p className="text-slate-500">{t('noHistory')}</p>}
      <ul className="space-y-1">
        {items.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span className="truncate text-slate-600">{s.reason} · {new Date(s.createdAt).toLocaleTimeString()}</span>
            {!locked && (
              <button type="button" disabled={busy} onClick={() => void undoAction(piece.id, s.id).then(refresh)} className="shrink-0 text-xs underline">
                {t('undoButton')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Run all component tests in `src/components/admin/studio/pieces` (including the workspace test from Task 5) → PASS.

---

### Task 7: Templates tab

**Files:** Create `src/components/admin/studio/TemplateManager.tsx`, `src/app/admin/(protected)/studio/templates/page.tsx`; test `TemplateManager.test.tsx`.

- [ ] **Step 1: Test first**

Create `src/components/admin/studio/TemplateManager.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

const T = { id: 't1', name: 'コラム', description: '', instructions: 'です・ます調', defaultCategory: 'useful-info', isDefault: true };
vi.mock('@/actions/studio-templates', () => ({
  listTemplatesAction: vi.fn(async () => ({ ok: true, data: [T] })),
  createTemplateAction: vi.fn(),
  updateTemplateAction: vi.fn(async () => ({ ok: true, data: undefined })),
  deleteTemplateAction: vi.fn(),
}));

import { updateTemplateAction } from '@/actions/studio-templates';
import TemplateManager from './TemplateManager';

describe('TemplateManager', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is read-only without studio.templates.manage', async () => {
    renderAdmin(<TemplateManager />, { permissions: ['studio.use'] });
    expect(await screen.findByText('コラム')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'New template' })).toBeNull();
  });

  it('saves edits and never offers to delete the default template', async () => {
    renderAdmin(<TemplateManager />, { permissions: ['studio.use', 'studio.templates.manage'] });
    const name = await screen.findByDisplayValue('コラム');
    await userEvent.clear(name);
    await userEvent.type(name, 'コラム（改）');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateTemplateAction).toHaveBeenCalledWith('t1', expect.objectContaining({ name: 'コラム（改）', defaultCategory: 'useful-info' }));
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

Create `src/components/admin/studio/TemplateManager.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  createTemplateAction,
  deleteTemplateAction,
  listTemplatesAction,
  updateTemplateAction,
  type TemplateDTO,
} from '@/actions/studio-templates';
import { usePermissions } from '@/components/admin/PermissionsContext';
import { ARTICLE_CREATE_CATEGORIES } from '@/lib/api/article-create-metadata';

type Draft = Omit<TemplateDTO, 'id' | 'isDefault'> & { id?: string; isDefault: boolean };
const EMPTY: Draft = { name: '', description: '', instructions: '', defaultCategory: 'useful-info', isDefault: false };

function Card({ template, canManage, onChanged }: { template: Draft; canManage: boolean; onChanged: () => void }) {
  const t = useTranslations('admin.studio');
  const [draft, setDraft] = useState(template);
  const field = 'mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm';
  const { id: _id, isDefault: _default, ...input } = draft;

  if (!canManage) {
    return (
      <li className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p className="font-medium text-slate-900">{draft.name} {draft.isDefault && <span className="text-xs text-slate-500">({t('templates.default')})</span>}</p>
        <p className="text-slate-500">{t(`category.${draft.defaultCategory}`)}</p>
        <p className="mt-2 whitespace-pre-line text-slate-700">{draft.instructions}</p>
      </li>
    );
  }
  return (
    <li className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <label className="block">{t('templates.name')}<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={field} /></label>
      <label className="block">{t('templates.description')}<input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={field} /></label>
      <label className="block">{t('templates.instructions')}<textarea rows={5} value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} className={field} /></label>
      <label className="block">{t('templates.defaultCategory')}
        <select value={draft.defaultCategory} onChange={(e) => setDraft({ ...draft, defaultCategory: e.target.value as Draft['defaultCategory'] })} className={field}>
          {ARTICLE_CREATE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={async () => { await (draft.id ? updateTemplateAction(draft.id, input) : createTemplateAction(input)); onChanged(); }} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover">
          {t('templates.save')}
        </button>
        {draft.id && !draft.isDefault && (
          <button type="button" onClick={async () => { if (window.confirm(t('templates.delete'))) { await deleteTemplateAction(draft.id!); onChanged(); } }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-red-600">
            {t('templates.delete')}
          </button>
        )}
      </div>
    </li>
  );
}

export default function TemplateManager() {
  const t = useTranslations('admin.studio.templates');
  const { can } = usePermissions();
  const canManage = can('studio.templates.manage');
  const [templates, setTemplates] = useState<Draft[]>([]);

  const load = useCallback(async () => {
    const result = await listTemplatesAction();
    if (result.ok) setTemplates(result.data);
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <section className="space-y-4">
      {canManage && (
        <button type="button" onClick={() => setTemplates((list) => [...list, EMPTY])} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">
          {t('new')}
        </button>
      )}
      <ul className="space-y-3">
        {templates.map((template, i) => (
          <Card key={template.id ?? `new-${i}`} template={template} canManage={canManage} onChanged={() => void load()} />
        ))}
      </ul>
    </section>
  );
}
```

Create `src/app/admin/(protected)/studio/templates/page.tsx`:

```tsx
import PermissionNeeded from '@/components/admin/PermissionNeeded';
import StudioHome from '@/components/admin/studio/StudioHome';
import TemplateManager from '@/components/admin/studio/TemplateManager';
import { hasPermission } from '@/lib/authz';

export default async function StudioTemplatesPage() {
  if (!(await hasPermission('studio.use'))) return <PermissionNeeded permission="studio.use" />;
  return <StudioHome><TemplateManager /></StudioHome>;
}
```

Run the test → PASS.

---

### Task 8: Docs, end-to-end run and verification

- [ ] **Step 1: CLAUDE.md** — in `### Content Studio` add:

```markdown
- **Pieces** — `studio_pieces` hold one article in progress: brief, selection, outline (sections linked to chunk ids), `sections` (JA sentences with `cite: chunkId[]` or `connective`), EN translation, SEO. Runs: `outline`, `write` (one resumable step per section + finish), `rewrite_section`, `translate`. `src/generator/pieces/grounding.ts` enforces the citation contract; violations after one repair become section `flags`. Snapshots (`studio_piece_snapshots`) back the History/undo list.
- **Handoff** — `createDraftPostAction` (needs `studio.use` + `articles.edit`) converts sections with `toArticleBlocks` (no citation data), creates an `articles` draft through `createArticleRecord`, and locks the piece (`handed_off`). The studio then only shows the post's status; duplicate the piece to redo it.
```

- [ ] **Step 2: End-to-end on the local DB with a real model** (needs `OPENAI_API_KEY`; otherwise note it as not run)

Run the worker and `yarn dev` against the local test DB (CLAUDE.md "Tests"; `yarn db:local-super-admin` first). Then: create a project, add a Japanese text source (several paragraphs of real notes), wait for Ready → **Pieces → New piece** → tick the source → brief (goal, author) → **Create outline** → check gaps and passage counts → **Write article** → watch "Section n of N" → in Review hover several citation markers and confirm each cited passage really contains the sentence's fact → **Shorten** one section, then restore it from History → **Translate to English** → **Create draft post** → open it in the editor. Record: number of sections, number of flags, anything cited wrongly. Confirm in SQL that the article's `blocks` contain no `cite`:

```bash
docker exec -e PGPASSWORD=postgres cosbe-studio-test-pg psql -U postgres -h localhost -d cosbe_test -c "SELECT title, status, blocks::text LIKE '%cite%' AS has_cite FROM articles ORDER BY created_at DESC LIMIT 1;"
```

Expected: `draft`, `has_cite = f`.

- [ ] **Step 3: Final verification** — `yarn lint && yarn type-check && yarn test` and the full DB slice. Report counts. Leave everything uncommitted.
