# Legacy Article Import — Admin CRM Feature

**Status:** Design approved, awaiting implementation plan
**Date:** 2026-06-23
**Author:** Brainstorm session with admin

## Problem

We have ~100+ articles, case studies, and videos on the legacy site `https://www.jp.cosbe.inc/` that need to be re-created in this CMS. Doing this by hand is slow and error-prone. The existing `yarn import-article <url>` CLI script handles a narrow subset (useful-info-shaped pages, no preview, auto-publishes, hot-links images, hardcodes category) and isn't usable for the case-study or useful-movie shapes.

We need an admin UI that:

1. Accepts a legacy URL.
2. Extracts content correctly for the three legacy shapes (case-studies, useful-info, useful-movie) and notice.
3. Lets an admin preview the extraction before anything hits the DB.
4. On confirmation, creates a **draft** Article (not published) with images rehosted to Supabase Storage, and drops the admin into the existing post editor to fine-tune and publish.

## Scope

In scope:

- New admin route `/admin/(protected)/import` (single page) and "Import" nav item.
- Server Actions `previewImport(url)` and `commitImport(payload)`.
- Category-specific extractors for `/case-studies/`, `/useful-info/`, `/useful-movie/`, `/notice/`.
- Image rehosting to Supabase Storage (`article-images/imported/<sha256>.<ext>`).
- New schema fields on `Article` for case-study client metadata.
- A reusable `<CaseStudyMetaFields>` component used by both the post editor and (later) any case-study creation flow.
- Optional, narrowly-scoped OpenAI rescue paths when deterministic extraction fails.

Out of scope (deferred):

- Bulk URL import (admin imports one at a time).
- Auto-translation to EN at import time (use the existing translate button in the post editor afterwards).
- `sourceUrl` column on `Article` / re-import / overwrite semantics.
- A `PendingImport` staging table.
- Automated cleanup of orphan storage objects / orphan drafts.
- Per-page author byline scraping (all observed pages credit the same author).
- Playwright/integration tests for the new screen.

## Architecture

### Two sub-projects, two PRs

The work splits cleanly into two implementation plans that should ship as separate PRs in order:

1. **Sub-project 1 — Case-study schema upgrade.** Prisma migration + type updates + post-editor field additions + public `/case-studies/[slug]` rendering changes. Does not touch import code. Lands first because Sub-project 2 depends on it.
2. **Sub-project 2 — Legacy import UI.** Everything else in this spec.

### High-level flow (Sub-project 2)

```
Admin pastes URL
       │
       ▼
previewImport(url)  ──── server action
       │             • fetch + cheerio
       │             • dispatch to category extractor
       │             • strip site chrome, parse metadata
       │             • emit ContentBlock[] (image URLs still remote)
       │             • detect slug collision
       │             • no DB writes, no image uploads yet
       ▼
ImportPreview screen  ──── client, edits a copy of the payload
       │             • category (read-only badge)
       │             • title, slug, excerpt, publishedAt, tags (editable)
       │             • caseStudyMeta fields if applicable (editable)
       │             • body blocks: READ-ONLY summary + counts + warnings
       │             • slug-collision warning if any
       ▼
commitImport(payload)  ──── server action
       │             • rehost featured image + every image block (Supabase storage,
       │               content-addressed sha256 filenames, 4-parallel)
       │             • upsertAuthor("Kenjiro Momi", "代表取締役社長") (default)
       │             • createArticleRecord({ status: 'draft', ... })
       │             • revalidateArticlePaths
       │             • returns { id }
       ▼
router.replace('/admin/posts/[id]')
       │
       ▼
Existing post editor — admin fine-tunes blocks, swaps images,
                       runs translate-to-EN, publishes.
```

No new database tables. Preview state lives entirely in client React state until the commit succeeds.

## Data layer

### Prisma schema additions (Sub-project 1)

```prisma
model Article {
  // ...existing fields...
  clientName       String?
  clientLocation   String?
  clientUrl        String?
  aiModels         String[]   @default([])
  mainChallenges   String?
}
```

