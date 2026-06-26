# Bulk Legacy Import — Design

**Date:** 2026-06-26
**Status:** Approved (design); pending spec review
**Scope:** Add bulk import — paste many legacy URLs, extract them all, curate in a review queue, and commit only the accepted ones as drafts. Builds on the now-tested single-URL pipeline. Reuses existing server actions unchanged.

## Problem

Single-URL import (`src/app/admin/(protected)/import/ImportClient.tsx`) handles one article at a time: paste URL → ephemeral preview → commit creates a `draft`. Management needs to import batches. The hard parts the team raised:

1. **Preview for many** — can't show one full-screen preview per article.
2. **Reject without persisting** — rejected articles must never touch the DB.
3. **Don't make them re-search** — moving between the list and a preview must preserve all extracted work.

The ephemeral-preview pattern already solves #2: `previewImportAction` returns an in-memory payload; nothing is written until `commitImportAction`. Bulk scales this: extract N payloads, hold them client-side, curate, commit only the kept ones.

## Approach

A single client component drives the whole flow in-place (no route changes between phases, so #3 is satisfied by construction). Extraction and commit are **client-orchestrated with bounded concurrency**, reusing the existing per-URL server actions. The review UI is a **queue table with expandable inline preview rows**. Batch state is persisted to `sessionStorage` so a refresh/back-button never loses work.

## Non-goals

- No new server actions — reuse `previewImportAction` and `commitImportAction` as-is.
- No background job/queue infrastructure.
- No auto-translation (EN fields stay a manual post-import step, same as single import).
- No changes to extraction heuristics (that was the prior robustness spec).

## UI / styling constraints

- Must match the existing admin system: theme token **`primaryColor` (#549fe3)** for primary actions (`bg-primaryColor hover:bg-primaryHover`), slate palette, `bg-white rounded-lg border border-slate-200` cards, `max-w-*` centered containers — identical to `ImportClient.tsx`. **Do not introduce new accent colors** (the brainstorm mockup used indigo as a placeholder; real token is the blue above).
- All user-facing strings via `next-intl` under a new `admin.bulkImport.*` namespace in `messages/admin-en.json` and `messages/admin-ja.json`.
- Status colors map to existing semantic tokens: ready→`successColor`, error→`errorColor`, collision→`warningColor`.

## Routing & navigation

- New route: `src/app/admin/(protected)/import/bulk/page.tsx` rendering `BulkImportClient`.
- The existing single-import page gets a small link/toggle: **"Import multiple →"** → `/admin/import/bulk`; the bulk page links back **"← Single import"**. Both live under the existing `/admin/import` sidebar item.
- Within bulk, all phases (input → extracting → review → committing → summary) render in the same component. **Preview is an expandable row, not a route** — expanding/collapsing never refetches and never loses sibling rows.

## Data flow / phases

```
INPUT ──extract all (concurrency≤4)──▶ REVIEW ──commit selected (concurrency≤4)──▶ SUMMARY
  ▲ paste, validate                     │ curate: include/exclude, edit, expand-preview, retry
  └──────────── back / new batch ───────┘
```

1. **Input:** textarea, one legacy URL per line. Parse with `parseBulkUrls`: trim, drop blank lines, dedupe, validate each against `parseLegacyUrl`. Show valid count + a list of invalid lines (with reason) before extraction. "Extract N articles" button.
2. **Extraction:** for each valid URL, fire `previewImportAction(url)` through `mapWithConcurrency(urls, 4, …)`. Each row transitions `queued → extracting → ready | error`. Errors are isolated and carry the message; a per-row **Retry** re-runs just that URL.
3. **Review:** the queue table (below). User curates.
4. **Commit:** for each _included + ready_ row, fire `commitImportAction(payload)` through `mapWithConcurrency(rows, 4, …)`. Each row: `committing → committed (draftId) | commit-error`. Partial failures isolated; failed rows stay included for retry.
5. **Summary:** list every created draft with a link to `/admin/posts/{draftId}`, plus any commit failures. Buttons: "Start new batch" / "Back to dashboard".

## Review table (the core screen)

Columns: include checkbox · status badge · title · category · slug (+collision flag) · content summary (blocks/images/embeds) · row action (Preview ▾ / Retry).

- **Bulk actions bar:** summary counts (`N URLs · X ready · Y errors · Z collisions`), "Select all ready", "Deselect all", "Retry failed (Y)", and the primary **"Import N selected as drafts →"** (disabled while any selected row has an unresolved slug collision or while extraction is in flight).
- **Expandable preview row:** clicking Preview expands an inline panel reusing the shared `ImportPreviewFields` component — editable title, slug (with live availability re-check via `checkImportSlugAction`), excerpt, published date, tags, featured image, case-study meta — plus the rendered body preview (`BlockRenderer`). Edits mutate that row's payload in place.
- **Collision handling:** `previewImportAction` already returns `slugCollision` (DB check). Additionally compute **within-batch duplicate slugs** across ready rows and flag them the same way. A row with an unresolved collision cannot be committed (its checkbox shows a warning; the user edits the slug to resolve).

## Components & boundaries

| Unit                                   | Responsibility                                                                                                                                | Depends on                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `parseBulkUrls(text)`                  | Pure: lines → `{ valid: string[]; invalid: { line: string; reason: string }[] }`; dedupe, drop blanks, validate via `parseLegacyUrl`          | `parseLegacyUrl`                                                |
| `mapWithConcurrency(items, limit, fn)` | Pure async util: run `fn` over items, ≤`limit` in flight, returns settled results in order                                                    | —                                                               |
| `findDuplicateSlugs(rows)`             | Pure: returns the set of slugs that appear >1× among ready rows                                                                               | —                                                               |
| `bulkImportReducer` / state            | Rows keyed by URL with status machine; actions: addUrls, setStatus, setPayload, patchPayload, toggleInclude, setBatchInclude, setCommitResult | the pure helpers                                                |
| `BulkImportClient.tsx`                 | Orchestrates phases, concurrency, sessionStorage persistence                                                                                  | reducer, server actions, `ImportPreviewFields`, `BulkImportRow` |
| `BulkImportRow.tsx`                    | One table row + its expandable preview                                                                                                        | `ImportPreviewFields`, `BlockRenderer`                          |
| `ImportPreviewFields.tsx`              | **Extracted from `ImportClient.tsx`** — the editable metadata fields + body preview, shared by single import and bulk                         | `CaseStudyMetaFields`, `BlockRenderer`, `checkImportSlugAction` |
| `import/bulk/page.tsx`                 | Route wrapper                                                                                                                                 | `BulkImportClient`                                              |

**Targeted refactor:** `ImportClient.tsx` currently inlines its preview body (~230 lines). Extract the editable fields + body preview into `ImportPreviewFields.tsx` and have both single import and each bulk row consume it. This is in-scope because bulk needs exactly that panel; it also shrinks the oversized single-import file.

## State persistence (the "don't re-search" guarantee)

- The full batch (rows + payloads + include flags) is mirrored to `sessionStorage` under a versioned key (`cosbe.bulk-import.v1`) on every state change (debounced).
- On mount, `BulkImportClient` rehydrates from `sessionStorage` if present, so refresh/back-button restores the exact queue. Committed rows rehydrate as committed.
- Guard: if the serialized batch exceeds a size cap (~4 MB), skip persistence for that update and show a non-blocking note ("batch too large to auto-save"); the in-memory session still works.
- "Start new batch" clears the key.

## Error handling

- Invalid input lines: listed before extraction, never block valid ones.
- Extraction error (network/404/unsupported): row marked `error` with message; isolated; per-row Retry.
- Commit error (e.g. `ImageRehostError`, slug taken since preview): row marked `commit-error` with message; stays included; user retries or edits.
- Concurrency util never rejects the whole batch on one failure — each result is settled independently.

## Testing

Vitest, pure-logic only (the repo has no React testing harness; UI is verified manually). New tests:

- `parseBulkUrls`: dedupe, blank/whitespace lines, invalid host/segment reasons, mixed valid+invalid, order preservation of valid URLs.
- `mapWithConcurrency`: respects the limit (max concurrent observed ≤ limit), preserves result order, isolates rejections (one failure doesn't sink others), handles empty input.
- `findDuplicateSlugs`: none, some, all-duplicate; ignores non-ready rows.
- `bulkImportReducer`: status transitions, include toggling, batch include of ready-only, commit result recording.

Manual verification checklist (in the spec's follow-up): paste a real batch, confirm live statuses, expand/edit a row, resolve a collision, commit, land on summary with working draft links, refresh mid-review and confirm restore.

## Success criteria

- `/admin/import/bulk` reachable from the single-import page and back; styling indistinguishable from existing admin pages (primaryColor, slate, card patterns).
- Paste → extract (≤4 concurrent) → curate → commit (≤4 concurrent) → summary, all in one screen with no data loss between phases.
- Rejected/unchecked rows never hit the DB; committed rows are `draft` with working `/admin/posts/{id}` links.
- Slug collisions (DB + within-batch) block only the offending rows.
- Refresh during review restores the full batch from `sessionStorage`.
- Pure-logic unit tests pass; `yarn test`, `yarn type-check`, `yarn lint` clean.

## Follow-up (out of scope)

Auto-translation of imported articles during/after bulk commit; importing from a pasted two-column mapping; CSV upload.
