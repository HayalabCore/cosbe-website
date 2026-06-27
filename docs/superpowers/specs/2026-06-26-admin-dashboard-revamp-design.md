# Admin Dashboard (All Posts) Revamp — Design

**Date:** 2026-06-26
**Status:** Approved (design); pending spec review
**Scope:** Make the admin "all posts" dashboard fast and well-organised: server-rendered listing with keep-previous loading, createdAt-based ordering, multi-select status badges, clickable titles, created-date display, and faster/broader search.

## Problem

`src/app/admin/(protected)/dashboard/page.tsx` is a ~790-line client component. On every load it hydrates, then fires `listArticlesAdminAction` (3 DB queries) and shows a full-table skeleton until it resolves. Every filter/search/page change flips `loading` back on and swaps the whole table for a skeleton again — the main source of perceived slowness. Specific issues:

1. **Slow first paint & janky navigation** — client-only fetch + skeleton swap on every change.
2. **Random order** — `orderBy: publishedAt desc`, but drafts have `publishedAt = null`, so they sort into an undefined trailing position.
3. **Title not clickable** — only a pencil icon links to the editor.
4. **No created date shown**, and ordering is by published date, not created.
5. **Status filter is a single dropdown** — can't select multiple.
6. **Search is title-only and unindexed** — `ILIKE '%q%'` on `title`/`titleEn`, no `slug`, no trgm index.

## Non-goals

- No new client-data library (TanStack Query). The native App Router approach is used.
- Category filter stays a single dropdown (only status becomes badges).
- No change to public listing pages' ordering or behavior.
- No change to the row-action server actions themselves (archive/publish/etc. reused as-is).

## Section 1 — Architecture: Server Component + keep-previous

Convert the listing to a server-rendered page with small client islands.

- **`dashboard/page.tsx`** → async **Server Component**. Reads `searchParams` (status, category, page, q), fetches `items`/`total`/`stats` on the server via the repository, renders the table in the first paint. Auth via existing protected layout. No top-level `'use client'`.
- **Client islands:**
  - **`DashboardFilters`** (`'use client'`) — search input (debounced), status badge toggles, category select. Mutates the URL with `router.replace(pathname?…)` wrapped in **`useTransition`**. While `isPending`, the existing server-rendered rows remain visible, dimmed, with a thin top progress bar — the keep-previous behavior.
  - **`DashboardRowActions`** (`'use client'`) — per-row publish/unpublish/archive/restore/hard-delete buttons. Calls the existing server actions, then `router.refresh()` inside a transition; shows a per-row busy state.
  - **`DashboardPagination`** (`'use client'` or `<Link>`) — prev/next via URL.
- **First-load skeleton** only when there is no prior render to keep; filter/search/page changes never blank the table.
- The page passes server data + the resolved filters down to the islands as props; islands own only interaction state (e.g. the controlled search input), never the list data.

## Section 2 — Data layer

File: `src/lib/articles-repository.ts` (+ `src/actions/articles.ts`, `prisma/schema.prisma`, one migration).

- **Ordering:** `getArticles` orders admin lists by `createdAt desc`, public lists by `publishedAt desc`:
  `orderBy: admin ? { createdAt: 'desc' } : { publishedAt: 'desc' }`.
- **`createdAt` in list items:** add `createdAt: true` to `listItemSelect`; add `createdAt: row.createdAt.toISOString()` in `toListItem`; add `createdAt: string` to the `ArticleListItem` type (`src/types`).
- **Multi-status filter:** add `statuses?: ArticleStatus[]` to `GetArticlesOptions` and handle in `buildArticleWhere`:
  - if `statuses?.length` → `conditions.push({ status: { in: statuses } })`
  - else keep existing single `status` behavior (public path unaffected).
    `countArticles` accepts the same filter shape.
- **Search:** broaden the OR to include `slug`:
  `OR: [ { title: contains q insensitive }, { titleEn: contains q insensitive }, { slug: contains q insensitive } ]`.
