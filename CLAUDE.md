# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # Start dev server at http://localhost:3000
yarn build        # Production build
yarn lint         # ESLint
yarn type-check   # TypeScript type checking
yarn format       # Prettier formatting

# Database
yarn db:migrate   # Run migrations in development (prompts for migration name)
yarn db:deploy    # Apply migrations in production
yarn db:push      # Quick schema experiment (no migration file)
yarn db:studio    # Open Prisma Studio GUI
yarn postinstall  # Re-run prisma generate (needed after schema changes to refresh TS types)

# Utilities
yarn import-article <url>        # Scrape and import legacy articles
yarn db:bootstrap-admins             # One-off: import Supabase Auth users into admin_users (Admin role; super-admin by email)
yarn db:bootstrap-admins --dry-run   # Preview without writing

# Translations
yarn db:pull-translations            # Snapshot DB values into JSON files (DB → JSON)
yarn db:pull-translations --dry-run  # Preview pull without writing
yarn db:push-translations            # Push JSON values into DB with history (JSON → DB)
yarn db:push-translations --dry-run  # Preview push without writing
yarn db:sync-translations            # Bidirectional sync (DB wins on conflicts, pushes new keys, orphan handling)
yarn db:sync-translations --dry-run  # Preview sync without writing
yarn db:seed-translations            # Insert missing keys only (skip existing)
yarn db:seed-translations --force    # Disaster recovery: wipe DB + history, restore from JSON
yarn test:translations-flatten       # Round-trip test for flatten/unflatten utilities

