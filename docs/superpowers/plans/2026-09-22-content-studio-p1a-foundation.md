# Content Studio P1a — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the Content Studio foundation — permissions, run/step tables, a provider-agnostic AI layer, a pg-boss job queue, and a separate worker process — and prove it end to end with a "System check" run started from a new `/admin/studio` page.

**Architecture:** The web app creates a `studio_runs` row and enqueues its pg-boss job in one Prisma transaction. A separate Node worker (`worker/main.ts`, run with `tsx`, deployed to Cloud Run) pulls jobs, re-checks the creator's permissions from the database, executes the run's steps through framework-free engine code in `src/generator/`, and records status that the page polls. `src/ai/` wraps the Vercel AI SDK so later plans can call models without importing a provider.

**Tech Stack:** Next.js 16, React 19, Prisma 6.19, Postgres (Supabase), pg-boss 12.33, AI SDK (`ai` 7.0, `@ai-sdk/openai` 4.0), Zod 4, next-intl, Vitest 4, tsx.

**Spec:** `docs/superpowers/specs/2026-09-22-content-studio-design.md`

**Plan series:** P1 is split into four plans, each producing working software. This is **P1a**. Later plans (written after this one lands): **P1b** source library, ingest, chunking, retrieval, projects UI; **P1c** pieces, brief, outline, grounded writing, review, translation, handoff, stage rail; **P1d** agent chat.

## Global Constraints

- **Do not run** `git add` **or** `git commit` **at any point.** The user commits manually. Every task ends with the changes left in the working tree.
- **Never run migrations, scripts or DB tests against the Supabase database in** `.env`**.** DB work uses a disposable local Postgres only (see "Local test database" below). If unsure which database a command targets, stop and ask.
- Node ≥ 22.12 (pg-boss 12 and AI SDK 7 require it). `.nvmrc` is `lts/*`; run `nvm use`. Package manager: `yarn` (v1).
- Match existing style: 2-space indent, single quotes, Prettier (`yarn format` on touched files), `@/` imports.
- After editing `prisma/schema.prisma`, run `yarn postinstall`.
- All admin UI copy goes in both `messages/admin-en.json` and `messages/admin-ja.json`.
- Engine code (`src/generator/**`, `src/ai/**`, `worker/**`) must not import Next.js, `@/app/*`, `@/actions/*`, `@/components/*`, `@/lib/authz`, `@/lib/supabase/server` or `server-only` (enforced by ESLint in Task 1).
- New tables are named `studio_*` and have RLS enabled.
- Queue names: `studio.run.<kind>` per run kind, dead-letter queue `studio.dead`.
- Studio permissions: `studio.use`, `studio.templates.manage`, `studio.sources.delete` (group `studio`).
- Verification commands: `yarn test`, `yarn type-check`, `yarn lint`; DB slice: `ADMIN_TEST_DB=1 yarn test:db` against the local test database only.

### Local test database

Used by every DB step in this plan (same shape as CI's `postgres` service):

```bash
docker run -d --name cosbe-studio-test-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:17
export TEST_DB_URL='postgresql://postgres:postgres@localhost:55432/cosbe_test?schema=public'
docker exec cosbe-studio-test-pg createdb -U postgres cosbe_test
DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" yarn prisma migrate deploy
```

Run DB tests with explicit env so `.env` is never used:

```bash
DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" ADMIN_TEST_DB=1 yarn vitest run --project db <files>
```

## File Map

| File                                                                         | Responsibility                                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `package.json`, `eslint.config.mjs`, `vitest.config.ts`                      | Dependencies, Node engine, worker scripts, engine import boundary, test globs     |
| `src/lib/permissions.ts` (+ test), `messages/admin-*.json`                   | Studio permission keys, group, labels                                             |
| `prisma/migrations/20260922120000_add_studio_permissions/`                   | Grants studio permissions to default roles                                        |
| `prisma/schema.prisma`, `prisma/migrations/20260922130000_add_studio_runs/`  | `studio_runs`, `studio_run_steps`, RLS                                            |
| `src/generator/runs/run-types.ts`                                            | Run kinds/statuses, kind → permission map, `NonRetryableRunError`, `errorMessage` |
| `src/generator/runs/runs-repository.ts` (+ db test)                          | Run/step persistence, idempotent `runStep`, token ceiling                         |
| `src/ai/models.ts`, `src/ai/generate.ts` (+ tests)                           | Task → model config; structured/plain generation and embeddings with usage        |
| `src/generator/queue/queues.ts`, `job-data.ts`, `enqueue.ts`                 | Queue names/settings, job payload schema, transactional enqueue                   |
| `src/lib/studio/web-boss.ts`                                                 | Web-side pg-boss instance (1-connection pool; sends go through Prisma tx)         |
| `src/generator/authz.ts` (+ test)                                            | Permission check by user id for the worker                                        |
| `src/generator/runs/run-handler.ts` (+ test)                                 | pg-boss handlers: run lifecycle, retries, dead letter                             |
| `src/generator/executors/system-check.ts`, `index.ts` (+ test)               | The `system_check` executor and the executor registry                             |
| `src/generator/queue/queue.db.test.ts`                                       | End-to-end: enqueue → worker → run succeeded / dead-lettered / forbidden          |
| `worker/env.ts`, `worker/health-server.ts`, `worker/main.ts` (+ tests)       | Worker process: env, `/healthz`, queue wiring, graceful shutdown                  |
| `worker/Dockerfile`, `worker/Dockerfile.dockerignore`, `.env.example`        | Worker image and env documentation                                                |
| `src/lib/studio/action-types.ts`, `src/lib/studio/run-dto.ts` (+ test)       | Serializable result/DTO types for the studio UI                                   |
| `src/actions/studio.ts` (+ test)                                             | `startSystemCheckAction`, `getRunStatusAction`                                    |
| `src/components/admin/studio/StudioHome.tsx`, `SystemCheckCard.tsx` (+ test) | Studio landing page and system-check polling card                                 |
| `src/app/admin/(protected)/studio/page.tsx`                                  | Permission-guarded page                                                           |
| `src/app/admin/(protected)/AdminProtectedShell.tsx` (+ test)                 | "Content Studio" sidebar entry                                                    |
| `CLAUDE.md`                                                                  | Studio commands, architecture and worker deployment notes                         |

---

### Task 1: Dependencies, Node engine and the engine import boundary

**Files:**

- Modify: `package.json`
- Modify: `eslint.config.mjs`
- Modify: `vitest.config.ts`

**Interfaces:**

- Produces: packages `pg-boss`, `ai`, `@ai-sdk/openai`; scripts `worker:dev`, `worker:start`; ESLint rule forbidding framework imports in `src/generator/**`, `src/ai/**`, `worker/**`; Vitest `unit` project also runs `worker/**/*.test.ts`.

- [ ] **Step 1: Install dependencies**

```bash
nvm use
yarn add pg-boss@^12.33.5 ai@^7.0.111 @ai-sdk/openai@^4.0.72
```

Expected: `package.json` `dependencies` gains the three packages; `yarn.lock` updates.

- [ ] **Step 2: Add the Node engine and worker scripts to** `package.json`

Add a top-level `engines` field and two scripts (keep existing scripts):

```json
  "engines": {
    "node": ">=22.12.0"
  },
```

```json
    "worker:dev": "tsx watch --env-file=.env worker/main.ts",
    "worker:start": "tsx worker/main.ts",
```

- [ ] **Step 3: Add the engine import boundary to** `eslint.config.mjs`

Insert this object into the `defineConfig([...])` array, after the test-files override block:

```js
  {
    // Engine code runs in the studio worker, tests and (later) in-process.
    // It must not depend on Next.js or request-scoped auth.
    files: ['src/generator/**/*.ts', 'src/ai/**/*.ts', 'worker/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['next', 'next/*'],
              message: 'Engine code must not depend on Next.js.',
            },
            {
              group: ['@/app/*', '@/actions/*', '@/components/*'],
              message: 'Engine code must not import UI or server actions.',
            },
            {
              group: ['@/lib/authz', '@/lib/supabase/server', 'server-only'],
              message:
                'Engine code has no request session; use src/generator/authz.ts.',
            },
          ],
        },
      ],
    },
  },
```

- [ ] **Step 4: Verify the rule fires**

```bash
mkdir -p src/generator && printf "import { revalidatePath } from 'next/cache';\nexport const probe = revalidatePath;\n" > src/generator/lint-probe.ts
yarn eslint src/generator/lint-probe.ts
```

Expected: FAIL with `Engine code must not depend on Next.js.` Then delete the probe:

```bash
rm src/generator/lint-probe.ts
```

- [ ] **Step 5: Let the unit project run worker tests**

In `vitest.config.ts`, change the `unit` project's `include` to:

```ts
          include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
```

- [ ] **Step 6: Verify nothing else broke**

Run: `yarn lint && yarn type-check && yarn test`
Expected: all PASS (no new tests yet).

- [ ] **Step 7: Leave changes uncommitted**

Do not commit. Changes stay in the working tree for the user.

---

### Task 2: Studio permissions

**Files:**

- Modify: `src/lib/permissions.ts`
- Modify: `src/lib/permissions.test.ts`
- Modify: `messages/admin-en.json`, `messages/admin-ja.json`
- Create: `prisma/migrations/20260922120000_add_studio_permissions/migration.sql`
- Test (existing, re-run): `src/lib/access-messages.test.ts`, `src/lib/roles-seed.db.test.ts`

**Interfaces:**

- Produces: `Permission` union includes `'studio.use' | 'studio.templates.manage' | 'studio.sources.delete'`; `PermissionGroup` includes `'studio'`; default roles `developer` and `marketing` get `studio.use` + `studio.templates.manage`; `admin` gets all three (it already takes every permission except `users.delete`).

- [ ] **Step 1: Update the failing catalog test**

In `src/lib/permissions.test.ts`, replace the first test in `describe('permission catalog', …)`:

```ts
it('has the 19 permissions (16 access/content + 3 studio)', () => {
  expect(ALL_PERMISSIONS).toHaveLength(19);
  expect(ALL_PERMISSIONS).toContain('users.delete');
  expect(ALL_PERMISSIONS).toContain('translations.history.delete');
  expect(ALL_PERMISSIONS).toEqual(
    expect.arrayContaining([
      'studio.use',
      'studio.templates.manage',
      'studio.sources.delete',
    ])
  );
});

it('developer and marketing can use studio but not delete sources', () => {
  for (const role of ['developer', 'marketing'] as const) {
    expect(DEFAULT_ROLE_PERMISSIONS[role]).toEqual(
      expect.arrayContaining(['studio.use', 'studio.templates.manage'])
    );
    expect(DEFAULT_ROLE_PERMISSIONS[role]).not.toContain(
      'studio.sources.delete'
    );
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run --project unit src/lib/permissions.test.ts`
Expected: FAIL — length is 16, studio keys missing.

- [ ] **Step 3: Add the permissions**

In `src/lib/permissions.ts`:

```ts
export type PermissionGroup =
  'content' | 'media' | 'translations' | 'access' | 'studio';

export const PERMISSION_GROUPS: PermissionGroup[] = [
  'content',
  'media',
  'translations',
  'studio',
  'access',
];
```

Add to the `PERMISSIONS` object, after `'translations.history.delete'`:

```ts
  'studio.use': { group: 'studio' },
  'studio.templates.manage': { group: 'studio' },
  'studio.sources.delete': { group: 'studio' },
```

Append to the `developer` and `marketing` arrays in `DEFAULT_ROLE_PERMISSIONS`:

```ts
    'studio.use',
    'studio.templates.manage',
```

(`admin` is `ALL_PERMISSIONS.filter((p) => p !== 'users.delete')` and needs no change.)

- [ ] **Step 4: Add labels in both locales**

In `messages/admin-en.json`, inside `access.groups` add `"studio": "Content Studio"`, and inside `access.permissions` add:

```json
      "studio_use": {
        "label": "Use Content Studio",
        "description": "Create projects and sources, and generate article drafts."
      },
      "studio_templates_manage": {
        "label": "Manage studio templates",
        "description": "Create, edit and delete shared generation templates."
      },
      "studio_sources_delete": {
        "label": "Delete studio sources",
        "description": "Permanently delete sources from the shared library."
      },
```

In `messages/admin-ja.json`, inside `access.groups` add `"studio": "コンテンツスタジオ"`, and inside `access.permissions` add:

```json
      "studio_use": {
        "label": "コンテンツスタジオの利用",
        "description": "プロジェクトとソースを作成し、記事の下書きを生成します。"
      },
      "studio_templates_manage": {
        "label": "スタジオテンプレートの管理",
        "description": "共有の生成テンプレートを作成・編集・削除します。"
      },
      "studio_sources_delete": {
        "label": "スタジオソースの削除",
        "description": "共有ライブラリからソースを完全に削除します。"
      },
```

- [ ] **Step 5: Write the role-grant migration**

Create `prisma/migrations/20260922120000_add_studio_permissions/migration.sql`:

```sql
-- Content Studio permissions for the default roles. Must match
-- DEFAULT_ROLE_PERMISSIONS in src/lib/permissions.ts
-- (checked by src/lib/roles-seed.db.test.ts).
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT r."id", p.permission
FROM "roles" r
CROSS JOIN LATERAL unnest(
  CASE r."key"
    WHEN 'admin' THEN ARRAY[
      'studio.use', 'studio.templates.manage', 'studio.sources.delete'
    ]
    WHEN 'developer' THEN ARRAY['studio.use', 'studio.templates.manage']
    WHEN 'marketing' THEN ARRAY['studio.use', 'studio.templates.manage']
  END
) AS p(permission)
WHERE r."key" IN ('admin', 'developer', 'marketing')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 6: Run the unit tests**

Run: `yarn vitest run --project unit src/lib/permissions.test.ts src/lib/access-messages.test.ts`
Expected: PASS (the access-messages test checks every permission and group has EN/JA copy).

- [ ] **Step 7: Run the seed DB test against the local test database**

```bash
DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" yarn prisma migrate deploy
DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" ADMIN_TEST_DB=1 yarn vitest run --project db src/lib/roles-seed.db.test.ts
```

Expected: PASS — `admin`, `developer`, `marketing` rows equal `DEFAULT_ROLE_PERMISSIONS`.

- [ ] **Step 8: Full checks**

Run: `yarn test && yarn type-check && yarn lint`
Expected: PASS. If a roles-UI component test lists permission groups explicitly, add `Content Studio` to its expectations.

- [ ] **Step 9: Leave changes uncommitted**

---

### Task 3: Run tables and the runs repository

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260922130000_add_studio_runs/migration.sql`
- Create: `src/generator/runs/run-types.ts`
- Create: `src/generator/runs/runs-repository.ts`
- Test: `src/generator/runs/runs-repository.db.test.ts`

**Interfaces:**

- Produces (`run-types.ts`):
  - `RUN_KINDS = ['system_check'] as const`, `type RunKind`, `isRunKind(value: string): value is RunKind`
  - `RUN_STATUSES`, `type RunStatus`, `isTerminalRunStatus(status: string): boolean`
  - `RUN_KIND_PERMISSION: Record<RunKind, Permission>`
  - `class NonRetryableRunError extends Error`
  - `errorMessage(error: unknown): string` (max 2,000 chars)
- Produces (`runs-repository.ts`):
  - `type Db = Prisma.TransactionClient | typeof prisma`
  - `type CreateRunInput = { kind: RunKind; createdById: string; input?: Prisma.InputJsonValue; pieceId?: string; sourceId?: string; tokenCeiling?: number | null }`
  - `createRun(db: Db, input: CreateRunInput): Promise<StudioRun>`
  - `getRun(id: string): Promise<RunWithSteps | null>`; `type RunWithSteps` (run + steps ordered by `ordinal`)
  - `markRunStarted(id): Promise<boolean>`, `markRunSucceeded(id): Promise<void>`, `markRunFailed(id, error: string): Promise<void>`, `recordRunError(id, error: string): Promise<void>`, `cancelRun(id): Promise<boolean>`
  - `addRunUsage(id, usage: { inputTokens: number; outputTokens: number }): Promise<void>` — throws `TokenCeilingExceededError`
  - `runStep<T extends Prisma.InputJsonValue>(runId, step: { key: string; ordinal: number }, fn: () => Promise<T>): Promise<T>`

- [ ] **Step 1: Add the Prisma models**

Append to `prisma/schema.prisma`:

```prisma
/// One unit of studio background work (system check, ingest, outline, write, ...).
/// piece_id / source_id get foreign keys when those tables exist (P1b/P1c).
model StudioRun {
  id           String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  kind         String
  status       String          @default("queued")
  pieceId      String?         @map("piece_id") @db.Uuid
  sourceId     String?         @map("source_id") @db.Uuid
  input        Json            @default("{}")
  error        String?
  tokensIn     Int             @default(0) @map("tokens_in")
  tokensOut    Int             @default(0) @map("tokens_out")
  tokenCeiling Int?            @map("token_ceiling")
  createdById  String?         @map("created_by") @db.Uuid
  createdBy    AdminUser?      @relation(fields: [createdById], references: [id], onDelete: SetNull)
  createdAt    DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  startedAt    DateTime?       @map("started_at") @db.Timestamptz(6)
  finishedAt   DateTime?       @map("finished_at") @db.Timestamptz(6)
  steps        StudioRunStep[]

  @@index([pieceId, createdAt(sort: Desc)])
  @@index([status])
  @@map("studio_runs")
}

/// A resumable step of a run. A succeeded step is never re-executed.
model StudioRunStep {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  runId      String    @map("run_id") @db.Uuid
  run        StudioRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  ordinal    Int
  key        String
  status     String
  output     Json?
  error      String?
  attempts   Int       @default(0)
  startedAt  DateTime? @map("started_at") @db.Timestamptz(6)
  finishedAt DateTime? @map("finished_at") @db.Timestamptz(6)

  @@unique([runId, key])
  @@map("studio_run_steps")
}
```

In `model AdminUser`, add the back-relation below `roles UserRole[]`:

```prisma
  studioRuns         StudioRun[]
```

Run: `yarn postinstall`
Expected: `✔ Generated Prisma Client`.

- [ ] **Step 2: Write the migration**

Create `prisma/migrations/20260922130000_add_studio_runs/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "studio_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "piece_id" UUID,
    "source_id" UUID,
    "input" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "token_ceiling" INTEGER,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "studio_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_runs_status_check" CHECK ("status" IN ('queued', 'running', 'succeeded', 'failed', 'cancelled'))
);

-- CreateTable
CREATE TABLE "studio_run_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_id" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "studio_run_steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_run_steps_status_check" CHECK ("status" IN ('running', 'succeeded', 'failed'))
);

-- CreateIndex
CREATE INDEX "studio_runs_piece_id_created_at_idx" ON "studio_runs"("piece_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "studio_runs_status_idx" ON "studio_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "studio_run_steps_run_id_key_key" ON "studio_run_steps"("run_id", "key");

-- AddForeignKey
ALTER TABLE "studio_runs" ADD CONSTRAINT "studio_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_run_steps" ADD CONSTRAINT "studio_run_steps_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "studio_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma creates these in "public", which the Supabase Data API exposes.
-- RLS with no policies blocks anon/authenticated API access; Prisma connects
-- as the table owner and is unaffected.
ALTER TABLE "studio_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio_run_steps" ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 3: Apply it locally and confirm schema and migrations agree**

```bash
DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" yarn prisma migrate deploy
docker exec cosbe-studio-test-pg createdb -U postgres cosbe_shadow
yarn prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url 'postgresql://postgres:postgres@localhost:55432/cosbe_shadow' --exit-code
```

Expected: `migrate deploy` applies both new migrations; `migrate diff` prints `No difference detected.` and exits 0. (CHECK constraints are not modelled by Prisma and do not show as drift.) If it prints SQL, fix the migration until they match.

- [ ] **Step 4: Write** `run-types.ts`

Create `src/generator/runs/run-types.ts`:

```ts
import type { Permission } from '@/lib/permissions';

/** Later plans append kinds (ingest, outline, write, ...). */
export const RUN_KINDS = ['system_check'] as const;
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
};

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
```

- [ ] **Step 5: Write the failing DB test**

Create `src/generator/runs/runs-repository.db.test.ts`:

```ts
import { randomUUID } from 'node:crypto';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  addRunUsage,
  cancelRun,
  createRun,
  getRun,
  markRunFailed,
  markRunStarted,
  markRunSucceeded,
  recordRunError,
  runStep,
  TokenCeilingExceededError,
} from './runs-repository';