Migration name: `add-case-study-fields`. All fields nullable / defaulted — no data backfill needed for existing articles. After migrate, run `yarn postinstall` to refresh `@prisma/client` types.

These fields are based on the **actual** `企業情報` panel observed on the two case-study samples:

- `clientName` ← `社名` (e.g. `KANDO（カンド）株式会社`, `CosBE incorporated`)
- `clientLocation` ← `所在地`
- `clientUrl` ← `URL` (anchor href, often blank in source)
- `aiModels` ← `導入AIモデル` (e.g. `["AIエージェント", "LLM（大規模言語モデル）"]`)
- `mainChallenges` ← `主な課題` (free-text sentence)

Earlier guesswork (`industry`, `companySize`, `results: Json`) was dropped after looking at real pages — none of those exist in the legacy data.

### TypeScript additions

In `src/types/index.ts`:

```ts
export interface CaseStudyMeta {
  clientName?: string;
  clientLocation?: string;
  clientUrl?: string;
  aiModels: string[];
  mainChallenges?: string;
}

// Article interface gets the same five fields, optional.
```

### Repository changes

`src/lib/articles-repository.ts`:

- Add the new fields to `Article` Prisma queries by default (Prisma includes them automatically).
- Add `clientName` to `listItemSelect` so case-study cards on `/case-studies/` can show client name.
- No new repository functions needed.

### `ContentBlock` types — already sufficient

The existing block types cover everything observed in the legacy pages, including a `TableBlock`. No new block types needed:

| Legacy element              | Block type                                  |
| --------------------------- | ------------------------------------------- |
| h2/h3/h4                    | `heading`                                   |
| `<p>` with bold/links       | `paragraph` (content stores sanitized HTML) |
| `<ul>`/`<ol>`               | `list`                                      |
| `<blockquote>`              | `quote`                                     |
| `<table>`                   | `table`                                     |
| `<img>`                     | `image`                                     |
| YouTube `<iframe>` / oembed | `embed` (`embedType: 'youtube'`)            |
| `<hr>`                      | `divider`                                   |
| "この記事で分かること" list | `callout` (`variant: 'tip'`)                |

Existing scraper bug: `ParagraphBlock.content` is declared HTML, but the current CLI script uses `.text()` and destroys inline formatting. The new extractor emits a sanitized HTML subset (`<strong>`, `<em>`, `<a>`, `<br>`) instead.

## UI

### Route

```
src/app/admin/(protected)/import/
├── page.tsx                  # server component, gated by existing protected layout
├── ImportClient.tsx          # client, holds the state machine
└── components/
    ├── UrlInputForm.tsx      # step 1
    ├── ImportPreview.tsx     # step 2
    └── ImportError.tsx       # error states
```

Add an "Import" nav item to `AdminProtectedShell` between "Posts" and "Media".

### State machine (client-only)

```
idle ──submit URL──▶ fetching ──ok──▶ previewing ──submit──▶ committing ──ok──▶ redirect to editor
                          │                  │                       │
                          └── error ──▶ error_view ◀── error ────────┘
```

### Step 1 — `UrlInputForm`

- Single `<input type="url">` constrained to `https://www.jp.cosbe.inc/...`.
- Live "Detected category" label below the input (pure client-side path parse).
- Submit button disabled until URL is valid and matches a known category prefix.
- On submit, calls `previewImport(url)`.

### Step 2 — `ImportPreview`

Two-column layout.

**Left column — header metadata, all inline-editable:**

- Category (read-only badge — derived from URL; admin can change in the post editor later if needed, but the importer doesn't allow changing it here because the case-study extractor's output only makes sense for `case-study`).
- Title
- Slug — with inline slug-collision warning if `payload.slugCollision` is true: _"An article with this slug already exists. [View it]. Choose a different slug or change it after commit."_
- Excerpt
- Published date (date picker, prefilled from `YYYY年M月D日` parse)
- Tags (chip input)
- Author (read-only display of default `Kenjiro Momi / 代表取締役社長`; admin changes in post editor afterwards)
- Featured image (preview of remote URL + "Remove" button; note "Will be uploaded to Supabase Storage on commit")

