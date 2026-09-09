# Admin Panel Test Strategy — Design

**Date:** 2026-09-09
**Status:** Approved (design); pending spec review
**Scope:** Phased Vitest coverage for the logged-in admin panel: unit tests, component tests, and a small real-Postgres slice for the riskiest writes. No Playwright. All suites run on pull requests and on `master`, and should gate the Vercel production deploy via GitHub required checks.

## Problem

The admin CMS is the highest-risk surface in this repo (create/edit posts, bulk status changes, hard delete, media, legacy import, translations). Today Vitest runs in Node only. Existing tests cover article Zod schemas and the legacy-import pipeline. Almost none of the post-login admin UI or server actions are tested. CI uses dummy `DATABASE_URL` / `DIRECT_URL` and never opens a database.

Without a harness and a scenario catalog, regressions in save, status transitions, auth gates, and destructive bulk actions land in production.

## Goals

- Cover every logged-in admin area in phases, including functional edge cases and auth/safety cases.
- Keep CI hermetic: no live Supabase, no real OpenAI, no test-user secrets.
- Run the full suite on every PR and every `master` push; block merge and (via Vercel “wait for GitHub checks”) block production deploys when CI is red.
- Extend existing tests; do not rewrite the import/validation suites.

## Non-goals

- Playwright / any real browser.
- Login page UI (`src/app/admin/page.tsx`). Auth is covered by `requireUser` and HTTP `401`, not by filling the login form.
- Hitting live Supabase, Storage, or OpenAI.
- Visual/CSS regression, TipTap internals (only our wrappers and `buildArticlePayload`).
- Public site, HubSpot forms.
- Chaos cases: overlapping autosave races, simulated network timeouts, concurrent bulk on the same rows.
- Automating the Vercel dashboard toggle itself (documented for a human to enable).
- Creating a dedicated test Supabase user or storing admin passwords in `.env` (dropped when Playwright was dropped).

## Constraints (decided)

| Decision          | Choice                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| Layers            | Unit + component (React Testing Library). No E2E.                                                          |
| Data              | Mock Prisma/Supabase by default. Small real-Postgres slice for risky writes.                               |
| Edge cases        | Functional + auth/safety. Not timeout/race theatre. Cheap case still in: action rejects → UI shows error.  |
| Phasing           | Vertical slices by admin area. One PR per phase.                                                           |
| CI                | Lint, type-check, unit, component, and `db` slice on `pull_request` and `push` to `master`.                |
| Deploy gate       | GitHub required status check on PRs. Enable Vercel wait-for-GitHub-checks so a red `master` does not ship. |
| Local `yarn test` | Unit + component only. Must pass without Docker. CI also runs `yarn test:db`.                              |

## Section 1 — Architecture

Vitest remains the only runner. One config, three projects:

- **`unit`** — Node. Zod schemas, server actions, mocked repositories, API route handlers. Never connects to Postgres.
- **`component`** — jsdom + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom`. Admin client components.
- **`db`** — Node. Real Prisma against CI Postgres. Only `*.db.test.ts`. Not part of `yarn test`.

Shared helpers live under `src/test/` (test-only, never imported from production):

- `setup.ts` — jsdom setup. Mock `next/cache`, `next/navigation`, and `next/image` (plain `<img>`).
- `require-user.ts` — `authedUser()` (default) and `unauth()` that make `requireUser` throw `Error('Unauthorized')`.
- `prisma-mock.ts` — in-memory maps for articles, authors, media, translations. Enough to drive actions without SQL.
- `render-admin.tsx` — wrap with `NextIntlClientProvider` using `messages/admin-en.json` (default). JA is used only in the shell locale-switcher smoke.

Always mocked: `@/lib/storage`, OpenAI / `@/lib/block-translation-server` internals at the action boundary, `revalidatePath` / `revalidateArticlePaths`, Supabase clients.

### Small real-DB slice

GitHub Actions adds a `postgres:16` service. After unit/component tests, CI points `DATABASE_URL` / `DIRECT_URL` at the service, runs `prisma migrate deploy`, then `yarn test:db`:

1. Duplicate slug (`articles.slug` unique).
2. Archive → restore (status back to `draft`) → hard-delete (row gone).
3. Bulk publish / unpublish / archive / delete.

These tests import the real `articles-repository` and the real `prisma` client and call repository functions directly (no `requireUser`, no server actions).

`yarn test` runs `unit` + `component` only. `yarn test:db` runs the `db` project and requires `ADMIN_TEST_DB=1` plus a migrated Postgres. Without that env var, `yarn test:db` exits 1 (CI must set it; developers who want the slice run Postgres themselves).

Dummy `DATABASE_URL` / `DIRECT_URL` stay on the unit/component CI step so Prisma can instantiate at import time without connecting (same as today).

### CI and Vercel

`.github/workflows/ci.yml` keeps a **single** `test` job. Triggers: `pull_request` to `master`, `push` to `master`. Postgres `16` is a job service. Steps, in order:

1. Install, lint, type-check, `yarn test` with the existing dummy datasource env vars.
2. Point `DATABASE_URL` / `DIRECT_URL` at the service, `prisma migrate deploy`, `ADMIN_TEST_DB=1 yarn test:db`.

Vercel: do not change the GitHub Actions deploy model. After CI exists, enable:

1. GitHub branch protection on `master`: required check = this CI job.
2. Vercel project setting to wait for GitHub checks before production deploy.

## Section 2 — Phases

Each phase is a separate PR. A phase is done when its catalog below is encoded as tests, `yarn test` is green locally (without Docker), and CI is green including the `db` slice once Phase 1 has landed.

### Phase 1 — Harness

- Vitest projects `unit`, `component`, and `db`.
- `src/test/` helpers listed above.
- GitHub Actions Postgres + `prisma migrate deploy` + `yarn test:db` with a single smoke (`SELECT 1`) until Phase 2/3 add the real write cases.
- Document required-check + Vercel wait-for-checks in this spec (no new markdown file).

### Phase 2 — Posts (create + edit)

Highest value. Extract `buildArticlePayload` to `src/lib/admin/build-article-payload.ts`. Extend `src/lib/validation/article.test.ts`. Add article action tests, payload-helper tests, `PostEditor` tests, and the duplicate-slug `db` case.

### Phase 3 — Dashboard

`DashboardClient` list/filter/bulk/row actions + real-DB bulk slice.

### Phase 4 — Media

Upload (mocked storage), list/search/pagination, delete, API `401`.

### Phase 5 — Import

Preview, slug collision, commit-as-draft, unauthorized. Reuse existing legacy-import unit tests; add action-level and client tests only.

### Phase 6 — Translations

Namespace list, save, history, restore, delete history, mocked AI translate-to-EN, unauthorized on every action.

### Phase 7 — Shell

Nav active states, locale switcher EN/JA, sign out → `signOut` + `router.replace('/admin')`, mobile drawer. Protected layout: no user → `redirect('/admin')` (mock `getUser` + assert `redirect` called).

## Section 3 — Scenario catalog

Cheap error mapping is in: when an action/module rejects, the UI surface that already uses `alert` or `role="alert"` must show it. Timeouts and overlapping autosaves are out.

### Auth (all phases that add actions)

For every server action under `src/actions/` and `GET /api/admin/media`:

- No session → `Error('Unauthorized')` or HTTP `401`.
- Authed → proceeds (assert the repository/storage mock was called).

Missing entity:

- `restoreArticleAction` / `publishArticleAction` / `unpublishArticleAction` → `Not found` when `getArticleSlugCategoryById` returns null.
- `deleteMediaAction` → `Not found` when `getMediaById` returns null.

### Posts — validation and actions

Create schema:

- Accepts minimal valid body and full editor payload (already tested; keep).
- Rejects empty slug, empty title, empty author name/designation, invalid category, `status: 'archived'` on create, block missing `id` or `type`.
- `toCreateArticlePayload` trims optional strings (empty → undefined), drops client TOC, preserves `avatarUrl` omitted vs `''`.

Update schema:

- All fields optional.
- Allows `archived`.
- Invalid date string for `publishedAt` rejected.

Actions:

- `createArticleAction` validates then persists the normalized payload (not the raw client object).
- `updateArticleAction` throws with Zod details on invalid input.
- Empty bulk `ids` → no-op, does not throw (`publishArticlesAction`, `unpublishArticlesAction`, `archiveArticlesAction`, `deleteArticlesAction`).
- Case-study meta is only included when category is `case-study` (tested on the extracted `buildArticlePayload` helper).

Real DB (`db`):

- Two creates with the same slug → unique constraint failure.
- Archive → restore → status `draft`; then hard-delete → row absent.

### Posts — editor UI (`PostEditor`)

Phase 2 extracts `buildArticlePayload` into `src/lib/admin/build-article-payload.ts` so payload/slug/title/tag/case-study cases are unit-tested without mounting TipTap. `PostEditor.tsx` imports that helper. Component tests cover save/autosave/translate/alert behavior.

- Empty title → untitled fallback string.
- Empty slug → derived from title via existing `createFallbackSlug`.
- Tags `"a, b, ,c"` → `['a','b','c']`.
- New post save → `createArticleAction` then `router.replace('/admin/posts/:id')`.
- Existing post save → `updateArticleAction` only.
- Publish stamps `publishedAt` on first publish; later publish/save keeps the existing timestamp.
- Saving a published post as draft sets status away from published and clears `publishedAt`.
- Autosave does not run without `persistedId`, when not dirty, or when a manual save is in flight.
- Autosave failure is swallowed (no `alert`).
- Manual save failure → `alert` with the error message (or `saveFailed`).
- Translate: confirm cancel → `translateArticleEnAction` not called.
- Translate: in-flight guard (`translatingArticle`) prevents double submit.
- Translate partial `errors` → `alert` includes messages.
- `canTranslateArticle` is false when title and blocks have nothing to translate.
- Featured image / `showFeaturedImage` round-trip in the payload.
- Author avatar: omitted when not dirty; sent (including empty string) when dirty.
- Invalid image type/size rejected in the upload control (file never passed to mocked storage).

Do not mount a full TipTap document for every block type. Each of table, heading, paragraph, list, quote, callout, image, code, divider, embed gets a shallow block-editor test that `onChange` fires. `buildArticlePayload` accepts a fixture containing every type.

### Dashboard (`DashboardClient`)

- Empty `items` → empty state, not a crash.
- Search with no match → empty rows.
- Status/category filters hide non-matching rows (client-side table).
- Published row shows unpublish, not publish.
- Archived row shows restore, not archive.
- Archive confirm cancel → action not called.
- Bulk archive / bulk delete confirm cancel → action not called.
- Bulk bar hidden / bulk handler returns immediately when selection is empty.
- Row busy disables that row’s action buttons.
- Action throw → `role="alert"` with `actionFailed`.
- Pagination: previous disabled on first page, next disabled on last.

Real DB (`db`): bulk publish/unpublish/archive/delete change the intended rows only.

### Media

- `GET /api/admin/media` without user → `401`.
- Authed list returns `{ items, total, page, pageSize, totalPages }` (repository mocked).
- Page size clamped 1–100; page minimum 1 (same as the route).
- `recordMediaAction` persists mocked metadata after mocked upload.
- `deleteMediaAction` deletes the row even if `deleteFromGallery` throws (silent catch).
- Client: search debounce does not fire a fetch on every keystroke (fake timers).
- Client: invalid/oversize file rejected before `uploadToGallery`.

### Import

Existing `src/lib/legacy-import/**/*.test.ts` stay the source of truth for parsers, URL guard, bulk concurrency.

New:

- `previewImportAction` / `checkImportSlugAction` / `commitImportAction` unauthorized.
- `commitImportAction` throws `SlugCollisionError` when slug taken.
- Successful commit creates status `draft`, uses payload category, rehost warnings concatenated into return `warnings`.
- Image rehost `ImageRehostError` surfaces as `Error(message)`.
- Do not duplicate `bulk.test.ts` / `bulk-state.test.ts`. Add a `BulkImportClient` test only for UI not covered there (e.g. a failed row shows error text while siblings stay pending/success).

### Translations

- Every action in `src/actions/translations.ts` unauthorized when logged out.
- Save persists mocked row; history list; restore; delete history item.
- `translateKeyToEnglish` uses mocked OpenAI path: success returns English string; thrown error is visible to the client.
- Editor: changing a value and save calls `saveTranslation`; history drawer loads on demand.

### Shell

- Sidebar links: dashboard, new post, import, media, translations.
- Active class when `pathname` matches.
- Sign out calls `signOut` and `router.replace('/admin')`.
- Locale switcher changes admin locale (cookie/provider) and shows JA copy for a known key.
- Mobile menu button opens the drawer; overlay click closes it.

## Section 4 — File layout

Colocate tests with code, matching existing `*.test.ts` names:

| Area            | Files                                                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Helpers         | `src/test/setup.ts`, `src/test/require-user.ts`, `src/test/prisma-mock.ts`, `src/test/render-admin.tsx`                                                                 |
| Payload helper  | extract `src/lib/admin/build-article-payload.ts` + `src/lib/admin/build-article-payload.test.ts` (Phase 2)                                                              |
| Validation      | extend `src/lib/validation/article.test.ts`                                                                                                                             |
| Actions         | `src/actions/articles.test.ts`, `media.test.ts`, `legacy-import.test.ts`, `translations.test.ts`, `block-translation.test.ts`                                           |
| API             | `src/app/api/admin/media/route.test.ts`                                                                                                                                 |
| DB slice        | `src/lib/articles-repository.db.test.ts`                                                                                                                                |
| UI              | `src/components/admin/PostEditor.test.tsx`, `src/app/admin/(protected)/dashboard/DashboardClient.test.tsx`, plus media/import/translations/shell colocated `*.test.tsx` |
| Layout redirect | `src/app/admin/(protected)/layout.test.ts`                                                                                                                              |

`vitest.config.ts` uses `test.projects`:

- `unit`: Node, `src/**/*.test.ts`, exclude `*.db.test.ts` and `flatten.roundtrip.test.ts`.
- `component`: jsdom, `src/**/*.test.tsx`.
- `db`: Node, `src/**/*.db.test.ts` only.

Keep excluding `src/lib/translations/flatten.roundtrip.test.ts` from all projects.

Dependencies to add (dev): `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`. Do not add Playwright.

## Error handling policy

- Server actions throw `Error` strings the UI already handles (`Unauthorized`, `Not found`, Zod `Invalid article data: …`, slug collision). Tests assert those strings.
- Component tests stub `window.alert` and `window.confirm`.
- Do not add new production error types just for tests.

## Testing conventions

- One behavior per `it`; names describe the outcome (`rejects archived status on create`).
- Prefer calling server actions with mocked `requireUser` over rendering the whole page for auth.
- Extract pure helpers (`buildArticlePayload`) rather than mounting huge trees.
- Fake timers for autosave interval and media search debounce.
- No snapshots of full HTML.
- Do not hit the network. Mock modules at the action/storage boundary (no MSW).

## Open implementation notes (not TBD)

These are explicit choices, not placeholders:

- `updateArticleAction` currently `safeParse`s then writes the raw `data` argument. Tests document current behavior (invalid data throws; valid extra keys may still be passed through). Do not “fix” that in a test phase unless a test proves a user-facing bug; if we change it, it is a separate product PR.
- Protected layout redirect is unit-tested with mocks, not a browser.
- `listArticlesAdminAction` exists but the dashboard page currently loads via `getArticles` on the server and filters client-side. Test the client table against fixture `items`; test `listArticlesAdminAction` pagination/clamp (`page >= 1`, `pageSize` 1–100) separately so it cannot silently rot.

## Success criteria

A phase may merge when:

1. Every bullet in that phase’s catalog has at least one test.
2. `yarn test`, `yarn lint`, and `yarn type-check` pass locally without Docker.
3. CI on the PR is green, including `yarn test:db` after Phase 1.

The program is complete when Phases 1–7 are merged.