const adminId = randomUUID();

beforeAll(async () => {
  await prisma.adminUser.create({
    data: { id: adminId, email: `runs-${adminId}@test.local` },
  });
});

beforeEach(async () => {
  await prisma.studioRun.deleteMany({ where: { createdById: adminId } });
});

afterAll(async () => {
  await prisma.studioRun.deleteMany({ where: { createdById: adminId } });
  await prisma.adminUser.delete({ where: { id: adminId } });
});

function newRun(extra: { tokenCeiling?: number } = {}) {
  return createRun(prisma, {
    kind: 'system_check',
    createdById: adminId,
    ...extra,
  });
}

describe('studio runs repository', () => {
  it('enables RLS on the studio run tables', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ relname: string; relrowsecurity: boolean }>
    >`SELECT relname, relrowsecurity FROM pg_class
      WHERE relname IN ('studio_runs', 'studio_run_steps')`;
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });

  it('creates a queued run with zero usage and empty input', async () => {
    const run = await newRun();
    expect(run.status).toBe('queued');
    expect(run.tokensIn).toBe(0);
    expect(run.tokensOut).toBe(0);
    expect(run.input).toEqual({});
  });

  it('moves queued → running → succeeded and stamps times', async () => {
    const run = await newRun();
    expect(await markRunStarted(run.id)).toBe(true);
    await markRunSucceeded(run.id);
    const done = await getRun(run.id);
    expect(done?.status).toBe('succeeded');
    expect(done?.startedAt).toBeInstanceOf(Date);
    expect(done?.finishedAt).toBeInstanceOf(Date);
  });

  it('keeps the first startedAt when a retry starts the run again', async () => {
    const run = await newRun();
    await markRunStarted(run.id);
    const first = (await getRun(run.id))?.startedAt;
    await new Promise((r) => setTimeout(r, 20));
    expect(await markRunStarted(run.id)).toBe(true);
    expect((await getRun(run.id))?.startedAt).toEqual(first);
  });

  it('does not start a cancelled run', async () => {
    const run = await newRun();
    expect(await cancelRun(run.id)).toBe(true);
    expect(await markRunStarted(run.id)).toBe(false);
    expect((await getRun(run.id))?.status).toBe('cancelled');
  });

  it('never changes a terminal run', async () => {
    const run = await newRun();
    await markRunStarted(run.id);
    await markRunSucceeded(run.id);
    await markRunFailed(run.id, 'late failure');
    expect(await cancelRun(run.id)).toBe(false);
    const after = await getRun(run.id);
    expect(after?.status).toBe('succeeded');
    expect(after?.error).toBeNull();
  });

  it('records an attempt error without ending the run', async () => {
    const run = await newRun();
    await markRunStarted(run.id);
    await recordRunError(run.id, 'timeout talking to provider');
    const after = await getRun(run.id);
    expect(after?.status).toBe('running');
    expect(after?.error).toBe('timeout talking to provider');
  });

  it('runStep stores output and skips the function once succeeded', async () => {
    const run = await newRun();
    await markRunStarted(run.id);
    const fn = vi.fn(async () => ({ value: 1 }));
    expect(await runStep(run.id, { key: 'a', ordinal: 0 }, fn)).toEqual({
      value: 1,
    });
    expect(await runStep(run.id, { key: 'a', ordinal: 0 }, fn)).toEqual({
      value: 1,
    });
    expect(fn).toHaveBeenCalledTimes(1);
    const step = (await getRun(run.id))?.steps[0];
    expect(step?.status).toBe('succeeded');
    expect(step?.attempts).toBe(1);
  });

  it('runStep marks a failed step and counts the retry attempt', async () => {
    const run = await newRun();
    await markRunStarted(run.id);
    await expect(
      runStep(run.id, { key: 'b', ordinal: 1 }, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    let step = (await getRun(run.id))?.steps[0];
    expect(step?.status).toBe('failed');
    expect(step?.error).toBe('boom');

    await runStep(run.id, { key: 'b', ordinal: 1 }, async () => ({ ok: true }));
    step = (await getRun(run.id))?.steps[0];
    expect(step?.status).toBe('succeeded');
    expect(step?.error).toBeNull();
    expect(step?.attempts).toBe(2);
  });

  it('addRunUsage accumulates and enforces the token ceiling', async () => {
    const run = await newRun({ tokenCeiling: 100 });
    await addRunUsage(run.id, { inputTokens: 40, outputTokens: 10 });
    await expect(
      addRunUsage(run.id, { inputTokens: 40, outputTokens: 20 })
    ).rejects.toBeInstanceOf(TokenCeilingExceededError);
    const after = await getRun(run.id);
    expect(after?.tokensIn).toBe(80);
    expect(after?.tokensOut).toBe(30);
  });

  it('addRunUsage never throws without a ceiling', async () => {
    const run = await newRun();
    await addRunUsage(run.id, { inputTokens: 1_000_000, outputTokens: 1 });
    expect((await getRun(run.id))?.tokensIn).toBe(1_000_000);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" ADMIN_TEST_DB=1 yarn vitest run --project db src/generator/runs/runs-repository.db.test.ts`
Expected: FAIL — cannot resolve `./runs-repository`.

- [ ] **Step 7: Implement the repository**

Create `src/generator/runs/runs-repository.ts`:

```ts
import type { Prisma, StudioRun } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { errorMessage, type RunKind } from './run-types';

export type Db = Prisma.TransactionClient | typeof prisma;

export type CreateRunInput = {
  kind: RunKind;
  createdById: string;
  input?: Prisma.InputJsonValue;
  pieceId?: string;
  sourceId?: string;
  tokenCeiling?: number | null;
};

export class TokenCeilingExceededError extends Error {
  readonly runId: string;
  readonly used: number;
  readonly ceiling: number;

  constructor(runId: string, used: number, ceiling: number) {
    super(
      `Run used ${used} tokens, over its ceiling of ${ceiling}. Raise STUDIO_RUN_TOKEN_CEILING or narrow the sources.`
    );
    this.name = 'TokenCeilingExceededError';
    this.runId = runId;
    this.used = used;
    this.ceiling = ceiling;
  }
}

export function createRun(db: Db, input: CreateRunInput): Promise<StudioRun> {
  return db.studioRun.create({
    data: {
      kind: input.kind,
      createdById: input.createdById,
      input: input.input ?? {},
      pieceId: input.pieceId ?? null,
      sourceId: input.sourceId ?? null,
      tokenCeiling: input.tokenCeiling ?? null,
    },
  });
}

export function getRun(id: string) {
  return prisma.studioRun.findUnique({
    where: { id },
    include: { steps: { orderBy: { ordinal: 'asc' } } },
  });
}

export type RunWithSteps = NonNullable<Awaited<ReturnType<typeof getRun>>>;

/** queued|running → running. False when the run was cancelled or already ended. */
export async function markRunStarted(id: string): Promise<boolean> {
  const { count } = await prisma.studioRun.updateMany({
    where: { id, status: { in: ['queued', 'running'] } },
    data: { status: 'running', error: null },
  });
  if (count === 0) return false;
  await prisma.studioRun.updateMany({
    where: { id, startedAt: null },
    data: { startedAt: new Date() },
  });
  return true;
}

export async function markRunSucceeded(id: string): Promise<void> {
  await prisma.studioRun.updateMany({
    where: { id, status: 'running' },
    data: { status: 'succeeded', finishedAt: new Date() },
  });
}

export async function markRunFailed(id: string, error: string): Promise<void> {
  await prisma.studioRun.updateMany({
    where: { id, status: { in: ['queued', 'running'] } },
    data: { status: 'failed', error, finishedAt: new Date() },
  });
}

/** Remembers an attempt's error while pg-boss retries; the run stays running. */
export async function recordRunError(id: string, error: string): Promise<void> {
  await prisma.studioRun.updateMany({
    where: { id, status: 'running' },
    data: { error },
  });
}

export async function cancelRun(id: string): Promise<boolean> {
  const { count } = await prisma.studioRun.updateMany({
    where: { id, status: { in: ['queued', 'running'] } },
    data: { status: 'cancelled', finishedAt: new Date() },
  });
  return count === 1;
}

export async function addRunUsage(
  id: string,
  usage: { inputTokens: number; outputTokens: number }
): Promise<void> {
  const run = await prisma.studioRun.update({
    where: { id },
    data: {
      tokensIn: { increment: usage.inputTokens },
      tokensOut: { increment: usage.outputTokens },
    },
    select: { tokensIn: true, tokensOut: true, tokenCeiling: true },
  });
  const used = run.tokensIn + run.tokensOut;
  if (run.tokenCeiling !== null && used > run.tokenCeiling) {
    throw new TokenCeilingExceededError(id, used, run.tokenCeiling);
  }
}

/**
 * Executes one resumable step. A step that already succeeded returns its stored
 * output without running `fn` again, so a retried job resumes where it failed.
 */
export async function runStep<T extends Prisma.InputJsonValue>(
  runId: string,
  step: { key: string; ordinal: number },
  fn: () => Promise<T>
): Promise<T> {
  const where = { runId_key: { runId, key: step.key } };
  const existing = await prisma.studioRunStep.findUnique({ where });
  if (existing?.status === 'succeeded') return existing.output as T;

  await prisma.studioRunStep.upsert({
    where,
    create: {
      runId,
      key: step.key,
      ordinal: step.ordinal,
      status: 'running',
      attempts: 1,
      startedAt: new Date(),
    },
    update: {
      status: 'running',
      error: null,
      attempts: { increment: 1 },
      startedAt: new Date(),
      finishedAt: null,
    },
  });

  try {
    const output = await fn();
    await prisma.studioRunStep.update({
      where,
      data: { status: 'succeeded', output, finishedAt: new Date() },
    });
    return output;
  } catch (error) {
    await prisma.studioRunStep.update({
      where,
      data: {
        status: 'failed',
        error: errorMessage(error),
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}
```

- [ ] **Step 8: Run the DB test to verify it passes**

Run: `DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" ADMIN_TEST_DB=1 yarn vitest run --project db src/generator/runs/runs-repository.db.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 9: Type-check and lint**

Run: `yarn type-check && yarn lint`
Expected: PASS.

- [ ] **Step 10: Leave changes uncommitted**

---

### Task 4: The AI layer

**Files:**

- Create: `src/ai/models.ts`
- Create: `src/ai/generate.ts`
- Test: `src/ai/models.test.ts`, `src/ai/generate.test.ts`

**Interfaces:**

- Produces (`models.ts`):
  - `AI_TASKS = ['outline', 'write', 'repair', 'digest', 'translate', 'finish', 'agent'] as const`, `type AiTask`
  - `EMBEDDING_DIMENSIONS = 1536`
  - `type ModelSpec = { provider: 'openai'; modelId: string }`
  - `parseModelSpec(spec: string): ModelSpec`
  - `modelSpecForTask(task: AiTask, env?): ModelSpec` — env `STUDIO_MODEL_<TASK>` (e.g. `STUDIO_MODEL_WRITE=openai:<id>`) overrides the default
  - `embeddingSpec(env?): ModelSpec` — env `STUDIO_MODEL_EMBED`
  - `languageModelForTask(task, env?): LanguageModel`, `embeddingModel(env?): EmbeddingModel`
- Produces (`generate.ts`):
  - `type TokenUsage = { inputTokens: number; outputTokens: number }`, `type UsageSink = (usage: TokenUsage) => Promise<void> | void`
  - `generateStructured<T>(task, { schema: ZodType<T>; schemaName: string; instructions: string; prompt: string }, options?: { onUsage?; signal?; model? }): Promise<T>`
  - `generatePlainText(task, { instructions: string; prompt: string }, options?): Promise<string>`
  - `embedTexts(values: string[], options?: { onUsage?; signal?; model? }): Promise<number[][]>`

- [ ] **Step 1: Write the failing model-config test**

Create `src/ai/models.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  embeddingSpec,
  languageModelForTask,
  modelSpecForTask,
  parseModelSpec,
} from './models';

describe('parseModelSpec', () => {
  it('splits provider and model id', () => {
    expect(parseModelSpec('openai:gpt-4o-mini')).toEqual({
      provider: 'openai',
      modelId: 'gpt-4o-mini',
    });
  });

  it('keeps colons that belong to the model id', () => {
    expect(parseModelSpec('openai:ft:gpt-4o-mini:org:abc').modelId).toBe(
      'ft:gpt-4o-mini:org:abc'
    );
  });

  it.each(['gpt-4o', ':gpt-4o', 'openai:'])('rejects "%s"', (spec) => {
    expect(() => parseModelSpec(spec)).toThrow('Invalid model spec');
  });

  it('rejects providers without an implementation', () => {
    expect(() => parseModelSpec('mistral:large')).toThrow(
      'Unsupported AI provider'
    );
  });
});

describe('modelSpecForTask', () => {
  it('uses the per-task env override', () => {
    expect(
      modelSpecForTask('write', { STUDIO_MODEL_WRITE: 'openai:custom-model' })
        .modelId
    ).toBe('custom-model');
  });

  it('defaults translate to the small model', () => {
    expect(modelSpecForTask('translate', {}).modelId).toBe('gpt-4o-mini');
  });

  it('defaults embeddings to text-embedding-3-small', () => {
    expect(embeddingSpec({}).modelId).toBe('text-embedding-3-small');
  });
});

describe('languageModelForTask', () => {
  it('requires OPENAI_API_KEY', () => {
    expect(() => languageModelForTask('write', {})).toThrow(
      'OPENAI_API_KEY is not set'
    );
  });

  it('builds a model for the configured id', () => {
    const model = languageModelForTask('write', {
      OPENAI_API_KEY: 'sk-test',
      STUDIO_MODEL_WRITE: 'openai:my-model',
    });
    expect(typeof model === 'object' && model.modelId).toBe('my-model');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run --project unit src/ai/models.test.ts`
Expected: FAIL — cannot resolve `./models`.

- [ ] **Step 3: Implement** `models.ts`

Create `src/ai/models.ts`:

```ts
import { createOpenAI } from '@ai-sdk/openai';
import type { EmbeddingModel, LanguageModel } from 'ai';

export const AI_TASKS = [
  'outline',
  'write',
  'repair',
  'digest',
  'translate',
  'finish',
  'agent',
] as const;
export type AiTask = (typeof AI_TASKS)[number];

/**
 * Defaults only. Production sets STUDIO_MODEL_<TASK> to the current model ids
 * from the OpenAI dashboard; these exist so local runs work without config.
 */
const STRONG_DEFAULT = 'openai:gpt-4o';
const SMALL_DEFAULT = 'openai:gpt-4o-mini';
const EMBEDDING_DEFAULT = 'openai:text-embedding-3-small';

/** Must match the vector(1536) columns added in P1b. */
export const EMBEDDING_DIMENSIONS = 1536;

const TASK_DEFAULTS: Record<AiTask, string> = {
  outline: STRONG_DEFAULT,
  write: STRONG_DEFAULT,
  repair: STRONG_DEFAULT,
  agent: STRONG_DEFAULT,
  digest: SMALL_DEFAULT,
  translate: SMALL_DEFAULT,
  finish: SMALL_DEFAULT,
};

const PROVIDERS = ['openai'] as const;
type Provider = (typeof PROVIDERS)[number];

export type ModelSpec = { provider: Provider; modelId: string };
type Env = Record<string, string | undefined>;

export function parseModelSpec(spec: string): ModelSpec {
  const separator = spec.indexOf(':');
  const provider = spec.slice(0, separator);
  const modelId = spec.slice(separator + 1);
  if (separator < 1 || !modelId) {
    throw new Error(
      `Invalid model spec "${spec}". Use "<provider>:<model-id>".`
    );
  }
  if (!(PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error(`Unsupported AI provider "${provider}" in "${spec}".`);
  }
  return { provider: provider as Provider, modelId };
}

export function modelSpecForTask(
  task: AiTask,
  env: Env = process.env
): ModelSpec {
  return parseModelSpec(
    env[`STUDIO_MODEL_${task.toUpperCase()}`] ?? TASK_DEFAULTS[task]
  );
}

export function embeddingSpec(env: Env = process.env): ModelSpec {
  return parseModelSpec(env.STUDIO_MODEL_EMBED ?? EMBEDDING_DEFAULT);
}

function openaiProvider(env: Env) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  return createOpenAI({ apiKey });
}

export function languageModelForTask(
  task: AiTask,
  env: Env = process.env
): LanguageModel {
  return openaiProvider(env)(modelSpecForTask(task, env).modelId);
}

export function embeddingModel(env: Env = process.env): EmbeddingModel {
  return openaiProvider(env).embedding(embeddingSpec(env).modelId);
}
```

- [ ] **Step 4: Run the model-config test**

Run: `yarn vitest run --project unit src/ai/models.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing generation test**

Create `src/ai/generate.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { MockEmbeddingModelV4, MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';
import { embedTexts, generatePlainText, generateStructured } from './generate';
import { EMBEDDING_DIMENSIONS } from './models';

function textModel(text: string) {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: {
        inputTokens: { total: 12, noCache: 12, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 5, reasoning: 0 },
      },
      warnings: [],
    },
  });
}

const outlineSchema = z.object({
  title: z.string(),
  sections: z.array(z.string()),
});

describe('generateStructured', () => {
  it('returns the parsed object and reports usage', async () => {
    const onUsage = vi.fn();
    const result = await generateStructured(
      'outline',
      {
        schema: outlineSchema,
        schemaName: 'outline',
        instructions: 'Plan the article.',
        prompt: 'Sources…',
      },
      {
        model: textModel(JSON.stringify({ title: 'T', sections: ['a', 'b'] })),
        onUsage,
      }
    );
    expect(result).toEqual({ title: 'T', sections: ['a', 'b'] });
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 12, outputTokens: 5 });
  });

  it('rejects output that does not match the schema', async () => {
    await expect(
      generateStructured(
        'outline',
        {
          schema: outlineSchema,
          schemaName: 'outline',
          instructions: 'Plan.',
          prompt: 'x',
        },
        { model: textModel(JSON.stringify({ title: 1 })) }
      )
    ).rejects.toThrow();
  });

  it('sends the instructions and the prompt to the model', async () => {
    const model = textModel(JSON.stringify({ title: 'T', sections: [] }));
    await generateStructured(
      'outline',
      {
        schema: outlineSchema,
        schemaName: 'outline',
        instructions: 'SYSTEM RULES',
        prompt: 'USER MATERIAL',
      },
      { model }
    );
    const sent = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(sent).toContain('SYSTEM RULES');
    expect(sent).toContain('USER MATERIAL');
  });
});

describe('generatePlainText', () => {
  it('returns the text and reports usage', async () => {
    const onUsage = vi.fn();
    const text = await generatePlainText(
      'translate',
      { instructions: 'Translate to English.', prompt: 'こんにちは' },
      { model: textModel('Hello'), onUsage }
    );
    expect(text).toBe('Hello');
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 12, outputTokens: 5 });
  });
});

describe('embedTexts', () => {
  const vector = (n: number) =>
    Array.from({ length: EMBEDDING_DIMENSIONS }, () => n);

  it('returns one vector per value and reports tokens as input', async () => {
    const onUsage = vi.fn();
    const model = new MockEmbeddingModelV4({
      maxEmbeddingsPerCall: 100,
      doEmbed: {
        embeddings: [vector(0.1), vector(0.2)],
        usage: { tokens: 7 },
        warnings: [],
      },
    });
    const vectors = await embedTexts(['a', 'b'], { model, onUsage });
    expect(vectors).toHaveLength(2);
    expect(vectors[1][0]).toBe(0.2);
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 7, outputTokens: 0 });
  });

  it('rejects vectors of the wrong size', async () => {
    const model = new MockEmbeddingModelV4({
      doEmbed: { embeddings: [[1, 2, 3]], usage: { tokens: 1 }, warnings: [] },
    });
    await expect(embedTexts(['a'], { model })).rejects.toThrow(
      `expected ${EMBEDDING_DIMENSIONS}`
    );
  });

  it('returns [] without calling the model for no input', async () => {
    const model = new MockEmbeddingModelV4();
    expect(await embedTexts([], { model })).toEqual([]);
    expect(model.doEmbedCalls).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `yarn vitest run --project unit src/ai/generate.test.ts`
Expected: FAIL — cannot resolve `./generate`.

- [ ] **Step 7: Implement** `generate.ts`

Create `src/ai/generate.ts`:

```ts
import {
  embedMany,
  generateText,
  Output,
  type EmbeddingModel,
  type LanguageModel,
  type LanguageModelUsage,
} from 'ai';
import type { ZodType } from 'zod';
import {
  EMBEDDING_DIMENSIONS,
  embeddingModel,
  languageModelForTask,
  type AiTask,
} from './models';

export type TokenUsage = { inputTokens: number; outputTokens: number };
export type UsageSink = (usage: TokenUsage) => Promise<void> | void;

export type AiCallOptions = {
  onUsage?: UsageSink;
  signal?: AbortSignal;
  /** Tests inject a mock model; production resolves it from the task. */
  model?: LanguageModel;
};

export type EmbedOptions = {
  onUsage?: UsageSink;
  signal?: AbortSignal;
  model?: EmbeddingModel;
};

const MAX_RETRIES = 2;
const TIMEOUT_MS = 120_000;

async function reportUsage(
  sink: UsageSink | undefined,
  usage: LanguageModelUsage
): Promise<void> {
  if (!sink) return;
  await sink({
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  });
}

/** One structured call. Prompts are never logged: they carry source text. */
export async function generateStructured<T>(
  task: AiTask,
  request: {
    schema: ZodType<T>;
    schemaName: string;
    instructions: string;
    prompt: string;
  },
  options: AiCallOptions = {}
): Promise<T> {
  const result = await generateText({
    model: options.model ?? languageModelForTask(task),
    instructions: request.instructions,
    prompt: request.prompt,
    output: Output.object({ schema: request.schema, name: request.schemaName }),
    maxRetries: MAX_RETRIES,
    timeout: TIMEOUT_MS,
    abortSignal: options.signal,
  });
  await reportUsage(options.onUsage, result.totalUsage);
  return result.output as T;
}

export async function generatePlainText(
  task: AiTask,
  request: { instructions: string; prompt: string },
  options: AiCallOptions = {}
): Promise<string> {
  const result = await generateText({
    model: options.model ?? languageModelForTask(task),
    instructions: request.instructions,
    prompt: request.prompt,
    maxRetries: MAX_RETRIES,
    timeout: TIMEOUT_MS,
    abortSignal: options.signal,
  });
  await reportUsage(options.onUsage, result.totalUsage);
  return result.text;
}

export async function embedTexts(
  values: string[],
  options: EmbedOptions = {}
): Promise<number[][]> {
  if (values.length === 0) return [];
  const result = await embedMany({
    model: options.model ?? embeddingModel(),
    values,
    maxRetries: MAX_RETRIES,
    abortSignal: options.signal,
  });
  for (const embedding of result.embeddings) {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding has ${embedding.length} dimensions, expected ${EMBEDDING_DIMENSIONS}`
      );
    }
  }
  if (options.onUsage) {
    await options.onUsage({
      inputTokens: result.usage.tokens,
      outputTokens: 0,
    });
  }
  return result.embeddings;
}
```

- [ ] **Step 8: Run the AI tests**

Run: `yarn vitest run --project unit src/ai`
Expected: PASS. If `result.output` / `result.totalUsage` / `instructions` differ in the installed `ai` version, read `node_modules/ai/dist/index.d.ts` and adjust the call — do not change the exported signatures.

- [ ] **Step 9: Type-check and lint**

Run: `yarn type-check && yarn lint`
Expected: PASS.

- [ ] **Step 10: Leave changes uncommitted**

---

### Task 5: Queues and transactional enqueue

**Files:**

- Create: `src/generator/queue/queues.ts`
- Create: `src/generator/queue/job-data.ts`
- Create: `src/generator/queue/enqueue.ts`
- Create: `src/lib/studio/web-boss.ts`
- Test: `src/generator/queue/queues.test.ts`

**Interfaces:**

- Consumes: `RunKind`, `RUN_KINDS` (Task 3), `createRun`, `CreateRunInput` (Task 3).
- Produces:
  - `DEAD_LETTER_QUEUE = 'studio.dead'`, `queueForKind(kind: RunKind): string` → `'studio.run.<kind>'`
  - `RUN_QUEUE_SETTINGS: Omit<Queue, 'name'>` (policy `singleton`, `retryLimit: 2`, `retryDelay: 5`, `retryBackoff: true`, `expireInSeconds: 900`, `heartbeatSeconds: 60`, `deadLetter: 'studio.dead'`)
  - `WORKER_CONCURRENCY: Record<RunKind, number>`
  - `ensureQueues(boss: PgBoss, kinds: readonly RunKind[], settings?: Omit<Queue, 'name'>): Promise<void>` — creates missing queues only
  - `runJobDataSchema` (Zod) and `type RunJobData = { runId: string }`
  - `createAndEnqueueRun(boss: PgBoss, input: CreateRunInput): Promise<StudioRun>`
  - `getWebBoss(): Promise<PgBoss>` (web only, `server-only`; own 1-connection pool for pg-boss's startup check and queue cache — the job insert itself runs in the caller's Prisma transaction)

- [ ] **Step 1: Write the failing test**

Create `src/generator/queue/queues.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { PgBoss } from 'pg-boss';
import {
  DEAD_LETTER_QUEUE,
  ensureQueues,
  queueForKind,
  RUN_QUEUE_SETTINGS,
} from './queues';
import { runJobDataSchema } from './job-data';

function fakeBoss(existing: string[]) {
  return {
    getQueue: vi.fn(async (name: string) =>
      existing.includes(name) ? { name } : null
    ),
    createQueue: vi.fn<(name: string, options?: unknown) => Promise<void>>(
      async () => undefined
    ),
  };
}

describe('studio queues', () => {
  it('names one queue per run kind', () => {
    expect(queueForKind('system_check')).toBe('studio.run.system_check');
  });

  it('dead-letters run jobs and enforces heartbeats', () => {
    expect(RUN_QUEUE_SETTINGS.deadLetter).toBe(DEAD_LETTER_QUEUE);
    expect(RUN_QUEUE_SETTINGS.heartbeatSeconds).toBeGreaterThanOrEqual(10);
    expect(RUN_QUEUE_SETTINGS.policy).toBe('singleton');
  });

  it('creates the dead-letter queue first, then missing run queues', async () => {
    const boss = fakeBoss([]);
    await ensureQueues(boss as unknown as PgBoss, ['system_check']);
    expect(boss.createQueue.mock.calls.map((c) => c[0])).toEqual([
      DEAD_LETTER_QUEUE,
      'studio.run.system_check',
    ]);
    expect(boss.createQueue.mock.calls[1][1]).toEqual(RUN_QUEUE_SETTINGS);
  });

  it('leaves existing queues alone', async () => {
    const boss = fakeBoss([DEAD_LETTER_QUEUE, 'studio.run.system_check']);
    await ensureQueues(boss as unknown as PgBoss, ['system_check']);
    expect(boss.createQueue).not.toHaveBeenCalled();
  });

  it('accepts only a uuid runId as job data', () => {
    expect(
      runJobDataSchema.safeParse({
        runId: '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e',
      }).success
    ).toBe(true);
    expect(runJobDataSchema.safeParse({ runId: 'nope' }).success).toBe(false);
    expect(runJobDataSchema.safeParse({}).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run --project unit src/generator/queue/queues.test.ts`
Expected: FAIL — cannot resolve `./queues`.

- [ ] **Step 3: Implement queues and job data**

Create `src/generator/queue/job-data.ts`:

```ts
import { z } from 'zod';

/** Everything else a job needs is read from its studio_runs row. */
export const runJobDataSchema = z.object({ runId: z.uuid() });
export type RunJobData = z.infer<typeof runJobDataSchema>;
```

Create `src/generator/queue/queues.ts`:

```ts
import type { PgBoss, Queue } from 'pg-boss';
import type { RunKind } from '../runs/run-types';

export const DEAD_LETTER_QUEUE = 'studio.dead';

export function queueForKind(kind: RunKind): string {
  return `studio.run.${kind}`;
}

export type QueueSettings = Omit<Queue, 'name'>;

/**
 * singleton + singletonKey (piece or source id) = one active job per piece.
 * A job that stops heartbeating or outlives expireInSeconds is retried, then
 * dead-lettered; the dead-letter handler marks its run failed.
 */
export const RUN_QUEUE_SETTINGS: QueueSettings = {
  policy: 'singleton',
  retryLimit: 2,
  retryDelay: 5,
  retryBackoff: true,
  expireInSeconds: 900,
  heartbeatSeconds: 60,
  deadLetter: DEAD_LETTER_QUEUE,
};

/** Jobs of each kind processed at once by one worker instance. */
export const WORKER_CONCURRENCY: Record<RunKind, number> = {
  system_check: 1,
};

/** Creates missing queues. Changing settings of an existing queue is a manual migration. */
export async function ensureQueues(
  boss: PgBoss,
  kinds: readonly RunKind[],
  settings: QueueSettings = RUN_QUEUE_SETTINGS
): Promise<void> {
  if (!(await boss.getQueue(DEAD_LETTER_QUEUE))) {
    await boss.createQueue(DEAD_LETTER_QUEUE, { retryLimit: 0 });
  }
  for (const kind of kinds) {
    const name = queueForKind(kind);
    if (!(await boss.getQueue(name))) await boss.createQueue(name, settings);
  }
}
```

- [ ] **Step 4: Run the queue test**

Run: `yarn vitest run --project unit src/generator/queue/queues.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement transactional enqueue**

Create `src/generator/queue/enqueue.ts`:

```ts
import { fromPrisma, type PgBoss } from 'pg-boss';
import type { StudioRun } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createRun, type CreateRunInput } from '../runs/runs-repository';
import type { RunJobData } from './job-data';
import { queueForKind } from './queues';

/**
 * Creates the run row and its job in one transaction, so a run never exists
 * without a job (or a job without a run).
 */
export function createAndEnqueueRun(
  boss: PgBoss,
  input: CreateRunInput
): Promise<StudioRun> {
  return prisma.$transaction(async (tx) => {
    const run = await createRun(tx, input);
    const data: RunJobData = { runId: run.id };
    const jobId = await boss.send(queueForKind(input.kind), data, {
      singletonKey: input.pieceId ?? input.sourceId ?? run.id,
      db: fromPrisma(tx),
    });
    if (!jobId) throw new Error(`The queue refused the job for run ${run.id}`);
    return run;
  });
}
```

- [ ] **Step 6: Implement the web-side boss**

Create `src/lib/studio/web-boss.ts`:

```ts
import 'server-only';

import { PgBoss } from 'pg-boss';

const globalForBoss = globalThis as unknown as {
  studioWebBoss?: Promise<PgBoss>;
};

/**
 * The web app only sends jobs, and each send runs inside the caller's Prisma
 * transaction (`db: fromPrisma(tx)` in createAndEnqueueRun). This instance's
 * own pool (one connection, closed when idle) only serves pg-boss's startup
 * check and its queue cache: Prisma's raw queries cannot return the regclass
 * and bigint columns those read. It never installs or migrates the pg-boss
 * schema (the worker does) and runs no maintenance or cron.
 */
export function getWebBoss(): Promise<PgBoss> {
  globalForBoss.studioWebBoss ??= startWebBoss().catch((error) => {
    globalForBoss.studioWebBoss = undefined;
    throw error;
  });
  return globalForBoss.studioWebBoss;
}

async function startWebBoss(): Promise<PgBoss> {
  const boss = new PgBoss({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    max: 1,
    application_name: 'cosbe-web-studio',
    supervise: false,
    schedule: false,
    migrate: false,
    createSchema: false,
  });
  boss.on('error', (error) => console.error('[studio web boss]', error));
  await boss.start();
  return boss;
}
```

- [ ] **Step 7: Type-check and lint**

Run: `yarn type-check && yarn lint`
Expected: PASS. (Enqueue is exercised end to end by the DB test in Task 6.)

- [ ] **Step 8: Leave changes uncommitted**

---

### Task 6: Run handler, worker authorization and the system-check executor

**Files:**

- Create: `src/generator/authz.ts`
- Create: `src/generator/runs/run-handler.ts`
- Create: `src/generator/executors/system-check.ts`
- Create: `src/generator/executors/index.ts`
- Test: `src/generator/authz.test.ts`, `src/generator/runs/run-handler.test.ts`, `src/generator/executors/system-check.test.ts`, `src/generator/queue/queue.db.test.ts`

**Interfaces:**

- Consumes: Task 3 repository + types, Task 4 `TokenUsage`, Task 5 queues/enqueue/job data.
- Produces:
  - `actorHasPermission(userId: string | null, permission: Permission): Promise<boolean>`
  - `type RunContext = { run: RunWithSteps; signal: AbortSignal; step<T extends Prisma.InputJsonValue>(key: string, ordinal: number, fn: () => Promise<T>): Promise<T>; recordUsage(usage: TokenUsage): Promise<void> }`
  - `type RunExecutor = (ctx: RunContext) => Promise<void>`, `type RunExecutors = Partial<Record<RunKind, RunExecutor>>`
  - `handleRunJob(job: Job<unknown>, executors: RunExecutors): Promise<void>`
  - `createRunHandler(executors): (jobs: Job<unknown>[]) => Promise<void>`
  - `createDeadLetterHandler(): (jobs: Job<unknown>[]) => Promise<void>`
  - `systemCheckExecutor: RunExecutor` — step `ping` outputs `{ worker: string; databaseTime: string; queuedMs: number }`
  - `RUN_EXECUTORS: RunExecutors`

- [ ] **Step 1: Write the failing authz test**

Create `src/generator/authz.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/admin-users-repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin-users-repository')>()),
  findAdminUserWithRoles: vi.fn(),
}));

import { findAdminUserWithRoles } from '@/lib/admin-users-repository';
import { actorHasPermission } from './authz';

function user(
  roleKey: string,
  permissions: string[],
  { disabled = false }: { disabled?: boolean } = {}
) {
  return {
    id: 'u1',
    disabled,
    roles: [
      {
        role: {
          id: 'r1',
          key: roleKey,
          isSystem: roleKey === 'super-admin',
          permissions: permissions.map((permission) => ({ permission })),
        },
      },
    ],
  } as never;
}

describe('actorHasPermission', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is false without a user id', async () => {
    expect(await actorHasPermission(null, 'studio.use')).toBe(false);
    expect(findAdminUserWithRoles).not.toHaveBeenCalled();
  });

  it('is false for an unknown user', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(null);
    expect(await actorHasPermission('u1', 'studio.use')).toBe(false);
  });

  it('is false for a disabled user who holds the permission', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      user('marketing', ['studio.use'], { disabled: true })
    );
    expect(await actorHasPermission('u1', 'studio.use')).toBe(false);
  });

  it('is true when a role grants the permission', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      user('marketing', ['studio.use'])
    );
    expect(await actorHasPermission('u1', 'studio.use')).toBe(true);
  });

  it('is false when no role grants it', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      user('marketing', ['articles.edit'])
    );
    expect(await actorHasPermission('u1', 'studio.use')).toBe(false);
  });

  it('is true for super-admin', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      user('super-admin', [])
    );
    expect(await actorHasPermission('u1', 'studio.sources.delete')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn vitest run --project unit src/generator/authz.test.ts`
Expected: FAIL — cannot resolve `./authz`.

- [ ] **Step 3: Implement** `authz.ts`

Create `src/generator/authz.ts`:

```ts
import { findAdminUserWithRoles, rolesOf } from '@/lib/admin-users-repository';
import { resolvePermissions, type Permission } from '@/lib/permissions';

/**
 * The worker has no session. It re-checks the run creator's current
 * permissions from the database before doing any work.
 */
export async function actorHasPermission(
  userId: string | null,
  permission: Permission
): Promise<boolean> {
  if (!userId) return false;
  const user = await findAdminUserWithRoles(userId);
  if (!user || user.disabled) return false;
  return resolvePermissions(rolesOf(user)).permissions.has(permission);
}
```

Run: `yarn vitest run --project unit src/generator/authz.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing run-handler test**

Create `src/generator/runs/run-handler.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from 'pg-boss';

vi.mock('./runs-repository', () => ({
  getRun: vi.fn(),
  markRunStarted: vi.fn(),
  markRunSucceeded: vi.fn(),
  markRunFailed: vi.fn(),
  recordRunError: vi.fn(),
  runStep: vi.fn(),
  addRunUsage: vi.fn(),
  TokenCeilingExceededError: class TokenCeilingExceededError extends Error {},
}));
vi.mock('../authz', () => ({ actorHasPermission: vi.fn() }));

import { actorHasPermission } from '../authz';
import {
  addRunUsage,
  getRun,
  markRunFailed,
  markRunStarted,
  markRunSucceeded,
  recordRunError,
  runStep,
  TokenCeilingExceededError,
  type RunWithSteps,
} from './runs-repository';
import {
  createDeadLetterHandler,
  handleRunJob,
  type RunExecutor,
} from './run-handler';
import { NonRetryableRunError } from './run-types';

const RUN_ID = '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';

function job(data: unknown = { runId: RUN_ID }): Job<unknown> {
  return {
    id: 'job-1',
    name: 'studio.run.system_check',
    data,
    expireInSeconds: 900,
    heartbeatSeconds: 60,
    signal: new AbortController().signal,
  };
}

function run(overrides: Partial<RunWithSteps> = {}): RunWithSteps {
  return {
    id: RUN_ID,
    kind: 'system_check',
    status: 'queued',
    createdById: 'u1',
    error: null,
    createdAt: new Date(),
    steps: [],
    ...overrides,
  } as RunWithSteps;
}

describe('handleRunJob', () => {
  const executor = vi.fn<RunExecutor>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRun).mockResolvedValue(run());
    vi.mocked(actorHasPermission).mockResolvedValue(true);
    vi.mocked(markRunStarted).mockResolvedValue(true);
    executor.mockResolvedValue(undefined);
  });

  it('rejects malformed job data', async () => {
    await expect(
      handleRunJob(job({ nope: 1 }), { system_check: executor })
    ).rejects.toThrow();
  });

  it('does nothing when the run no longer exists', async () => {
    vi.mocked(getRun).mockResolvedValue(null);
    await handleRunJob(job(), { system_check: executor });
    expect(executor).not.toHaveBeenCalled();
    expect(markRunFailed).not.toHaveBeenCalled();
  });

  it('does nothing for a run that already ended', async () => {
    vi.mocked(getRun).mockResolvedValue(run({ status: 'cancelled' }));
    await handleRunJob(job(), { system_check: executor });
    expect(executor).not.toHaveBeenCalled();
  });

  it('fails runs of an unknown kind without retrying', async () => {
    vi.mocked(getRun).mockResolvedValue(run({ kind: 'mystery' }));
    await handleRunJob(job(), { system_check: executor });
    expect(markRunFailed).toHaveBeenCalledWith(
      RUN_ID,
      'Unknown run kind "mystery"'
    );
  });

  it('fails runs with no registered executor', async () => {
    await handleRunJob(job(), {});
    expect(markRunFailed).toHaveBeenCalledWith(
      RUN_ID,
      'No executor registered for "system_check"'
    );
  });

  it('fails the run as FORBIDDEN when the creator lost the permission', async () => {
    vi.mocked(actorHasPermission).mockResolvedValue(false);
    await handleRunJob(job(), { system_check: executor });
    expect(actorHasPermission).toHaveBeenCalledWith('u1', 'studio.use');
    expect(markRunFailed).toHaveBeenCalledWith(RUN_ID, 'FORBIDDEN');
    expect(executor).not.toHaveBeenCalled();
  });

  it('skips a run cancelled before it started', async () => {
    vi.mocked(markRunStarted).mockResolvedValue(false);
    await handleRunJob(job(), { system_check: executor });
    expect(executor).not.toHaveBeenCalled();
    expect(markRunSucceeded).not.toHaveBeenCalled();
  });

  it('runs the executor and marks the run succeeded', async () => {
    await handleRunJob(job(), { system_check: executor });
    expect(executor).toHaveBeenCalledTimes(1);
    expect(markRunSucceeded).toHaveBeenCalledWith(RUN_ID);
  });

  it('gives the executor step and usage helpers bound to the run', async () => {
    vi.mocked(runStep).mockResolvedValue({ ok: true });
    executor.mockImplementation(async (ctx) => {
      await ctx.step('ping', 0, async () => ({ ok: true }));
      await ctx.recordUsage({ inputTokens: 3, outputTokens: 4 });
    });
    await handleRunJob(job(), { system_check: executor });
    expect(runStep).toHaveBeenCalledWith(
      RUN_ID,
      { key: 'ping', ordinal: 0 },
      expect.any(Function)
    );
    expect(addRunUsage).toHaveBeenCalledWith(RUN_ID, {
      inputTokens: 3,
      outputTokens: 4,
    });
  });

  it('fails without retry on NonRetryableRunError', async () => {
    executor.mockRejectedValue(new NonRetryableRunError('bad input'));
    await handleRunJob(job(), { system_check: executor });
    expect(markRunFailed).toHaveBeenCalledWith(RUN_ID, 'bad input');
  });

  it('fails without retry when the token ceiling is exceeded', async () => {
    const error = new TokenCeilingExceededError(RUN_ID, 120, 100);
    executor.mockRejectedValue(error);
    await handleRunJob(job(), { system_check: executor });
    expect(markRunFailed).toHaveBeenCalledWith(RUN_ID, error.message);
  });

  it('records other errors and rethrows so pg-boss retries', async () => {
    executor.mockRejectedValue(new Error('provider timeout'));
    await expect(
      handleRunJob(job(), { system_check: executor })
    ).rejects.toThrow('provider timeout');
    expect(recordRunError).toHaveBeenCalledWith(RUN_ID, 'provider timeout');
    expect(markRunFailed).not.toHaveBeenCalled();
  });
});

describe('createDeadLetterHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fails the run with the last recorded error', async () => {
    vi.mocked(getRun).mockResolvedValue(run({ error: 'provider timeout' }));
    await createDeadLetterHandler()([job()]);
    expect(markRunFailed).toHaveBeenCalledWith(RUN_ID, 'provider timeout');
  });

  it('uses a generic message when nothing was recorded', async () => {
    vi.mocked(getRun).mockResolvedValue(run());
    await createDeadLetterHandler()([job()]);
    expect(markRunFailed).toHaveBeenCalledWith(
      RUN_ID,
      'The job failed after all retries.'
    );
  });

  it('ignores dead jobs without a run id', async () => {
    await createDeadLetterHandler()([job({})]);
    expect(markRunFailed).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `yarn vitest run --project unit src/generator/runs/run-handler.test.ts`
Expected: FAIL — cannot resolve `./run-handler`.

- [ ] **Step 6: Implement the run handler**

Create `src/generator/runs/run-handler.ts`:

```ts
import type { Prisma } from '@prisma/client';
import type { Job } from 'pg-boss';
import type { TokenUsage } from '@/ai/generate';
import { actorHasPermission } from '../authz';
import { runJobDataSchema } from '../queue/job-data';
import {
  addRunUsage,
  getRun,
  markRunFailed,
  markRunStarted,
  markRunSucceeded,
  recordRunError,
  runStep,
  TokenCeilingExceededError,
  type RunWithSteps,
} from './runs-repository';
import {
  errorMessage,
  isRunKind,
  isTerminalRunStatus,
  NonRetryableRunError,
  RUN_KIND_PERMISSION,
  type RunKind,
} from './run-types';

export type RunContext = {
  run: RunWithSteps;
  signal: AbortSignal;
  step<T extends Prisma.InputJsonValue>(
    key: string,
    ordinal: number,
    fn: () => Promise<T>
  ): Promise<T>;
  recordUsage(usage: TokenUsage): Promise<void>;
};

export type RunExecutor = (ctx: RunContext) => Promise<void>;
export type RunExecutors = Partial<Record<RunKind, RunExecutor>>;

/**
 * One job = one run. Returning completes the job; throwing makes pg-boss retry
 * it (and dead-letter it after the last retry).
 */
export async function handleRunJob(
  job: Job<unknown>,
  executors: RunExecutors
): Promise<void> {
  const { runId } = runJobDataSchema.parse(job.data);
  const run = await getRun(runId);
  if (!run || isTerminalRunStatus(run.status)) return;

  if (!isRunKind(run.kind)) {
    await markRunFailed(runId, `Unknown run kind "${run.kind}"`);
    return;
  }
  const executor = executors[run.kind];
  if (!executor) {
    await markRunFailed(runId, `No executor registered for "${run.kind}"`);
    return;
  }
  if (
    !(await actorHasPermission(run.createdById, RUN_KIND_PERMISSION[run.kind]))
  ) {
    await markRunFailed(runId, 'FORBIDDEN');
    return;
  }
  if (!(await markRunStarted(runId))) return;

  try {
    await executor({
      run,
      signal: job.signal,
      step: (key, ordinal, fn) => runStep(runId, { key, ordinal }, fn),
      recordUsage: (usage) => addRunUsage(runId, usage),
    });
    await markRunSucceeded(runId);
  } catch (error) {
    if (
      error instanceof NonRetryableRunError ||
      error instanceof TokenCeilingExceededError
    ) {
      await markRunFailed(runId, errorMessage(error));
      return;
    }
    await recordRunError(runId, errorMessage(error));
    throw error;
  }
}

export function createRunHandler(executors: RunExecutors) {
  return async (jobs: Job<unknown>[]): Promise<void> => {
    for (const job of jobs) await handleRunJob(job, executors);
  };
}

/** Jobs land here after their last retry (or after expiring / missing heartbeats). */
export function createDeadLetterHandler() {
  return async (jobs: Job<unknown>[]): Promise<void> => {
    for (const job of jobs) {
      const parsed = runJobDataSchema.safeParse(job.data);
      if (!parsed.success) continue;
      const run = await getRun(parsed.data.runId);
      await markRunFailed(
        parsed.data.runId,
        run?.error ?? 'The job failed after all retries.'
      );
    }
  };
}
```

Run: `yarn vitest run --project unit src/generator/runs/run-handler.test.ts`
Expected: PASS.

- [ ] **Step 7: Write the failing executor test**

Create `src/generator/executors/system-check.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(async () => [{ now: new Date('2026-09-22T00:00:05Z') }]),
  },
}));