**Right column — body, read-only summary:**

- Counts header: "23 blocks · 4 images · 2 tables · 1 callout"
- Renders extracted `ContentBlock[]` in a lightweight preview (same renderer the public site uses or admin-only equivalent).
- Catch-all paragraphs and LLM-rescued sections are highlighted with a yellow border + tooltip explaining why.
- `warnings: string[]` shown at the top in a yellow info panel.

**Conditional case-study panel** (when `category === 'case-study'`):

- Renders `<CaseStudyMetaFields>` — same component used by the post editor. All five fields editable.

**Footer actions:**

- `Cancel` → back to step 1, discard payload.
- `Re-fetch` → re-run `previewImport` (in case admin updated the legacy page).
- `Create draft` (primary) → calls `commitImport(payload)`. Single spinner with the message _"Importing… (this may take 20–30s due to image upload)"_. Disabled while in flight.

### Step 3 — Success

On `commitImport` success, server returns `{ id }`, client navigates to `/admin/posts/[id]`. Draft is `status: 'draft'`, so it appears under drafts in the existing admin posts list. Admin finishes editing and publishes there.

### Error handling

Three classes, surfaced differently:

1. **Client-side validation** (invalid URL, wrong host, unknown category prefix) — inline form error, no Server Action call.
2. **`previewImport` failure** (404, timeout, totally unrecognized structure) — `<ImportError>` with the URL, the error message, and a "Retry" button.
3. **`commitImport` failure** (storage upload error, DB constraint race on slug, etc.) — toast on top of the preview screen; payload is preserved so admin can edit + retry. Idempotent image filenames mean retry doesn't dupe storage objects.

### Authorization

The `(protected)/` layout already enforces a Supabase session. Both Server Actions also do their own `createServerSupabaseClient().auth.getUser()` check (matching the pattern in `src/actions/articles.ts`) for defense in depth.

## Extractor internals

### Module layout

```
src/lib/legacy-import/
├── index.ts              # previewImport(url) entry point
├── fetch.ts              # axios fetch + cheerio load + chrome stripping
├── shared.ts             # shared block walker (heading, paragraph→HTML, list, table, image, embed, divider)
├── extractors/
│   ├── case-study.ts
│   ├── useful-info.ts
│   ├── video.ts
│   └── notice.ts
├── rescue.ts             # narrow OpenAI fallbacks (see below)
├── date.ts               # parseLegacyDate("2024年8月31日") → ISO
├── taxonomy.ts           # splitTaxonomy(rawConcat) → string[]
├── html-sanitize.ts      # sanitize paragraph content to <strong><em><a href><br>
├── types.ts              # ImportPreviewPayload, ExtractorResult, etc.
└── __tests__/            # see "Testing"
```

### Dispatch

`previewImport(url)`:

1. Parse URL. Validate host is `www.jp.cosbe.inc`.
2. Read the first path segment.
3. Look up extractor by segment:

   ```ts
   const dispatch = {
     'case-studies': extractCaseStudy,
     'useful-info': extractUsefulInfo,
     'useful-movie': extractVideo,
     notice: extractNotice,
   };
   ```

4. Unknown segment → throw `UnsupportedCategoryError`.

### Shared pipeline (each extractor follows it)

1. Fetch raw HTML (30s timeout, retries on 5xx, `User-Agent: CosBE-Importer/1.0`).
2. Strip site chrome by selector + heading-text matchers (`MENU`, share widgets, `この記事を書いた人`, `関連記事`, CTA footers, mobile TOC drawer, etc.).
3. Locate content root: `<article>` → fallback `.entry-content` → fallback `<main>`.
4. **Extract metadata before stripping it:**
   - Title: H1 inside article → fallback `og:title`.
   - Date: regex `\d{4}年\d{1,2}月\d{1,2}日` near title → `parseLegacyDate()`.
   - Taxonomy: text right under title → `splitTaxonomy()` against known vocab.
   - Featured image: `og:image` → fallback first `<img>` in article.
   - Excerpt: `<meta name="description">` → fallback `og:description` → LLM rescue (see below) if both missing.