- **`listArticlesAdminAction`** signature: replace `status?: ArticleStatus | 'all'` with `statuses?: ArticleStatus[]` (empty/undefined = all). Maps to `getArticles`/`countArticles` via `statuses`. `getArticleStatusCounts` unchanged.

### Migration (`pg_trgm` + createdAt index)

A Prisma migration adding:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS articles_title_trgm_idx     ON articles USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS articles_title_en_trgm_idx  ON articles USING gin (title_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS articles_slug_trgm_idx      ON articles USING gin (slug gin_trgm_ops);
CREATE INDEX IF NOT EXISTS articles_created_at_idx      ON articles (created_at DESC);
```

`schema.prisma` gets a matching `@@index([createdAt(sort: Desc)])` so the schema reflects reality; the trgm GIN indexes are documented in the migration (kept as raw SQL since they need the `gin_trgm_ops` opclass). Run via `yarn db:migrate`; `yarn postinstall` after.

## Section 3 — UI

- **Clickable title:** the title text is a `<Link href={`/admin/posts/${row.id}`}>` (hover → primaryColor). The pencil action button stays for discoverability.
- **Created date under title:** second line shows `slug · <createdAt>` formatted with the existing locale-aware `toLocaleDateString` (`{ month:'short', day:'numeric', year:'numeric' }`). Slug stays mono; date in slate.
- **Status badges:** replace the status `<select>` with a row of toggle badges — Draft / Published / Archived — using existing `STATUS_STYLE` colors. Multi-select: clicking toggles membership; **none selected = All**. Encoded in URL as `?status=draft,published`. A "Clear"/all affordance resets.
- **Category** stays the existing single `<select>`.
- **Published column** retained unchanged.
- Styling stays within the admin system (primaryColor `#549fe3`, slate, existing card/table classes). All strings via existing/added `admin.dashboard.*` keys (EN + JA).

## Section 4 — URL param helpers + testing

- **`parseStatusesParam(v: string | null): ArticleStatus[]`** — splits comma list, keeps only valid statuses, dedupes; `null`/empty → `[]` (= all).
- **`serializeStatuses(statuses: ArticleStatus[]): string | null`** — comma-joins, or `null` when empty.
- These live in a small pure module (e.g. `src/lib/admin/dashboard-params.ts`) and get **Vitest unit tests** (valid/invalid/dup/empty, round-trip). The Server Component, DB query, and migration are verified via `yarn build` + manual check (no DB/React test harness).

## Components & boundaries

| Unit                           | Responsibility                                            | Depends on                          |
| ------------------------------ | --------------------------------------------------------- | ----------------------------------- |
| `dashboard/page.tsx` (server)  | Read searchParams, fetch data, render shell + table       | repository/action, islands          |
| `DashboardFilters` (client)    | Search + status badges + category; URL nav via transition | `dashboard-params`, next/navigation |
| `DashboardRowActions` (client) | Row mutations + refresh                                   | article server actions              |
| `DashboardPagination` (client) | Page nav                                                  | next/navigation                     |
| `dashboard-params.ts` (pure)   | Parse/serialize status multi-param                        | —                                   |
| `articles-repository.ts`       | Ordering branch, `statuses` filter, `createdAt`/`slug`    | Prisma                              |

## Success criteria

- Dashboard table is server-rendered on first paint; changing filters/search/page keeps the old rows visible (dimmed) with no skeleton swap.
- Posts ordered by `createdAt desc`; created date shown under each title beside the slug.
- Clicking a title opens its editor.
- Status filter is multi-select badges (URL-encoded); category remains a dropdown; Published column retained.
- Search matches title/titleEn/slug and is trgm-index-backed.
- `dashboard-params` unit tests pass; `yarn test`, `yarn type-check`, `yarn lint` clean; `yarn build` succeeds; migration applies.

## Follow-up (out of scope)

Clickable stat cards as filters; category badges; full-text (tsvector) ranked search; bulk row actions.