import type { RunContext } from '../runs/run-handler';
import { systemCheckExecutor } from './system-check';

describe('systemCheckExecutor', () => {
  it('records worker, database time and queue latency in the ping step', async () => {
    const outputs: unknown[] = [];
    const ctx = {
      run: { createdAt: new Date(Date.now() - 1500) },
      signal: new AbortController().signal,
      step: vi.fn(async (_key, _ordinal, fn) => {
        const out = await fn();
        outputs.push(out);
        return out;
      }),
      recordUsage: vi.fn(),
    } as unknown as RunContext;

    await systemCheckExecutor(ctx);

    expect(ctx.step).toHaveBeenCalledWith('ping', 0, expect.any(Function));
    const out = outputs[0] as {
      worker: string;
      databaseTime: string;
      queuedMs: number;
    };
    expect(out.worker.length).toBeGreaterThan(0);
    expect(out.databaseTime).toBe('2026-09-22T00:00:05.000Z');
    expect(out.queuedMs).toBeGreaterThanOrEqual(1500);
  });
});
```

Run: `yarn vitest run --project unit src/generator/executors/system-check.test.ts`
Expected: FAIL — cannot resolve `./system-check`.

- [ ] **Step 8: Implement the executor and registry**

Create `src/generator/executors/system-check.ts`:

```ts
import { hostname } from 'node:os';
import { prisma } from '@/lib/prisma';
import type { RunExecutor } from '../runs/run-handler';