5. Run the category-specific walker over the cleaned content root.
6. Post-process: drop empty blocks, collapse consecutive headings, dedupe featured image when it also appears as the first inline image.
7. Slug = last URL path segment.
8. Check `slugCollision` via Prisma `findUnique`.
9. Return `ImportPreviewPayload`.

### Block walker (shared)

| Tag                       | Emits                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `h2`/`h3`/`h4`            | `heading`                                                                                |
| `p`                       | `paragraph` with sanitized HTML content. Drop empty.                                     |
| `ul`/`ol`                 | `list`, items via `.text().trim()`                                                       |
| `blockquote`              | `quote`                                                                                  |
| `img`                     | `image` with **remote URL** (resolved against base). Rehost happens at commit time.      |
| `table`                   | `table` — `<thead><tr><th>` → `headers`; rest → `rows: string[][]`. Handle `<caption>`.  |
| `iframe`/`oembed` YouTube | `embed` (`embedType: 'youtube'`, URL normalized to `https://www.youtube.com/watch?v=ID`) |
| `hr`                      | `divider`                                                                                |
| anything else             | Skipped; added to `warnings: string[]` for visibility in preview                         |

### Category-specific logic

**`extractCaseStudy`:**

- Before block-walking, find the `企業情報` panel (search `<h4>`/`<dl>` text `企業情報`).
- Parse as definition pairs, map labels (`社名`, `所在地`, `URL`, `導入AIモデル`, `主な課題`) to `caseStudyMeta` fields.
- If structured parse recovers `< 3` fields, invoke `rescueCompanyInfo(panelHtml)` (LLM fallback — see below).
- Remove the panel from the tree.
- Run shared walker on the rest. The H2 structure (`課題の背景` / `ソリューションの概要` / `導入効果` / `まとめ`) is consistent across observed samples; no special handling needed — they become regular `heading` blocks.

**`extractUsefulInfo`:**