# Content Studio worker (separate process; see "Content Studio" below)
yarn worker:dev     # tsx watch, loads .env — never point it at production data by accident
yarn worker:start   # what the worker image runs
```

### Translation commands cheat-sheet

| Command                        | Direction | Who wins on conflict? | Writes history? | Use when…                                                      |
| ------------------------------ | --------- | --------------------- | --------------- | -------------------------------------------------------------- |
| `db:pull-translations`         | DB → JSON | DB                    | No              | Snapshotting editor changes into the codebase                  |
| `db:push-translations`         | JSON → DB | JSON                  | Yes             | You edited JSON locally and want DB to match                   |
| `db:sync-translations`         | DB ↔ JSON | DB                    | No              | Routine sync: pull editor edits + push new keys + mark orphans |
| `db:seed-translations`         | JSON → DB | Skip existing         | No              | First-time bootstrap or adding new keys only                   |
| `db:seed-translations --force` | JSON → DB | JSON (nuclear)        | Wipes history   | Disaster recovery — resets everything from JSON                |

Pre-commit hooks (Husky + lint-staged) run Prettier and ESLint on staged files automatically.

After editing `prisma/schema.prisma`, always run `yarn postinstall` to regenerate `@prisma/client` types. The IDE language server caches stale types and may show false errors until regenerated.

## Architecture

**Next.js 16 App Router** — bilingual (EN/JA) marketing site with a CMS admin dashboard.

### Routing

All public pages live under `src/app/[locale]/` and are always prefixed with `/en/` or `/ja/`. The default locale is English. Routing is powered by `next-intl` (see `src/i18n/routing.ts`).

Admin routes live under `src/app/admin/(protected)/` and require a Supabase session. Auth middleware is in `src/lib/supabase/middleware.ts`.

### Data Layer

- **Supabase (PostgreSQL)** via **Prisma** — single source of truth for all CMS content.
- `src/lib/articles-repository.ts` — all article queries (also re-exported via `src/lib/articles.ts`).
- `src/actions/articles.ts` — Server Actions for CRUD + cache revalidation.
- Images are stored in Supabase Storage (`article-images` bucket); see `src/lib/storage.ts`.

#### Database schema (key models)

**`Author`** — shared author entity with `name`, `designation`, `avatarUrl`, `socialLinks`. Articles reference authors via a FK (`authorId`). Use `upsertAuthor(name, designation)` to find-or-create before writing an article.

**`Article`** — main content table. Notable fields:

- `status: ArticleStatus` enum (`draft` | `published` | `archived`)
- `authorId` FK → `authors` table (not JSON)
- `blocks: Json`, `toc: Json`, `seo: Json?` — structured content
- `titleEn`, `excerptEn` — English translations alongside primary Japanese fields
- `tags String[]` — GIN-indexed for fast array containment queries
- Composite index on `(status, category, publishedAt DESC)`

**`ArticleView`** — append-only view log for analytics. Written on every page visit via `logArticleView(id)` inside `after()` so it doesn't block the page render. Also increments `article.viewCount` in the same transaction.

#### Repository functions (`src/lib/articles-repository.ts`)

- `getArticles(options, admin?)` — list with `select: listItemSelect` (omits `blocks`/`toc`/`seo`), supports `page`/`pageSize` for offset pagination
- `countArticles(options, admin?)` — total count for pagination UI
- `getArticleBySlug(slug, includeDrafts?)` / `getArticleById(id, includeDrafts?)` — full article with author joined
- `getRelatedArticles(articleId, relatedIds)` — single `findMany` + Map re-ordering (no N+1)
- `getAuthors()` — all authors sorted by name
- `upsertAuthor(name, designation)` — find-or-create by name+designation
- `logArticleView(id)` — transaction: insert `ArticleView` + increment `viewCount`
- `archiveArticleRecord(id)` — sets `status = 'archived'` (soft delete)
- `deleteArticleRecord(id)` — hard delete (only call after archiving)

#### Soft delete flow

`draft/published` → **Archive** (`archiveArticleRecord`) → `archived`
From `archived`: **Restore** (back to `draft`) or **Hard Delete** (`deleteArticleRecord`).
Admin dashboard buttons are conditional on current status.

#### Cache revalidation

`revalidateArticlePaths(slug, category)` in `src/actions/articles.ts` only revalidates the affected category's listing page using `CATEGORY_LISTING_PATH`. Categories: `useful-info` → `/useful-column`, `case-study` → `/case-studies`, `video` → `/useful-video`, `notice` → `/notice`.

### Users & permissions

- **Permissions** are code-defined in `src/lib/permissions.ts`. **Roles** (UI-managed at `/admin/roles`) bundle permissions; users (`/admin/users`) can hold several roles and get the union. `super-admin` is a locked system role with every permission.
- **Enforcement:** every server action calls `requirePermission(...)` / `requireAnyPermission(...)` from `src/lib/authz.ts` (never just a session check). Pages call `hasPermission` and render `<PermissionNeeded />`. Client components use `usePermissions()` only to hide controls.
- **Guardrails** (`src/lib/authz-rules.ts`): no self-modification, only super-admins touch super-admins, nobody grants or takes over permissions they don't hold (`canModifyUser` requires `holdsAll` of the target's permissions).
- **Adding a permission:** add the key to `PERMISSIONS`, add `admin.access.permissions.<key_with_underscores>` label/description to `messages/admin-{en,ja}.json`, add the `requirePermission` check where it applies, and decide whether default roles should get it (new migration inserting `role_permissions` rows + `DEFAULT_ROLE_PERMISSIONS`).
- **Auth accounts** are created/banned/deleted through `src/lib/supabase/admin.ts` (service-role key, server-only). Password reset and disable revoke sessions by deleting `auth.sessions` (refresh tokens cascade). The `DATABASE_URL` role needs `DELETE` on that table; the default Supabase `postgres` user has it. If revoke fails after the password/ban already applied, the action returns `SESSIONS_NOT_REVOKED`. Confirm with `DELETE FROM auth.sessions WHERE user_id = '00000000-0000-0000-0000-000000000000';` (0 rows is success).
- **Storage policies** in `supabase/schema.sql` call `public.admin_has_any_permission`; re-run that SQL when changing which permissions allow uploads/deletes.
- **Deploy order for this feature:** disable public sign-ups in the Supabase dashboard (Authentication → Providers → Email) → set `SUPABASE_SERVICE_ROLE_KEY` in local `.env` and App Hosting env (same place as `DATABASE_URL`; never `NEXT_PUBLIC_`) → `yarn db:deploy` → `yarn db:bootstrap-admins` → run `supabase/schema.sql` storage section → deploy code. Bootstrap grants Admin to every existing Auth user without roles; unexpected accounts become admins.

### Pagination

Public listing pages (`notice`, `useful-column`, `useful-video`, `case-studies`) accept `?page=N` query params. `ArticleGrid` calls `getArticles` and `countArticles` in parallel, then renders `ArticlePagination` when `totalPages > 1`. Page size is `PAGE_SIZE = 12` in `ArticleGrid`.

### Internationalization

UI strings are in `messages/{en,ja}.json` (public) and `messages/admin-{en,ja}.json` (admin). Use `next-intl`'s `useTranslations` / `getTranslations` hooks.

**Article content** uses a dual-field strategy — Japanese is the primary language:

- `title` / `titleEn`, `excerpt` / `excerptEn`
- Content blocks each carry optional `*En` fields (e.g., `contentEn`, `itemsEn`)
- `src/lib/article-locale.ts` contains the fallback resolution logic
- Auto-translation via OpenAI is triggered through `src/actions/block-translation.ts` (uses `gpt-4o-mini` by default, configurable via `OPENAI_MODEL` env var)

Admin locale preference is stored in a cookie and does not affect the public site locale.

### Content Blocks

Articles are stored as structured JSON block arrays (not raw HTML). Block types: `heading`, `paragraph`, `list`, `quote`, `callout`, `image`, `code`, `divider`, `embed`. The admin editor is built with **TipTap** and **@dnd-kit** for drag-and-drop reordering. See `src/types/index.ts` for the full type definitions.

### Content Studio

AI article generation lives in the admin at `/admin/studio` (permission `studio.use`). Spec: `docs/superpowers/specs/2026-09-22-content-studio-design.md`.

- **Engine** — `src/generator/` (runs, queue, executors) and `src/ai/` (model config and calls) are framework-free: ESLint forbids Next.js, UI, server-action and session-auth imports there. The worker re-checks permissions by user id via `src/generator/authz.ts`.
- **Runs** — every background job is a `studio_runs` row with resumable `studio_run_steps` (`runStep` never re-executes a succeeded step). Executors throw `NonRetryableRunError` for failures a retry cannot fix.
- **Queue** — pg-boss 12 in the same Postgres (`pgboss` schema, installed by the worker on start). One queue per run kind (`studio.run.<kind>`), dead letters in `studio.dead`. The web app enqueues with `createAndEnqueueRun`: the job is inserted inside the Prisma transaction that creates the run (`db: fromPrisma(tx)`). `getWebBoss()` keeps its own one-connection pool on `DIRECT_URL` only for pg-boss's startup check and queue cache (Prisma raw queries cannot read those columns).
- **Worker** — `worker/main.ts`, run with `tsx`, deployed as its own Cloud Run service from `worker/Dockerfile` (never in the website's containers, so generation cannot slow the public site). Needs `DATABASE_URL` (+ `&connection_limit=3`) and `DIRECT_URL` (session pooler; pg-boss requires it). Serves `GET /healthz` on `$PORT`.
- **Models** — `STUDIO_MODEL_<TASK>` = `<provider>:<model-id>` per task; defaults in `src/ai/models.ts` are placeholders for local use.
- **Sources** — `studio_sources` (global library) + `studio_project_sources` (project links). Adding a source enqueues an `ingest` run: extract → sentence-aware chunks (`src/generator/text/chunker.ts`) → `text-embedding-3-small` vectors → digest (`meta.digest`). PDFs go to the private `studio-sources` bucket via signed upload URLs and stay `stored` (not ingested) until PDF extraction is decided. A failed ingest run also marks its source `failed`.
- **Retrieval** — `searchSources` / `searchChunks` (`src/generator/retrieval/search.ts`): pgvector HNSW + PGroonga (`&@~`, Japanese-capable) merged by reciprocal rank fusion, always scoped to source ids (+ optional chapter char ranges), `ready` sources only.
- **Pieces** — `studio_pieces` hold one article in progress: brief, selection, outline (sections linked to chunk ids), `sections` (JA sentences with `cite: chunkId[]` or `connective`), EN translation, SEO. Runs: `outline`, `write` (one resumable step per section + finish), `rewrite_section`, `translate`. `src/generator/pieces/grounding.ts` enforces the citation contract; violations after one repair become section `flags`. Snapshots (`studio_piece_snapshots`) back the History/undo list.
- **Handoff** — `createDraftPostAction` (needs `studio.use` + `articles.edit`) converts sections with `toArticleBlocks` (no citation data), creates an `articles` draft through `createArticleRecord`, and locks the piece (`handed_off`). The studio then only shows the post's status; duplicate the piece to redo it.
- **Tests** — DB tests (`*.db.test.ts`) run only against a disposable local Postgres on Supabase's image (has `vector` + `pgroonga` and the same non-superuser `postgres` role as production; CI uses it too): `docker run -d --name cosbe-studio-test-pg -e POSTGRES_PASSWORD=postgres -p 55432:5432 supabase/postgres:17.6.1.175`, apply migrations with `yarn prisma migrate deploy`, then pass `DATABASE_URL`/`DIRECT_URL` explicitly (`…@localhost:55432/cosbe_test?schema=public`) with `ADMIN_TEST_DB=1 yarn test:db`. To use the admin against that DB (`yarn dev` with the same URLs inline), first run `DATABASE_URL='…@localhost:55432/cosbe_test?schema=public' yarn db:local-super-admin [email]` — it makes the Supabase Auth user (default `bivav.r.s@cosbe.inc`) super-admin and refuses any non-localhost `DATABASE_URL`.

Worker deployment (manual; same GCP project as App Hosting, `cosbe-website-ed97c`; use the App Hosting backend's region, see `firebase apphosting:backends:list --project cosbe-website-ed97c`):

1. `yarn db:deploy` (applies studio migrations, including the `vector` and `pgroonga` extensions), then run the `studio-sources` bucket block of `supabase/schema.sql` in the Supabase SQL editor.
2. One-time: create the Artifact Registry repo and secrets:
   `gcloud artifacts repositories create studio --repository-format=docker --location=$REGION --project cosbe-website-ed97c`
   `printf '%s' "$VALUE" | gcloud secrets create studio-database-url --data-file=- --project cosbe-website-ed97c` (repeat for `studio-direct-url` and `studio-openai-api-key`; the database URL gets `&connection_limit=3`).
3. Build and push, with `IMAGE=$REGION-docker.pkg.dev/cosbe-website-ed97c/studio/worker:$(git rev-parse --short HEAD)`:
   `docker build --platform linux/amd64 -f worker/Dockerfile -t "$IMAGE" . && docker push "$IMAGE"`
4. `gcloud run deploy studio-worker --image "$IMAGE" --region $REGION --project cosbe-website-ed97c --min-instances 1 --max-instances 1 --no-cpu-throttling --cpu 1 --memory 2Gi --port 8080 --no-allow-unauthenticated --set-secrets DATABASE_URL=studio-database-url:latest,DIRECT_URL=studio-direct-url:latest,OPENAI_API_KEY=studio-openai-api-key:latest`
5. Confirm the App Hosting build uses Node ≥ 22.12 and that `DIRECT_URL` is set there (the web app loads pg-boss to enqueue).
6. Deploy the web app, then run **System check** at `/admin/studio`.

### Key Libraries

| Purpose             | Library                                     |
| ------------------- | ------------------------------------------- |
| Framework           | Next.js 16, React 19                        |
| Database ORM        | Prisma                                      |
| Auth + DB + Storage | Supabase                                    |
| i18n                | next-intl                                   |
| Admin editor        | TipTap v3                                   |
| AI translation      | OpenAI (gpt-4o-mini)                        |
| Forms               | HubSpot embedded forms                      |
| Styling             | Tailwind CSS v4 + `@tailwindcss/typography` |
| Icons               | Lucide React                                |

### Environment Variables

Required vars are documented in `.env.example`. Key ones:

- `DATABASE_URL` / `DIRECT_URL` — Supabase PostgreSQL (pooled vs. direct)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` / `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`)
- `NEXT_PUBLIC_HUBSPOT_PORTAL_ID` and per-form IDs
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; the Supabase **secret key** (`sb_secret_...`). Admin user management and bootstrap script. Never `NEXT_PUBLIC_`.