/** Proves the worker is alive, reachable through the queue and can query the DB. */
export const systemCheckExecutor: RunExecutor = async ({ run, step }) => {
  await step('ping', 0, async () => {
    const [{ now }] = await prisma.$queryRaw<Array<{ now: Date }>>`
      SELECT now() AS now`;
    return {
      worker: process.env.STUDIO_WORKER_ID ?? hostname(),
      databaseTime: now.toISOString(),
      queuedMs: Date.now() - run.createdAt.getTime(),
    };
  });
};
```

Create `src/generator/executors/index.ts`:

```ts
import type { RunExecutors } from '../runs/run-handler';
import { systemCheckExecutor } from './system-check';

/** Later plans register their executors here. */
export const RUN_EXECUTORS: RunExecutors = {
  system_check: systemCheckExecutor,
};
```

Run: `yarn vitest run --project unit src/generator`
Expected: PASS.

- [ ] **Step 9: Write the end-to-end queue DB test**

Create `src/generator/queue/queue.db.test.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgBoss } from 'pg-boss';
import { prisma } from '@/lib/prisma';
import { RUN_EXECUTORS } from '../executors';
import {
  createDeadLetterHandler,
  createRunHandler,
  type RunExecutors,
} from '../runs/run-handler';
import { getRun } from '../runs/runs-repository';
import { createAndEnqueueRun } from './enqueue';
import {
  DEAD_LETTER_QUEUE,
  ensureQueues,
  queueForKind,
  RUN_QUEUE_SETTINGS,
} from './queues';