- Detect `この記事で分かること` callout: find heading with that exact text → consume the following `<ul>` → emit a `callout` block (`variant: 'tip'`, `title: 'この記事で分かること'`, `content: HTML(ul)`). Remove both from the tree.
- Detect `あわせて読みたい` cross-link cards (by class or by link-card structure) → remove from the tree without emitting (they point to legacy URLs we're not migrating).
- Run shared walker on the rest.

**`extractVideo`:**

- Same walker, but also scan the entire `<article>` for `iframe[src*="youtube.com"]`, `iframe[src*="youtu.be"]`, or `oembed[url*="youtube"]`. Emit a single `embed` block at its in-document position.
- If none found, surface a warning: _"Couldn't locate the video embed — paste the URL manually after commit."_

**`extractNotice`:** just the shared walker.

### `ImportPreviewPayload` shape

```ts
type ImportPreviewPayload = {
  sourceUrl: string;
  category: 'case-study' | 'useful-info' | 'video' | 'notice';
  slug: string;
  slugCollision: boolean;
  title: string;
  excerpt: string;
  featuredImageRemoteUrl: string | null;
  publishedAt: string; // ISO
  tags: string[];
  blocks: ContentBlock[]; // image blocks still hold remote URLs
  caseStudyMeta?: CaseStudyMeta;
  warnings: string[];
};
```

### Date parser

```ts
function parseLegacyDate(text: string): string | null {
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d)).toISOString();
}
```

### Taxonomy splitter

```ts
const KNOWN_TAGS = [
  '導入事例',
  '人材・組織改善',
  'お役立ち情報',
  'お役立ち動画',
  // grow as new taxonomies appear
];

function splitTaxonomy(raw: string): string[] {
  const found: string[] = [];
  let remaining = raw;
  for (const tag of KNOWN_TAGS.sort((a, b) => b.length - a.length)) {
    if (remaining.includes(tag)) {
      found.push(tag);
      remaining = remaining.replace(tag, '');
    }
  }
  if (remaining.trim()) found.push(remaining.trim());
  return found;
}
```

Longest-first matching avoids `導入事例` consuming a prefix of a longer tag.

### HTML sanitizer

In-house, cheerio-based, allowlist of `strong`, `em`, `b`→`strong`, `i`→`em`, `a` (`href` only, reject `javascript:`, add `rel="noopener noreferrer"` if external), `br`. Strip all other tags, keep their text. Returns a string.

## Image rehosting (commit phase)

In `commitImport`:

1. Collect all remote image URLs: `featuredImageRemoteUrl` + every `image` block's `url`.
2. For each, `axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })`.
3. **Verify `Content-Type` starts with `image/`** before uploading. If not (e.g. server returned HTML 200), skip with a warning, leave the remote URL in place.
4. Upload to `article-images/imported/<sha256(buffer).slice(0,16)>.<ext>` using `src/lib/storage.ts`. Content-addressed filenames make uploads idempotent:
   - Duplicate images (same logo reused) share one storage object.
   - Re-running commit after a partial failure won't create dupes.
5. Replace remote URLs with the returned public URLs in the payload (`featuredImage` + each `image` block's `url`).
6. Concurrency: `p-limit(4)` to avoid hammering jp.cosbe.inc.
7. Per-image failure: log + warning, leave remote URL, continue. Don't fail the whole commit.
8. Only hard-fail if ALL images failed → likely a network problem; abort and let admin retry.
9. After image step: `upsertAuthor("Kenjiro Momi", "代表取締役社長")`, `createArticleRecord({ status: 'draft', ... })`, `revalidateArticlePaths`.

## OpenAI rescue (narrow, gated, defaults on in prod)

Three specific rescue paths in `rescue.ts`. Each is triggered ONLY when deterministic extraction fails or produces low-quality output. The happy path for the 5 sample URLs never invokes OpenAI.

1. **`rescueBlocks(html)`** — when the walker produces zero structured blocks (or only the giant catch-all paragraph), prompt OpenAI with structured outputs (`response_format: json_schema`) to convert the article HTML into a `ContentBlock[]` matching a schema. Output goes through the same sanitizer as scripted output. Surface a warning: _"AI rescue used to parse this article — please review carefully."_
2. **`rescueCompanyInfo(panelHtml)`** — when case-study panel parsing recovers `< 3` of the 5 expected fields, prompt OpenAI with the panel HTML and a JSON schema of the 5 fields.
3. **`rescueExcerpt(blocks)`** — when both `meta[name=description]` and `og:description` are empty, generate a 1-sentence Japanese excerpt from the first few paragraphs.

Reuses the existing OpenAI client pattern from `src/actions/block-translation.ts` (same SDK, same `OPENAI_API_KEY`/`OPENAI_MODEL` env vars, default `gpt-4o-mini`).

Config flag `LEGACY_IMPORT_LLM_RESCUE=1` (default `1` in prod, `0` in tests) so happy-path unit tests stay deterministic without mocking OpenAI.

What we **don't** use LLM for: tables, lists, headings, images, code, embeds, HTML sanitization, image URLs, taxonomy splitting, or anything on the happy path of the 5 known URL shapes. Determinism, cost, and latency reasons.

## Reusing the new extractor library from the CLI

Refactor `scripts/import-article.ts` to call `previewImport()` + a CLI-only commit (skipping the UI, optionally with `--publish` flag). One source of truth for extraction logic — no duplicated cheerio code between the CLI and the admin importer.

## Testing

**Unit tests** (Vitest if no test runner is present; otherwise match existing):

```
src/lib/legacy-import/__tests__/
├── fixtures/
│   ├── case-study-kando.html
│   ├── case-study-cosbe.html
│   ├── useful-info-llmo-15.html
│   ├── useful-info-llmo-10.html
│   └── useful-movie-019.html
├── case-study.test.ts
├── useful-info.test.ts
├── video.test.ts
├── shared.test.ts           # block walker, html sanitizer, taxonomy, date
└── rescue.test.ts           # uses mocked OpenAI responses
```

Each extractor test snapshots: `title`, `slug`, `publishedAt`, `tags`, `caseStudyMeta`, `blocks` (inline snapshot), `warnings`.

Fixtures = raw HTML downloaded once and committed. A `yarn import:refresh-fixtures` script re-downloads them when the legacy site changes.

Targeted utility tests for `parseLegacyDate`, `splitTaxonomy`, `htmlSanitize` (security cases: `<script>`, `javascript:` URLs, nested formatting), and `tableExtractor` (no thead, with caption, empty cells).

**No e2e for the import UI in v1** — manual QA.

**Manual QA checklist** before merging Sub-project 2:

1. Import each of the 5 sample URLs; verify draft renders correctly in the editor and on the (preview) public page.
2. Import the same URL twice; verify slug-collision warning.
3. Open Supabase Storage; verify rehosted images at `article-images/imported/<sha>.ext`.
4. Throttle to offline during commit; verify error UI + retry.
5. Import a useful-info article with a table; verify table renders in admin + public.
6. Verify the case-study public page renders the `企業情報` panel.

## Sequencing

### Sub-project 1 — Case-study schema upgrade (Sub-PR 1)

1. Add fields to `prisma/schema.prisma`.
2. `yarn db:migrate add-case-study-fields`, then `yarn postinstall`.
3. Update `Article` type in `src/types/index.ts` and `CaseStudyMeta` interface.
4. Add `clientName` to `listItemSelect` in `articles-repository.ts`.
5. Build `<CaseStudyMetaFields>` component (admin/shared).
6. Wire into `PostEditor` as a conditional section when `category === 'case-study'`.
7. Update `createArticleAction` / `updateArticleAction` payloads + repository `createArticleRecord` / `updateArticleRecord` to accept the new fields.
8. Update `/case-studies/[slug]/page.tsx` to render an `企業情報` panel above the body when any field is set.
9. Update `messages/admin-{en,ja}.json` with new labels.
10. Manual QA: create/edit a case-study, verify round-trip and public render.

### Sub-project 2 — Legacy import UI (Sub-PR 2, depends on Sub-PR 1)

1. Build `src/lib/legacy-import/` (walker, extractors, sanitizer, date, taxonomy, types). Full unit-test coverage against the 5 fixtures.
2. Add narrow `rescue.ts` paths + tests with mocked OpenAI responses.
3. Refactor `scripts/import-article.ts` to use the new library.
4. Add Server Actions `previewImport(url)` and `commitImport(payload)` in `src/actions/legacy-import.ts`.
5. Add Supabase Storage rehosting (content-addressed sha256 filenames, 4-parallel via `p-limit`).
6. Build admin route + components (`ImportClient`, `UrlInputForm`, `ImportPreview`, `ImportError`).
7. Add "Import" nav item to `AdminProtectedShell`.
8. Update `messages/admin-{en,ja}.json` for the new screen.
9. Manual QA via the checklist above.

## Open risks

| Risk                                                        | Mitigation                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Legacy HTML template drifts and extractors break silently   | `warnings: string[]` surfaced in preview; snapshot tests catch regressions on fixture refresh    |
| YouTube embed represented as oembed placeholder, not iframe | Extractor checks both; warns if neither found rather than failing                                |
| Tables with `colspan`/`rowspan`                             | Emit a warning + best-effort fill; admin fixes manually in the editor                            |
| jp.cosbe.inc rate-limits or blocks the importer             | Short timeouts, `p-limit(4)`, normal UA; volume is naturally low (admin-triggered)               |
| Orphan storage objects when admin abandons after import     | Content-addressed names prevent dupes; defer cleanup job until storage cost becomes a real issue |
| Image URLs that return HTML/redirect to login               | Verify `Content-Type` starts with `image/` before upload; skip with warning if not               |
| LLM rescue produces inconsistent output                     | Gated behind explicit triggers only; warnings tell admin to review; happy path never calls LLM   |
| Slug collision race between preview and commit              | Commit re-checks; returns typed `SlugCollisionError`; admin edits slug and retries               |

## Deferred (explicit non-goals)

- Bulk URL import.
- Per-page author byline scraping.
- Auto-translation to EN at import time.
- `sourceUrl` column / re-import / overwrite.
- `PendingImport` staging table.
- Cleanup jobs for orphan drafts/storage.
- Playwright tests for the import UI.
