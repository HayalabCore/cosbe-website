# Legacy Import Robustness — Design

**Date:** 2026-06-26
**Status:** Approved (design); pending spec review
**Scope:** Harden the single-URL legacy import pipeline by building a test safety net. Bulk import is a deliberate follow-up spec, not covered here.

## Problem

The legacy importer (`src/lib/legacy-import/*`, `src/actions/legacy-import.ts`, `src/app/admin/(protected)/import/ImportClient.tsx`) works but is built on heuristic, theme-specific CSS selectors. There are **no tests for extraction** — the only import test (`url-guard.test.ts`) covers URL validation. Any selector tweak is a blind change with no regression safety.

The goal is **not** to rewrite the extractors. It is to make them safe to change: build a test net, expose the seam that makes extraction testable, then fix only what the tests prove is broken.

### Known concrete gaps (already identified)

1. **`/news/` is unsupported.** The legacy site serves news under `/news/`, but `PATH_SEGMENT_TO_CATEGORY` in `src/lib/legacy-import/types.ts` only maps `notice`. Pasting any `/news/...` URL throws `UnsupportedCategoryError` today.
2. **Listing URLs aren't articles.** URLs like `/category/case-studies/` appear in real link lists; capture tooling must skip/flag them rather than choke.

### Non-goals

- Rewriting or restructuring the extraction heuristics beyond what a failing test justifies.
- Auto-translation of imported content (EN fields remain a manual post-import step).
- Diffing extraction output against the live new-site articles — those have been **human-edited after import** (slugs renamed, e.g. `llmo-01` → `4-innovative-values-for-smb`; translations added), so they are not faithful expected output.
- Bulk import.

## Approach

Golden-fixture integration tests as the backbone, plus targeted unit tests for the gnarliest pure parsers. Requires a small testability refactor to decouple extraction from network/DB.

## Section 1 — Testability refactor (the seam)

`previewImport(url)` currently couples network fetch + parse + extract, so extraction can't be tested without hitting the live site. Split out a pure function:

```
previewImport(url)                       // unchanged public API + signature
  ├─ parseLegacyUrl(url)                 // already pure
  ├─ html = await fetchLegacyHtml(url)   // network — the only impure part
  └─ extractFromHtml(html, url)          // NEW: pure, fully testable
```

- **`extractFromHtml(html, url)`** lives in `src/lib/legacy-import/index.ts` (or a new `extract.ts`). It loads cheerio (`loadLegacyHtml`), resolves category via `parseLegacyUrl`, dispatches to the category extractor, and returns the `ImportPreviewPayload` **minus `slugCollision`**.
- `previewImport` keeps the network fetch and the DB-backed `slugCollision` lookup, layering them on top of `extractFromHtml`'s result.
- **No behavior change** to the live import path — pure structural extraction. `commitImportAction` is untouched.

## Section 2 — Fixtures

- **Location:** `src/lib/legacy-import/__fixtures__/<category>/<slug>.html` — full saved HTML of real legacy pages.
- **Capture script:** `scripts/capture-fixture.ts`, wired as `yarn capture-fixture <url>`. Reuses `fetchLegacyHtml`, derives category + slug via `parseLegacyUrl`, writes HTML to the correct folder. Makes "page imported wrong → save it as a permanent regression test" a one-command habit.
  - Must **skip/flag non-article URLs** (e.g. `/category/...` listings, unknown segments) with a clear message instead of erroring out.
- **Initial corpus (representative subset, ~15–20 files):** 3–4 pages per category across `case-study`, `useful-info`, `video`, `news`, plus any known-tricky pages. Sourced from the real JP→new URL mapping the team provided. The capture script makes expanding the corpus trivial later.
- **Repo-weight note:** these are full HTML snapshots of our own legacy content — acceptable to commit; subset keeps total size manageable.

## Section 3 — The tests

**Critical detail — non-deterministic IDs.** Content blocks get IDs from `generateId()` (random). Raw snapshots would be unstable. A shared **`normalizeForSnapshot(payload)`** helper strips/replaces every `id` field (and any other non-deterministic field) before assertion. Lives alongside the tests.

Two layers:

1. **Golden-fixture tests** — `src/lib/legacy-import/extract.fixtures.test.ts`
   For each fixture file: read HTML, run `extractFromHtml(html, syntheticUrl)`, then:
   - **Hard invariants (inline asserts):** non-empty `title`; `slug` equals the deterministic URL-derived slug; sane block count (> 0); **not** the fallback paragraph; expected block types present per category (e.g. `video` fixtures contain an `embed`; `case-study` fixtures yield `caseStudyMeta`).
   - **Snapshot:** `expect(normalizeForSnapshot(payload)).toMatchSnapshot()` on the normalized block tree + metadata. Selector tweaks then surface as an exact cross-fixture diff.

2. **Targeted unit tests** — for the fiddly pure parsers, with small synthetic HTML snippets:
   - `parseLegacyDate` (legacy date formats, `<time datetime>` vs text fallback)
   - `extractTable` (empty, header-less, missing `<tbody>`, caption)
   - `youtubeUrlFromText` (watch / embed / `youtu.be` variants; reject channel/user URLs)
   - `mergeConsecutiveParagraphs` + `isStandaloneCalloutParagraph`
   - image edge cases in `walkBlocks` (`data-src` lazy-load, `srcset`)

Run via existing `yarn test` (Vitest).

## Section 4 — Hardening (test-driven, scoped)

Only after the net is in place. Each extractor change is justified by a failing fixture or unit test and lands with the proving test. Expected first fixes:

1. **Add `news` → `notice`** to `PATH_SEGMENT_TO_CATEGORY` (keep `notice` too). Proven by a `/news/` fixture.
2. Any **`srcset`/lazy-image** handling gaps in `walkBlocks` that fixtures expose.

**Scope discipline:** no speculative rewrites. If a fixture extracts acceptably, leave the heuristic alone.

## Components & boundaries

| Unit                         | Responsibility                                      | Depends on                                   |
| ---------------------------- | --------------------------------------------------- | -------------------------------------------- |
| `extractFromHtml(html, url)` | Pure HTML → `ImportPreviewPayload` (no network/DB)  | cheerio, extractors, `parseLegacyUrl`        |
| `previewImport(url)`         | Orchestrate fetch + extract + slug check            | `fetchLegacyHtml`, `extractFromHtml`, prisma |
| `scripts/capture-fixture.ts` | Save real pages as fixtures; skip non-articles      | `fetchLegacyHtml`, `parseLegacyUrl`, fs      |
| `normalizeForSnapshot`       | Strip non-deterministic fields for stable snapshots | —                                            |
| `extract.fixtures.test.ts`   | Real-page regression coverage                       | fixtures, `extractFromHtml`                  |
| unit tests                   | Pin down tricky pure parsers                        | individual helpers                           |

## Success criteria

- `extractFromHtml` exists and is covered; `previewImport` behavior unchanged.
- `yarn capture-fixture <url>` saves a fixture and gracefully skips non-article URLs.
- ~15–20 committed fixtures across all four categories; each has passing invariant + snapshot tests.
- Targeted unit tests cover dates, tables, youtube, paragraph merge, and image edge cases.
- `/news/` URLs import successfully (gap #1 fixed, with a fixture proving it).
- `yarn test` green; `yarn type-check` and `yarn lint` clean.

## Follow-up (out of scope)

Bulk import + preview/reject flow — its own spec, building on the now-trustworthy extraction and the ephemeral-preview pattern (`commitImportAction` only writes to DB on explicit commit).
