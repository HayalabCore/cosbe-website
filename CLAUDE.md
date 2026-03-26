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
yarn import-article <url>   # Scrape and import legacy articles
```

Pre-commit hooks (Husky + lint-staged) run Prettier and ESLint on staged files automatically.

After editing `prisma/schema.prisma`, always run `yarn postinstall` to regenerate `@prisma/client` types. The IDE language server caches stale types and may show false errors until regenerated.

## Architecture

**Next.js 16 App Router** — bilingual (EN/JA) marketing site with a CMS admin dashboard.

### Routing

All public pages live under `src/app/[locale]/` and are always prefixed with `/en/` or `/ja/`. The default locale is English. Routing is powered by `next-intl` (see `src/i18n/routing.ts`).

Admin routes live under `src/app/admin/(protected)/` and require a Supabase session. Auth middleware is in `src/lib/supabase/middleware.ts`.

### Data Layer

- **Supabase (PostgreSQL)** via **Prisma** — single source of truth for all CMS content.
- `src/lib/articles.repository.ts` — all article queries (also re-exported via `src/lib/articles.ts`).
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

#### Repository functions (`src/lib/articles.repository.ts`)

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