const QUEUE = queueForKind('system_check');
const allowedId = randomUUID();
const deniedId = randomUUID();
const roleKey = `studio-e2e-${allowedId}`;

let workerBoss: PgBoss;
let webBoss: PgBoss;

async function waitForRun(id: string, statuses: string[], timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const run = await getRun(id);
    if (run && statuses.includes(run.status)) return run;
    if (Date.now() > deadline) {
      throw new Error(`Run ${id} is still ${run?.status ?? 'missing'}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

async function work(executors: RunExecutors) {
  await workerBoss.offWork(QUEUE, { wait: true });
  await workerBoss.work(
    QUEUE,
    { batchSize: 1, pollingIntervalSeconds: 0.5 },
    createRunHandler(executors)
  );
}

beforeAll(async () => {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  workerBoss = new PgBoss({ connectionString: url, max: 2 });
  workerBoss.on('error', (e) => console.error(e));
  await workerBoss.start();
  for (const name of [QUEUE, DEAD_LETTER_QUEUE]) {
    if (await workerBoss.getQueue(name)) await workerBoss.deleteQueue(name);
  }
  await ensureQueues(workerBoss, ['system_check'], {
    ...RUN_QUEUE_SETTINGS,
    retryLimit: 0,
    retryBackoff: false,
    retryDelay: 0,
  });
  await workerBoss.work(
    DEAD_LETTER_QUEUE,
    { batchSize: 1, pollingIntervalSeconds: 0.5 },
    createDeadLetterHandler()
  );

  // Same settings as getWebBoss(); jobs are still inserted through Prisma.
  webBoss = new PgBoss({
    connectionString: url,
    max: 1,
    supervise: false,
    schedule: false,
    migrate: false,
    createSchema: false,
  });
  await webBoss.start();

  const role = await prisma.role.create({
    data: {
      key: roleKey,
      name: 'Studio e2e',
      permissions: { create: [{ permission: 'studio.use' }] },
    },
  });
  await prisma.adminUser.create({
    data: { id: allowedId, email: `studio-ok-${allowedId}@test.local` },
  });
  await prisma.adminUser.create({
    data: { id: deniedId, email: `studio-no-${deniedId}@test.local` },
  });
  await prisma.userRole.create({
    data: { userId: allowedId, roleId: role.id },
  });
}, 30_000);

afterAll(async () => {
  await workerBoss?.stop({ graceful: false });
  await webBoss?.stop({ graceful: false });
  await prisma.studioRun.deleteMany({
    where: { createdById: { in: [allowedId, deniedId] } },
  });
  await prisma.adminUser.deleteMany({
    where: { id: { in: [allowedId, deniedId] } },
  });
  await prisma.role.deleteMany({ where: { key: roleKey } });
});

describe('studio queue end to end', () => {
  it('runs a system check enqueued by the web side', async () => {
    await work(RUN_EXECUTORS);
    const run = await createAndEnqueueRun(webBoss, {
      kind: 'system_check',
      createdById: allowedId,
    });
    const done = await waitForRun(run.id, ['succeeded', 'failed']);
    expect(done.status).toBe('succeeded');
    expect(done.steps).toHaveLength(1);
    expect(done.steps[0].key).toBe('ping');
    expect(done.steps[0].output).toMatchObject({ worker: expect.any(String) });
  }, 20_000);

  it('dead-letters a failing job and marks its run failed', async () => {
    await work({
      system_check: async () => {
        throw new Error('boom');
      },
    });
    const run = await createAndEnqueueRun(webBoss, {
      kind: 'system_check',
      createdById: allowedId,
    });
    const done = await waitForRun(run.id, ['failed', 'succeeded']);
    expect(done.status).toBe('failed');
    expect(done.error).toBe('boom');
  }, 20_000);

  it('fails runs whose creator lacks studio.use', async () => {
    await work(RUN_EXECUTORS);
    const run = await createAndEnqueueRun(webBoss, {
      kind: 'system_check',
      createdById: deniedId,
    });
    const done = await waitForRun(run.id, ['failed', 'succeeded']);
    expect(done.status).toBe('failed');
    expect(done.error).toBe('FORBIDDEN');
    expect(done.steps).toHaveLength(0);
  }, 20_000);
});
```

- [ ] **Step 10: Run the end-to-end test**

Run: `DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" ADMIN_TEST_DB=1 yarn vitest run --project db src/generator/queue/queue.db.test.ts`
Expected: PASS (3 tests). The first worker `start()` installs the `pgboss` schema in the local database. If the dead-letter test times out, confirm with `SELECT name, data, state FROM pgboss.job WHERE name = 'studio.dead'` that the dead-lettered job carries `{ runId }`; if it does not, make `createDeadLetterHandler` read the run id from where pg-boss puts the original payload and extend its unit test accordingly.

- [ ] **Step 11: Full checks**

Run: `yarn test && yarn type-check && yarn lint`
Expected: PASS.

- [ ] **Step 12: Leave changes uncommitted**

---

### Task 7: The worker process and its image

**Files:**

- Create: `worker/env.ts`, `worker/health-server.ts`, `worker/main.ts`
- Create: `worker/Dockerfile`, `worker/Dockerfile.dockerignore`
- Modify: `.env.example`
- Test: `worker/env.test.ts`, `worker/health-server.test.ts`

**Interfaces:**

- Consumes: `RUN_KINDS` (Task 3), `ensureQueues`, `queueForKind`, `DEAD_LETTER_QUEUE`, `WORKER_CONCURRENCY` (Task 5), `createRunHandler`, `createDeadLetterHandler`, `RUN_EXECUTORS` (Task 6).
- Produces: `loadWorkerEnv(env?): WorkerEnv` (`DATABASE_URL`, `DIRECT_URL`, `PORT` default 8080); `startHealthServer(port, state: { ready: boolean; startedAt: Date }): Server` serving `GET /healthz` (200 ready / 503 not ready, 404 elsewhere).

- [ ] **Step 1: Write the failing tests**

Create `worker/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadWorkerEnv } from './env';

describe('loadWorkerEnv', () => {
  it('requires both database URLs and names the missing ones', () => {
    expect(() => loadWorkerEnv({})).toThrow(
      'Invalid worker environment: DATABASE_URL, DIRECT_URL'
    );
  });

  it('defaults PORT to 8080 and coerces it', () => {
    const base = { DATABASE_URL: 'postgres://a', DIRECT_URL: 'postgres://b' };
    expect(loadWorkerEnv(base).PORT).toBe(8080);
    expect(loadWorkerEnv({ ...base, PORT: '9090' }).PORT).toBe(9090);
  });
});
```

Create `worker/health-server.test.ts`:

```ts
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { startHealthServer } from './health-server';

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

async function listening(state: { ready: boolean; startedAt: Date }) {
  server = startHealthServer(0, state);
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

describe('health server', () => {
  it('answers 503 until ready, then 200', async () => {
    const state = { ready: false, startedAt: new Date() };
    const base = await listening(state);
    expect((await fetch(`${base}/healthz`)).status).toBe(503);
    state.ready = true;
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ready: true });
  });

  it('answers 404 for other paths', async () => {
    const base = await listening({ ready: true, startedAt: new Date() });
    expect((await fetch(`${base}/`)).status).toBe(404);
  });
});
```

Run: `yarn vitest run --project unit worker`
Expected: FAIL — cannot resolve `./env` and `./health-server`.

- [ ] **Step 2: Implement env and health server**

Create `worker/env.ts`:

```ts
import { z } from 'zod';

const envSchema = z.object({
  /** Transaction pooler; append `&connection_limit=3` in production. */
  DATABASE_URL: z.string().min(1),
  /** Session pooler (:5432). pg-boss needs a session-mode connection. */
  DIRECT_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(8080),
});

export type WorkerEnv = z.infer<typeof envSchema>;

export function loadWorkerEnv(
  env: Record<string, string | undefined> = process.env
): WorkerEnv {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((issue) => issue.path.join('.'));
    throw new Error(`Invalid worker environment: ${keys.join(', ')}`);
  }
  return parsed.data;
}
```

Create `worker/health-server.ts`:

```ts
import { createServer, type Server } from 'node:http';

export type HealthState = { ready: boolean; startedAt: Date };

/** Cloud Run services must listen on $PORT; this is all the worker serves. */
export function startHealthServer(port: number, state: HealthState): Server {
  const server = createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(state.ready ? 200 : 503, {
        'content-type': 'application/json',
      });
      res.end(
        JSON.stringify({
          ready: state.ready,
          startedAt: state.startedAt.toISOString(),
        })
      );
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(port);
  return server;
}
```

Run: `yarn vitest run --project unit worker`
Expected: PASS.

- [ ] **Step 3: Implement the worker entry point**

Create `worker/main.ts`:

```ts
import { PgBoss } from 'pg-boss';
import { RUN_EXECUTORS } from '@/generator/executors';
import {
  DEAD_LETTER_QUEUE,
  ensureQueues,
  queueForKind,
  WORKER_CONCURRENCY,
} from '@/generator/queue/queues';
import {
  createDeadLetterHandler,
  createRunHandler,
} from '@/generator/runs/run-handler';
import { RUN_KINDS } from '@/generator/runs/run-types';
import { prisma } from '@/lib/prisma';
import { loadWorkerEnv } from './env';
import { startHealthServer } from './health-server';

const SHUTDOWN_TIMEOUT_MS = 25_000;

async function main(): Promise<void> {
  const env = loadWorkerEnv();
  const health = { ready: false, startedAt: new Date() };
  const server = startHealthServer(env.PORT, health);

  const boss = new PgBoss({
    connectionString: env.DIRECT_URL,
    max: 2,
    application_name: 'cosbe-studio-worker',
  });
  boss.on('error', (error) => console.error('[studio-worker] pg-boss', error));
  await boss.start();
  await ensureQueues(boss, RUN_KINDS);

  const handleRuns = createRunHandler(RUN_EXECUTORS);
  for (const kind of RUN_KINDS) {
    await boss.work(
      queueForKind(kind),
      { batchSize: 1, localConcurrency: WORKER_CONCURRENCY[kind] },
      handleRuns
    );
  }
  await boss.work(
    DEAD_LETTER_QUEUE,
    { batchSize: 1 },
    createDeadLetterHandler()
  );

  health.ready = true;
  console.log(
    `[studio-worker] ready on :${env.PORT} — ${RUN_KINDS.map(queueForKind).join(', ')}`
  );

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    health.ready = false;
    console.log(`[studio-worker] ${signal}: finishing active jobs`);
    await boss.stop({ graceful: true, timeout: SHUTDOWN_TIMEOUT_MS });
    await prisma.$disconnect();
    server.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('[studio-worker] failed to start', error);
  process.exit(1);
});
```

- [ ] **Step 4: Run the worker locally against the test database**

```bash
DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" PORT=8089 yarn worker:start
```

In another terminal: `curl -s localhost:8089/healthz`
Expected: log line `[studio-worker] ready on :8089 — studio.run.system_check` and `{"ready":true,...}`. Press Ctrl+C; expected log `SIGINT: finishing active jobs` and a clean exit.

- [ ] **Step 5: Write the image files**

Create `worker/Dockerfile`:

```dockerfile
# Content Studio worker. Build from the repo root:
#   docker build -f worker/Dockerfile -t studio-worker .
FROM node:24-slim

# Prisma's query engine needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV HUSKY=0

COPY package.json yarn.lock ./
COPY prisma ./prisma
# Runs `prisma generate` via postinstall. Dev dependencies are kept: tsx runs the worker.
# Clean yarn's download cache in the same layer, or it stays in the image (~4 GB).
RUN yarn install --frozen-lockfile && yarn cache clean

COPY tsconfig.json ./
COPY src ./src
COPY worker ./worker

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node_modules/.bin/tsx", "worker/main.ts"]
```

Create `worker/Dockerfile.dockerignore` (BuildKit uses it for `-f worker/Dockerfile`):

```
node_modules
.next
.git
.env
.env.*
!.env.example
coverage
docs
public
```

- [ ] **Step 6: Build and smoke-test the image**

```bash
docker build -f worker/Dockerfile -t studio-worker:local .
docker run --rm -p 8090:8080 \
  -e DATABASE_URL='postgresql://postgres:postgres@host.docker.internal:55432/cosbe_test?schema=public' \
  -e DIRECT_URL='postgresql://postgres:postgres@host.docker.internal:55432/cosbe_test?schema=public' \
  studio-worker:local
```

In another terminal: `curl -s localhost:8090/healthz`
Expected: `{"ready":true,...}`. Confirm no secrets were copied: `docker run --rm studio-worker:local ls -a /app` must not list `.env`. Stop the container with Ctrl+C.

- [ ] **Step 7: Document the env vars**

Append to `.env.example`:

```bash

# Content Studio worker (worker/main.ts, separate Cloud Run service)
# The worker uses DATABASE_URL (append &connection_limit=3 in production) and
# DIRECT_URL (session pooler :5432 — required by pg-boss). The website also
# uses DIRECT_URL for its one-connection pg-boss pool (src/lib/studio/web-boss.ts).
# Optional overrides:
# PORT=8080
# STUDIO_WORKER_ID=
# Model per task, "<provider>:<model-id>". Set to current OpenAI model ids:
# STUDIO_MODEL_OUTLINE=
# STUDIO_MODEL_WRITE=
# STUDIO_MODEL_REPAIR=
# STUDIO_MODEL_AGENT=
# STUDIO_MODEL_DIGEST=
# STUDIO_MODEL_TRANSLATE=
# STUDIO_MODEL_FINISH=
# STUDIO_MODEL_EMBED=
```

- [ ] **Step 8: Full checks**

Run: `yarn test && yarn type-check && yarn lint`
Expected: PASS.

- [ ] **Step 9: Leave changes uncommitted**

---

### Task 8: The Content Studio page, system check and sidebar entry

**Files:**

- Create: `src/lib/studio/action-types.ts`, `src/lib/studio/run-dto.ts`
- Create: `src/actions/studio.ts`
- Create: `src/components/admin/studio/StudioHome.tsx`, `src/components/admin/studio/SystemCheckCard.tsx`
- Create: `src/app/admin/(protected)/studio/page.tsx`
- Modify: `src/app/admin/(protected)/AdminProtectedShell.tsx`, `messages/admin-en.json`, `messages/admin-ja.json`
- Test: `src/lib/studio/run-dto.test.ts`, `src/actions/studio.test.ts`, `src/components/admin/studio/SystemCheckCard.test.tsx`, `src/app/admin/(protected)/AdminProtectedShell.test.tsx`

**Interfaces:**

- Consumes: `getWebBoss` (Task 5), `createAndEnqueueRun` (Task 5), `getRun`, `RunWithSteps` (Task 3), `RunStatus` (Task 3).
- Produces:
  - `type StudioErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'FAILED'`, `type StudioResult<T> = { ok: true; data: T } | { ok: false; error: StudioErrorCode }`
  - `type RunStatusDTO = { id; kind; status: RunStatus; error: string | null; createdAt: string; startedAt: string | null; finishedAt: string | null; steps: { key: string; status: string; output: unknown; error: string | null }[] }`
  - `toRunStatusDTO(run: RunWithSteps): RunStatusDTO`
  - `startSystemCheckAction(): Promise<StudioResult<{ runId: string }>>`
  - `getRunStatusAction(runId: string): Promise<StudioResult<RunStatusDTO>>`

- [ ] **Step 1: Types and DTO (test first)**

Create `src/lib/studio/action-types.ts`:

```ts
import type { RunStatus } from '@/generator/runs/run-types';

export type StudioErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'FAILED';

export type StudioResult<T> =
  { ok: true; data: T } | { ok: false; error: StudioErrorCode };

export type RunStatusDTO = {
  id: string;
  kind: string;
  status: RunStatus;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  steps: Array<{
    key: string;
    status: string;
    output: unknown;
    error: string | null;
  }>;
};
```

Create `src/lib/studio/run-dto.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { RunWithSteps } from '@/generator/runs/runs-repository';
import { toRunStatusDTO } from './run-dto';

describe('toRunStatusDTO', () => {
  it('serializes dates and keeps only UI fields', () => {
    const run = {
      id: 'r1',
      kind: 'system_check',
      status: 'succeeded',
      error: null,
      createdAt: new Date('2026-09-22T00:00:00Z'),
      startedAt: new Date('2026-09-22T00:00:01Z'),
      finishedAt: null,
      tokensIn: 5,
      steps: [
        {
          key: 'ping',
          status: 'succeeded',
          output: { worker: 'w1' },
          error: null,
          attempts: 1,
        },
      ],
    } as unknown as RunWithSteps;
    expect(toRunStatusDTO(run)).toEqual({
      id: 'r1',
      kind: 'system_check',
      status: 'succeeded',
      error: null,
      createdAt: '2026-09-22T00:00:00.000Z',
      startedAt: '2026-09-22T00:00:01.000Z',
      finishedAt: null,
      steps: [
        {
          key: 'ping',
          status: 'succeeded',
          output: { worker: 'w1' },
          error: null,
        },
      ],
    });
  });
});
```

Run: `yarn vitest run --project unit src/lib/studio/run-dto.test.ts` → FAIL (missing module). Then create `src/lib/studio/run-dto.ts`:

```ts
import type { RunWithSteps } from '@/generator/runs/runs-repository';
import type { RunStatus } from '@/generator/runs/run-types';
import type { RunStatusDTO } from './action-types';

export function toRunStatusDTO(run: RunWithSteps): RunStatusDTO {
  return {
    id: run.id,
    kind: run.kind,
    status: run.status as RunStatus,
    error: run.error,
    createdAt: run.createdAt.toISOString(),
    startedAt: run.startedAt?.toISOString() ?? null,
    finishedAt: run.finishedAt?.toISOString() ?? null,
    steps: run.steps.map((step) => ({
      key: step.key,
      status: step.status,
      output: step.output,
      error: step.error,
    })),
  };
}
```

Run again → PASS.

- [ ] **Step 2: Write the failing action test**

Create `src/actions/studio.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, TEST_USER, unauth } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));
vi.mock('@/lib/studio/web-boss', () => ({
  getWebBoss: vi.fn(async () => ({ boss: true })),
}));
vi.mock('@/generator/queue/enqueue', () => ({
  createAndEnqueueRun: vi.fn(),
}));
vi.mock('@/generator/runs/runs-repository', () => ({ getRun: vi.fn() }));

import { createAndEnqueueRun } from '@/generator/queue/enqueue';
import { getRun } from '@/generator/runs/runs-repository';
import { getRunStatusAction, startSystemCheckAction } from './studio';

const RUN_ID = '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';

describe('studio actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  it('startSystemCheckAction throws Unauthorized when logged out', async () => {
    unauth();
    await expect(startSystemCheckAction()).rejects.toThrow('Unauthorized');
  });

  it('startSystemCheckAction requires studio.use', async () => {
    authed(['articles.edit']);
    await expect(startSystemCheckAction()).rejects.toThrow('Forbidden');
    expect(createAndEnqueueRun).not.toHaveBeenCalled();
  });

  it('startSystemCheckAction enqueues a system_check run for the admin', async () => {
    vi.mocked(createAndEnqueueRun).mockResolvedValue({ id: RUN_ID } as never);
    expect(await startSystemCheckAction()).toEqual({
      ok: true,
      data: { runId: RUN_ID },
    });
    expect(createAndEnqueueRun).toHaveBeenCalledWith(
      { boss: true },
      { kind: 'system_check', createdById: TEST_USER.id }
    );
  });

  it('startSystemCheckAction returns FAILED when enqueueing throws', async () => {
    vi.mocked(createAndEnqueueRun).mockRejectedValue(new Error('no schema'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await startSystemCheckAction()).toEqual({
      ok: false,
      error: 'FAILED',
    });
  });

  it('getRunStatusAction rejects a malformed id', async () => {
    expect(await getRunStatusAction('nope')).toEqual({
      ok: false,
      error: 'INVALID_INPUT',
    });
    expect(getRun).not.toHaveBeenCalled();
  });

  it('getRunStatusAction returns NOT_FOUND for a missing run', async () => {
    vi.mocked(getRun).mockResolvedValue(null);
    expect(await getRunStatusAction(RUN_ID)).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
  });

  it('getRunStatusAction returns the run DTO', async () => {
    vi.mocked(getRun).mockResolvedValue({
      id: RUN_ID,
      kind: 'system_check',
      status: 'running',
      error: null,
      createdAt: new Date('2026-09-22T00:00:00Z'),
      startedAt: null,
      finishedAt: null,
      steps: [],
    } as never);
    const result = await getRunStatusAction(RUN_ID);
    expect(result.ok && result.data.status).toBe('running');
  });

  it('getRunStatusAction requires studio.use', async () => {
    authed([]);
    await expect(getRunStatusAction(RUN_ID)).rejects.toThrow('Forbidden');
  });
});
```

Run: `yarn vitest run --project unit src/actions/studio.test.ts`
Expected: FAIL — cannot resolve `./studio`.

- [ ] **Step 3: Implement the actions**

Create `src/actions/studio.ts`:

```ts
'use server';

import { z } from 'zod';
import { requirePermission } from '@/lib/authz';
import { getWebBoss } from '@/lib/studio/web-boss';
import { createAndEnqueueRun } from '@/generator/queue/enqueue';
import { getRun } from '@/generator/runs/runs-repository';
import { toRunStatusDTO } from '@/lib/studio/run-dto';
import type { RunStatusDTO, StudioResult } from '@/lib/studio/action-types';

export async function startSystemCheckAction(): Promise<
  StudioResult<{ runId: string }>
> {
  const ctx = await requirePermission('studio.use');
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
```

Run: `yarn vitest run --project unit src/actions/studio.test.ts`
Expected: PASS.

- [ ] **Step 4: Add the UI copy**

In `messages/admin-en.json`: add `"studio": "Content Studio"` to `sidebar`, and a new top-level `studio` object:

```json
  "studio": {
    "title": "Content Studio",
    "subtitle": "Generate source-grounded article drafts.",
    "comingSoon": "Projects, sources and generation arrive in the next releases.",
    "systemCheck": {
      "title": "System check",
      "description": "Confirms the studio worker is running and connected to the database.",
      "run": "Run system check",
      "queued": "Waiting for the worker…",
      "running": "Worker is running the check…",
      "succeeded": "Worker {worker} completed the check in {seconds}s.",
      "failed": "The check failed: {error}",
      "timeout": "No response after 90 seconds. Is the studio worker running?",
      "startError": "Could not start the check."
    }
  },
```

In `messages/admin-ja.json`: add `"studio": "コンテンツスタジオ"` to `sidebar`, and:

```json
  "studio": {
    "title": "コンテンツスタジオ",
    "subtitle": "ソースに基づいた記事の下書きを生成します。",
    "comingSoon": "プロジェクト、ソース、生成機能は今後のリリースで追加されます。",
    "systemCheck": {
      "title": "システムチェック",
      "description": "スタジオのワーカーが稼働し、データベースに接続できることを確認します。",
      "run": "システムチェックを実行",
      "queued": "ワーカーを待っています…",
      "running": "ワーカーがチェックを実行中…",
      "succeeded": "ワーカー {worker} が {seconds} 秒でチェックを完了しました。",
      "failed": "チェックに失敗しました: {error}",
      "timeout": "90秒経っても応答がありません。スタジオのワーカーは稼働していますか？",
      "startError": "チェックを開始できませんでした。"
    }
  },
```

- [ ] **Step 5: Write the failing card test**

Create `src/components/admin/studio/SystemCheckCard.test.tsx`:

```tsx
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';
import type { RunStatusDTO } from '@/lib/studio/action-types';

vi.mock('@/actions/studio', () => ({
  startSystemCheckAction: vi.fn(),
  getRunStatusAction: vi.fn(),
}));

import { getRunStatusAction, startSystemCheckAction } from '@/actions/studio';
import SystemCheckCard from './SystemCheckCard';

const RUN_ID = '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';

function dto(
  status: RunStatusDTO['status'],
  extra: Partial<RunStatusDTO> = {}
): RunStatusDTO {
  return {
    id: RUN_ID,
    kind: 'system_check',
    status,
    error: null,
    createdAt: '2026-09-22T00:00:00.000Z',
    startedAt: null,
    finishedAt: null,
    steps: [],
    ...extra,
  };
}

async function start() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderAdmin(<SystemCheckCard />);
  await user.click(screen.getByRole('button', { name: 'Run system check' }));
}

async function tick() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
}

describe('SystemCheckCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(startSystemCheckAction).mockResolvedValue({
      ok: true,
      data: { runId: RUN_ID },
    });
  });

  afterEach(() => vi.useRealTimers());

  it('polls until the run succeeds and shows the worker and duration', async () => {
    vi.mocked(getRunStatusAction)
      .mockResolvedValueOnce({ ok: true, data: dto('running') })
      .mockResolvedValueOnce({
        ok: true,
        data: dto('succeeded', {
          finishedAt: '2026-09-22T00:00:03.000Z',
          steps: [
            {
              key: 'ping',
              status: 'succeeded',
              output: { worker: 'w-1' },
              error: null,
            },
          ],
        }),
      });
    await start();
    expect(
      screen.getByRole('button', { name: 'Run system check' })
    ).toBeDisabled();
    await tick();
    expect(
      await screen.findByText('Worker is running the check…')
    ).toBeInTheDocument();
    await tick();
    expect(
      await screen.findByText('Worker w-1 completed the check in 3s.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Run system check' })
    ).toBeEnabled();
  });

  it('shows the run error when the check fails', async () => {
    vi.mocked(getRunStatusAction).mockResolvedValue({
      ok: true,
      data: dto('failed', { error: 'FORBIDDEN' }),
    });
    await start();
    await tick();
    expect(
      await screen.findByText('The check failed: FORBIDDEN')
    ).toBeInTheDocument();
  });

  it('shows a start error when enqueueing fails', async () => {
    vi.mocked(startSystemCheckAction).mockResolvedValue({
      ok: false,
      error: 'FAILED',
    });
    await start();
    expect(
      await screen.findByText('Could not start the check.')
    ).toBeInTheDocument();
    expect(getRunStatusAction).not.toHaveBeenCalled();
  });

  it('gives up after 90 seconds without a result', async () => {
    vi.mocked(getRunStatusAction).mockResolvedValue({
      ok: true,
      data: dto('queued'),
    });
    await start();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000 * 45);
    });
    expect(
      await screen.findByText(
        'No response after 90 seconds. Is the studio worker running?'
      )
    ).toBeInTheDocument();
  });
});
```

Run: `yarn vitest run --project component src/components/admin/studio/SystemCheckCard.test.tsx`
Expected: FAIL — cannot resolve `./SystemCheckCard`.

- [ ] **Step 6: Implement the card, the landing component and the page**

Create `src/components/admin/studio/SystemCheckCard.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getRunStatusAction, startSystemCheckAction } from '@/actions/studio';
import type { RunStatusDTO } from '@/lib/studio/action-types';

const POLL_MS = 2000;
const MAX_POLLS = 45;

type State =
  | { phase: 'idle' }
  | { phase: 'waiting'; status: 'queued' | 'running' }
  | { phase: 'succeeded'; worker: string; seconds: number }
  | { phase: 'failed'; error: string }
  | { phase: 'timeout' }
  | { phase: 'start-error' };

function succeededState(run: RunStatusDTO): State {
  const output = run.steps[0]?.output as { worker?: string } | undefined;
  const end = run.finishedAt ? Date.parse(run.finishedAt) : Date.now();
  return {
    phase: 'succeeded',
    worker: output?.worker ?? '?',
    seconds: Math.max(0, Math.round((end - Date.parse(run.createdAt)) / 1000)),
  };
}

export default function SystemCheckCard() {
  const t = useTranslations('admin.studio.systemCheck');
  const [state, setState] = useState<State>({ phase: 'idle' });
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );

  function poll(runId: string, count: number) {
    timer.current = window.setTimeout(async () => {
      const result = await getRunStatusAction(runId);
      if (!result.ok) {
        setState({ phase: 'failed', error: result.error });
        return;
      }
      const run = result.data;
      if (run.status === 'succeeded') {
        setState(succeededState(run));
      } else if (run.status === 'failed' || run.status === 'cancelled') {
        setState({ phase: 'failed', error: run.error ?? run.status });
      } else if (count + 1 >= MAX_POLLS) {
        setState({ phase: 'timeout' });
      } else {
        setState({ phase: 'waiting', status: run.status });
        poll(runId, count + 1);
      }
    }, POLL_MS);
  }

  async function start() {
    setState({ phase: 'waiting', status: 'queued' });
    const result = await startSystemCheckAction();
    if (!result.ok) {
      setState({ phase: 'start-error' });
      return;
    }
    poll(result.data.runId, 0);
  }

  const busy = state.phase === 'waiting';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">{t('title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('description')}</p>
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        className="mt-4 rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t('run')}
      </button>
      <p className="mt-3 text-sm text-slate-700" aria-live="polite">
        {state.phase === 'waiting' && t(state.status)}
        {state.phase === 'succeeded' &&
          t('succeeded', { worker: state.worker, seconds: state.seconds })}
        {state.phase === 'failed' && t('failed', { error: state.error })}
        {state.phase === 'timeout' && t('timeout')}
        {state.phase === 'start-error' && t('startError')}
      </p>
    </section>
  );
}
```

Create `src/components/admin/studio/StudioHome.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import SystemCheckCard from './SystemCheckCard';

export default function StudioHome() {
  const t = useTranslations('admin.studio');
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('subtitle')}</p>
      </header>
      <p className="text-sm text-slate-600">{t('comingSoon')}</p>
      <SystemCheckCard />
    </div>
  );
}
```

Create `src/app/admin/(protected)/studio/page.tsx`:

```tsx
import PermissionNeeded from '@/components/admin/PermissionNeeded';
import StudioHome from '@/components/admin/studio/StudioHome';
import { hasPermission } from '@/lib/authz';

export default async function AdminStudioPage() {
  if (!(await hasPermission('studio.use'))) {
    return <PermissionNeeded permission="studio.use" />;
  }
  return <StudioHome />;
}
```

The classes match the existing admin pages (`media/MediaClient.tsx` header, `rounded-xl border-slate-200` cards, `bg-primaryColor` primary button).

Run: `yarn vitest run --project component src/components/admin/studio`
Expected: PASS.

- [ ] **Step 7: Add the sidebar entry (test first)**

In `src/app/admin/(protected)/AdminProtectedShell.test.tsx`, inside `it('renders sidebar links', …)` after the `Media` assertion, add:

```tsx
expect(
  screen.getAllByRole('link', { name: 'Content Studio' }).length
).toBeGreaterThan(0);
```

and in the test that renders with `permissions={['media.upload']}`, add:

```tsx
expect(screen.queryByRole('link', { name: 'Content Studio' })).toBeNull();
```

Run: `yarn vitest run --project component "src/app/admin/(protected)/AdminProtectedShell.test.tsx"` → FAIL (no such link).

In `AdminProtectedShell.tsx`, import `Sparkles` from `lucide-react` (next to `Languages`), add `'studio.use'` to the permission list that decides whether the "Content" section heading shows, and add after the `can('translations.edit')` block:

```tsx
{
  can('studio.use') && (
    <NavItem
      href="/admin/studio"
      active={pathname.startsWith('/admin/studio')}
      label={t('studio')}
      icon={<Sparkles className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />}
    />
  );
}
```

Run the shell test again → PASS.

- [ ] **Step 8: Full checks**

Run: `yarn test && yarn type-check && yarn lint`
Expected: PASS.

- [ ] **Step 9: Manual end-to-end check (local test database)**

```bash
# terminal 1
DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" PORT=8089 yarn worker:start
# terminal 2 — web app against the SAME local database
DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" yarn dev
```

Sign in (Supabase auth still comes from `.env`; the local `admin_users` row is created on first sign-in), grant yourself `studio.use` locally if needed:

```bash
docker exec cosbe-studio-test-pg psql -U postgres -d cosbe_test -c "INSERT INTO user_roles (user_id, role_id) SELECT a.id, r.id FROM admin_users a, roles r WHERE r.key = 'super-admin' ON CONFLICT DO NOTHING;"
```

Open `http://localhost:3000/admin/studio`, click **Run system check**.
Expected: "Waiting for the worker…" → "Worker … completed the check in Ns." Stop the worker and run it again: expected the timeout message after 90 s.

- [ ] **Step 10: Leave changes uncommitted**

---

### Task 9: Documentation and final verification

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Document commands and architecture in** `CLAUDE.md`

Under `## Commands`, add:

```bash
# Content Studio worker (separate process; see "Content Studio" below)
yarn worker:dev     # tsx watch, loads .env — never point it at production data by accident
yarn worker:start   # what the worker image runs
```

Add a new section before `### Key Libraries`:

```markdown
### Content Studio

AI article generation lives in the admin at `/admin/studio` (permission `studio.use`). Spec: `docs/superpowers/specs/2026-09-22-content-studio-design.md`.

- **Engine** — `src/generator/` (runs, queue, executors) and `src/ai/` (model config and calls) are framework-free: ESLint forbids Next.js, UI, server-action and session-auth imports there. The worker re-checks permissions by user id via `src/generator/authz.ts`.
- **Runs** — every background job is a `studio_runs` row with resumable `studio_run_steps` (`runStep` never re-executes a succeeded step). Executors throw `NonRetryableRunError` for failures a retry cannot fix.
- **Queue** — pg-boss 12 in the same Postgres (`pgboss` schema, installed by the worker on start). One queue per run kind (`studio.run.<kind>`), dead letters in `studio.dead`. The web app enqueues with `createAndEnqueueRun`: the job is inserted inside the Prisma transaction that creates the run (`db: fromPrisma(tx)`). `getWebBoss()` keeps its own one-connection pool on `DIRECT_URL` only for pg-boss's startup check and queue cache (Prisma raw queries cannot read those columns).
- **Worker** — `worker/main.ts`, run with `tsx`, deployed as its own Cloud Run service from `worker/Dockerfile` (never in the website's containers, so generation cannot slow the public site). Needs `DATABASE_URL` (+ `&connection_limit=3`) and `DIRECT_URL` (session pooler; pg-boss requires it). Serves `GET /healthz` on `$PORT`.
- **Models** — `STUDIO_MODEL_<TASK>` = `<provider>:<model-id>` per task; defaults in `src/ai/models.ts` are placeholders for local use.
- **Tests** — DB tests (`*.db.test.ts`) run only against a disposable local Postgres, e.g. `docker run -d --name cosbe-studio-test-pg -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:17`, then pass `DATABASE_URL`/`DIRECT_URL` explicitly with `ADMIN_TEST_DB=1 yarn test:db`.

Worker deployment (manual; same GCP project as App Hosting, `cosbe-website-ed97c`; use the App Hosting backend's region, see `firebase apphosting:backends:list --project cosbe-website-ed97c`):

1. `yarn db:deploy` (applies studio migrations).
2. One-time: create the Artifact Registry repo and secrets:
   `gcloud artifacts repositories create studio --repository-format=docker --location=$REGION --project cosbe-website-ed97c`
   `printf '%s' "$VALUE" | gcloud secrets create studio-database-url --data-file=- --project cosbe-website-ed97c` (repeat for `studio-direct-url` and `studio-openai-api-key`; the database URL gets `&connection_limit=3`).
3. Build and push, with `IMAGE=$REGION-docker.pkg.dev/cosbe-website-ed97c/studio/worker:$(git rev-parse --short HEAD)`:
   `docker build --platform linux/amd64 -f worker/Dockerfile -t "$IMAGE" . && docker push "$IMAGE"`
4. `gcloud run deploy studio-worker --image "$IMAGE" --region $REGION --project cosbe-website-ed97c --min-instances 1 --max-instances 1 --no-cpu-throttling --cpu 1 --memory 2Gi --port 8080 --no-allow-unauthenticated --set-secrets DATABASE_URL=studio-database-url:latest,DIRECT_URL=studio-direct-url:latest,OPENAI_API_KEY=studio-openai-api-key:latest`
5. Confirm the App Hosting build uses Node ≥ 22.12 and that `DIRECT_URL` is set there (the web app loads pg-boss to enqueue).
6. Deploy the web app, then run **System check** at `/admin/studio`.
```

- [ ] **Step 2: Format touched files**

Run: `yarn prettier --write CLAUDE.md docs/superpowers/plans/2026-09-22-content-studio-p1a-foundation.md`

- [ ] **Step 3: Final verification**

```bash
yarn lint
yarn type-check
yarn test
DATABASE_URL="$TEST_DB_URL" DIRECT_URL="$TEST_DB_URL" ADMIN_TEST_DB=1 yarn test:db
```

Expected: all PASS. Report the exact counts. If `yarn test:db` cannot run (no Docker), say so explicitly rather than claiming it passed.

- [ ] **Step 4: Clean up the local test database (optional)**

```bash
docker rm -f cosbe-studio-test-pg
```

- [ ] **Step 5: Leave changes uncommitted and summarise**

List changed files (`git status --short`) for the user. Do not commit.

---

## Notes for later plans

- **CI:** P1b needs `vector` and `pgroonga` in the CI Postgres image (`postgres:16` has neither); switch the service to an image with both (e.g. the `supabase/postgres` image) when P1b adds those extensions.
- **Queue settings changes** are not applied to existing queues by `ensureQueues`; changing them later needs an explicit `updateQueue` step in that plan.
- **Realtime** progress (spec §3) is deferred; P1a polls every 2 s, which is the spec's fallback.
- **Token ceiling:** `createRun` accepts `tokenCeiling` and `addRunUsage` enforces it; P1c reads `STUDIO_RUN_TOKEN_CEILING` when it creates generation runs.
- **Cancellation between steps:** P1a only refuses to start a cancelled run. Multi-step executors (P1c) must check `isRunCancelled` between steps; add that helper to the runs repository there.
- **Web boss queue cache:** the web app's pg-boss instance is started lazily; deploy the worker (which creates new queues) before the web app, as the spec's deploy order already requires.
