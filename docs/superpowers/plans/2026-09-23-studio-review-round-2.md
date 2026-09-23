# Content Studio review round 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the correctness, robustness and spec-alignment problems found by the five-part review of `feat/content-studio` (P1a–P1c-2 plus two fix commits), so the branch is safe to merge.

**Architecture:** No new subsystems. Every fix lands in the module that owns the behaviour: stage rules stay pure in `src/generator/pieces/stages.ts`; the fence and locks in `piece-lock.ts` stay the only write path; retrieval stays behind `src/generator/retrieval/search.ts`. Two migrations add columns and nothing destructive.

**Tech Stack:** Next.js 16, Prisma 6.19, Postgres 17 (pgvector 0.8.2, PGroonga 3.2.5), pg-boss 12, AI SDK 7, Zod 4, Vitest 4, next-intl.

**Spec:** `docs/superpowers/specs/2026-09-22-content-studio-design.md`

**Builds on:** `feat/content-studio` at `cd44e39`. Stack as the next commit on the same branch (the user commits).

## Global Constraints

- **Do not run `git add`/`git commit`.** The user commits.
- **Never run migrations, scripts or DB tests against the Supabase database in `.env`.** Local test DB only: container `cosbe-studio-test-pg` (`supabase/postgres:17.6.1.175`, port 55432, database `cosbe_test`). Put URLs inline in every command:
  `DATABASE_URL='postgresql://postgres:postgres@localhost:55432/cosbe_test?schema=public' DIRECT_URL='postgresql://postgres:postgres@localhost:55432/cosbe_test?schema=public'`
- Engine code (`src/generator/**`, `src/ai/**`, `worker/**`) must not import Next.js, UI, actions, `@/lib/authz`, `@/lib/supabase/server`, `server-only`, or any module that imports them.
- Lock order is piece before run. AI calls never run inside a transaction. Every worker write goes through `writePiece`.
- New migrations are additive only (nothing on this branch has been deployed, but developer databases have the earlier migrations applied; never edit an applied migration).
- All admin copy in both `messages/admin-en.json` and `messages/admin-ja.json`, under `admin.studio`.
- After editing `prisma/schema.prisma`, run `yarn postinstall`.
- Verification per task: the task's own tests, then `yarn type-check`. Final task runs everything.

## Decisions on spec departures

The review listed departures from the spec. Each is settled here; Task 13 edits the spec in place to match.

| Departure                                                                                                                                                                                  | Decision                                                       | Why                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `studio_run_steps` has no `prompt_version`, `tokens_in`, `tokens_out` (§3, §5)                                                                                                             | **Build it** (Task 8)                                          | The P2 quality baseline needs per-step cost and prompt version; adding columns is cheapest while tables are empty.                                                                                       |
| Writer and finish get only `brief.goal` (§4.4)                                                                                                                                             | **Build it** (Task 8)                                          | Tone, audience and keywords a user sets must reach the prose and the SEO. The outline already passes them.                                                                                               |
| Stage-rule reasons, snapshot reasons and run errors shown in English (§6 "All studio UI strings are translated")                                                                           | **Build it** (Task 11)                                         | The editors are Japanese; English-only error text breaks the spec's explicit rule.                                                                                                                       |
| Digest uses the strong model (§5 says small)                                                                                                                                               | **Keep; update spec**                                          | P1c-1 measured a thin digest dropping facts with the small model, which is the "doesn't use the notes" failure. Quality beats the cost difference.                                                       |
| Workspace route `/admin/studio/pieces/[id]` (§6 says `/admin/studio/[pieceId]`)                                                                                                            | **Keep; update spec**                                          | Avoids clashing with `projects`, `library`, `templates` segments.                                                                                                                                        |
| §6 features not built: piece list filters, re-pointing a section's sources, add-to-library from the Sources panel, rail "Translate needs re-run" marker, sections appearing during Writing | **Defer to plan P1c-3 (workspace completion); record in spec** | These are features, not defects. Bundling them with correctness fixes would make this change unreviewable. Re-pointing sources also needs a chunk picker that P1d's `setSectionSources` tool will share. |
| Numeric length warning (§4.3)                                                                                                                                                              | **Already built**                                              | `planOutline` adds a gap when the material supports < 80% of the target (`outline.ts:106`). The reviewer missed it; no work.                                                                             |
| Realtime progress                                                                                                                                                                          | **Unchanged**                                                  | Spec already makes polling the first implementation.                                                                                                                                                     |

## Review Focus

Failure modes no existing test exercises, most likely first. Each has a test in its owning task.

1. A write run that fails (not cancels) half way → piece must land in `outline` with written sections kept, never in `review` or stuck in `writing` (Task 1).
2. A source unlinked from the project while pieces still select it → editing sources and starting an outline still work (Task 2).
3. Model-written heading with `(`, `"`, `OR` or `-` used as the keyword query → retrieval succeeds (Task 5).
4. A project scope of a few sources inside a library whose other chunks are nearer the query → semantic search still returns the in-scope chunks (Task 5).
5. A 400,000-character Japanese text source → accepted by the action and ingested within its ceiling and job expiry (Task 6).

---

### Task 1: Piece completeness and stage settlement

Nothing checks that every outline section is written and fresh. Cancelling a write moves to `review` when any section exists; a failed run leaves the stage at `writing`/`translating` forever; translate and handoff accept half-written pieces.

**Rule (single source of truth, pure):**

- `isComplete(p)` — `p.outline.length > 0`, every outline section is not `stale` and has a section with the same `outlineId`, and `p.excerpt !== null` (the finish step ran).
- `isTranslated(p)` — `p.titleEn` non-empty and every section has `en !== null && !enStale`.
- `settledStage(p)` — for a piece left in a transient stage by a run that ended without finishing:
  - `writing` → `isComplete ? 'review' : 'outline'`
  - `translating` → `!isComplete ? 'outline' : isTranslated ? 'ready' : 'review'`
  - any other stage → unchanged.

**Files:**

- Modify: `src/generator/pieces/stages.ts` (add `isComplete`, `isTranslated`, `settledStage`; tighten `canTranslate`, `canHandOff`)
- Modify: `src/generator/runs/runs-repository.ts:85-160` (`markRunFailed` and `cancelPieceRun` both call one `settlePiece(tx, pieceId)`; delete the snapshot-stage lookup)
- Modify: `src/generator/executors/rewrite-section.ts` (a rewrite in `ready` moves the piece to `review`, because EN is now stale for that section)
- Modify: `src/actions/studio-pieces.ts` `startRunAction`/`createDraftPostAction` callers need no change beyond the new rule signatures
- Test: `src/generator/pieces/stages.test.ts`, `src/generator/runs/runs-repository.db.test.ts`, `src/generator/executors/cancel-restore.test.ts`

**Interfaces:**

- Produces:
  ```ts
  type CompletenessInput = Pick<PieceData, 'outline' | 'sections' | 'excerpt'>;
  export function isComplete(p: CompletenessInput): boolean;
  export function isTranslated(
    p: Pick<PieceData, 'sections' | 'titleEn'>
  ): boolean;
  export function settledStage(
    p: Pick<PieceData, 'stage' | 'outline' | 'sections' | 'excerpt' | 'titleEn'>
  ): PieceStage;
  export function canTranslate(p: CompletenessInput): BlockReason | null; // 'INCOMPLETE'
  export function canHandOff(
    p: CompletenessInput & { stage: PieceStage; title: string }
  ): BlockReason | null;
  ```
  `BlockReason` is introduced in Task 11; until then these return the English strings they return today, with the new check returning `'Finish writing every section first.'`. Task 11 converts all of them at once.
- `settlePiece(tx, pieceId)` in `runs-repository.ts` (not exported): reads the piece with `readPiece`, and if `settledStage` differs from the stored stage, updates it. Called under the piece lock.

- [x] **Step 1: Write failing unit tests** in `stages.test.ts`:
  - `isComplete` false when one outline section has no written section; false when an outline row is `stale`; false when `excerpt` is null; true when all written, fresh and excerpt set.
  - `settledStage({stage:'writing', …incomplete})` → `'outline'`; complete → `'review'`.
  - `settledStage({stage:'translating', complete, one section en null})` → `'review'`; all translated with `titleEn` → `'ready'`; incomplete → `'outline'`.
  - `settledStage({stage:'review'})` → `'review'` (untouched).
  - `canTranslate` blocks an incomplete piece; `canHandOff` blocks stage `review` with an incomplete piece.
- [x] **Step 2: Write failing DB tests** in `runs-repository.db.test.ts` (local DB):
  - Piece in `writing` with 1 of 2 sections, running write run → `markRunFailed(run.id, 'boom')` → stage `outline`, sections still length 1.
  - Same piece, `cancelPieceRuns` → stage `outline` (previously `review`).
  - Piece in `translating`, complete, half translated → `markRunFailed` → `review`.
  - Ingest run failure still fails the source (existing behaviour kept).
- [x] **Step 3: Run** `ADMIN_TEST_DB=1 <urls> yarn vitest run --project db src/generator/runs/runs-repository.db.test.ts` and `yarn vitest run src/generator/pieces/stages.test.ts` — expect the new cases to FAIL.
- [x] **Step 4: Implement.** In `markRunFailed`, inside the existing transaction, when `count === 1 && run.pieceId`: `await lockPiece(tx, run.pieceId)` must come **before** the run `updateMany` to keep piece-before-run order — restructure to: read `run.pieceId`; if present, `lockPiece` first; then update the run; then `settlePiece`. `cancelPieceRun` replaces its snapshot branch with `settlePiece(tx, pieceId)`. In `rewrite-section.ts`, after `saveSection`, `if (piece.stage === 'ready') await setStage(piece.id, 'review', run.id)`.
- [x] **Step 5: Run the tests again** — PASS. Update `cancel-restore.test.ts` expectations that encoded the old "writing with sections → review" rule.

### Task 2: Selection robustness (unlinked sources, empty chapter ticks)

A source unlinked from the project stays in `piece.selection.sourceIds` where the Sources panel cannot untick it, so every save returns `INVALID_INPUT` (silently) and `canStartOutline` blocks forever. Unticking every chapter stores `chapters[id] = []`, which `buildScope` reads as "whole source".

**Rules:**

- The stored selection may contain ids that are no longer linked; they are ignored everywhere (`buildScope` already drops them).
- `updatePieceSetupAction`: drop unlinked ids that were already in the stored selection; reject (`INVALID_INPUT`) only ids that are newly added and not linked. Drop `chapters` keys for sources not in the resulting `sourceIds`.
- `canStartOutline(p, sources)`: require at least one selected id that is linked **and** ready; no longer fail because a stale id is present.
- `chapters[id]` present and empty means "no chapter" → `buildScope` omits that source (fail closed). The UI never produces it (unticking the last chapter deselects the source).

**Files:**

- Modify: `src/actions/studio-pieces.ts:199-263` (replace `selectionInProject` with `normalizeSelection(projectId, next, previous): Selection | 'INVALID'`)
- Modify: `src/generator/pieces/stages.ts:20-40`
- Modify: `src/generator/pieces/scope.ts:29-31` (`if (ticked === undefined) continue; if (ticked.length === 0) { omit.add(row.id); continue; }`)
- Modify: `src/components/admin/studio/pieces/SourcesPanel.tsx` (filter initial `selected` to listed sources once loaded; unticking the last chapter deselects the source; show save errors)
- Test: `src/actions/studio-pieces.test.ts`, `src/actions/studio-piece-integrity.db.test.ts`, `src/generator/pieces/scope.db.test.ts`, `src/generator/pieces/stages.test.ts`

- [x] **Step 1: Failing tests.**
  - Action unit test: stored selection `[A, B]`, project links only `A` and `C`, save `{sourceIds: [A, B, C]}` → ok, stored `[A, C]`. Save `{sourceIds: [A, D]}` with D unlinked and not previously selected → `INVALID_INPUT`.
  - `canStartOutline({selection:[A, B]}, sources=[{A ready}])` → null (B unlinked is ignored); `sources=[{A processing}]` → not-ready reason.
  - Scope DB test: `chapters: { [A]: [] }` → `buildScope` returns no `A`.
- [x] **Step 2: Run, expect FAIL.**
- [x] **Step 3: Implement** the three server rules and the panel change. The panel's `save()` shows `errorText(t, result)` like `OutlinePanel`.
- [x] **Step 4: Run, expect PASS.**

### Task 3: Grounding hardening

`validateSection` passes a `source` section with no cited sentence (only `heading3` blocks, or empty `sentences`/`items`). A `source` section whose planned chunks all left the scope is written from an empty `<material>`. Unknown citation ids (`unknown:c9`) are stored and break the citation popover. The repair always replaces the draft even when worse. The connective heuristic flags `AI`, `DX` and common katakana nouns.

**Rules:**

- `validateSection` adds: a block with an empty `sentences`/`items` array is a violation (`'A block has no text.'`); a `source` section must contain at least one cited sentence or a cited table (`'The section cites no source passage.'`).
- `chunksForSection`: for `kind === 'source'`, if no planned chunk is in scope, throw `NonRetryableRunError('「<heading>」 has no source passages in the current selection. Edit the outline or the sources.')` before any model call. (Task 1 then settles the stage to `outline`.)
- `writeSection`: keep the version (draft or repair) with fewer violations; after the final validation strip ids that are not in `allowedIds` (violations already recorded as flags).
- Connective check: remove known terms before testing for proper nouns. Known terms = every outline heading, the section intent and `brief.keywords`. Also change `PROPER_NOUN` to `/\b[A-Z][a-z]+|[ァ-ヺー]{5,}/` so two-letter acronyms (`AI`, `DX`, `IT`) are not treated as names.
- `<material>`: escape `</material>` inside chunk text as `<\/material>` in both `write-section.ts` and `outline.ts`.

**Files:**

- Modify: `src/generator/pieces/grounding.ts` (new `opts.knownTerms?: string[]`)
- Modify: `src/generator/pieces/write-section.ts`
- Modify: `src/generator/pieces/outline.ts:56-63`
- Modify: `src/generator/executors/write.ts:27-54`
- Test: `src/generator/pieces/grounding.test.ts`, `src/generator/pieces/write-section.test.ts`, `src/generator/executors/cancel-restore.test.ts` (or a new `write.test.ts` if simpler)

- [x] **Step 1: Failing tests.**
  - `validateSection([{type:'heading3',text:'x'}], {kind:'source'})` → contains `'The section cites no source passage.'`.
  - `validateSection([{type:'paragraph',sentences:[]}], …)` → contains `'A block has no text.'`.
  - Connective `'では、AI導入の手順を見ていきましょう。'` with `knownTerms: []` → no violation; `'次にマーケティングオートメーションを見ます。'` with `knownTerms:['マーケティングオートメーション']` → no violation; `'次にGoogleの事例です。'` → violation.
  - `writeSection` with a mock model whose repair has more violations than the draft → returns the draft's blocks.
  - `writeSection` whose final blocks cite `c9` (not provided) → stored `cite` has no `unknown:` entries; `flags` non-empty.
  - `chunksForSection` for a source section whose `chunkIds` are all outside scope → throws `NonRetryableRunError`, `searchSources` not called.
- [x] **Step 2: Run, expect FAIL.**
- [x] **Step 3: Implement.**
- [x] **Step 4: Run, expect PASS.**

### Task 4: Translation shape and EN consistency

`translateSection` checks only block count and type; a list with 5 JA items can return 3 EN items and `article-locale.ts` then maps by index. One malformed reply fails the whole run. Regenerated JA titles/excerpts keep the old `titleEn`/`excerptEn`, which also drive the handoff slug.

**Rules:**

- Shape check per block: list `items.length` equal; table `headers.length` and each `rows[i].length` equal and same row count.
- On mismatch: one repair call with the problems listed; still mismatched → `NonRetryableRunError('Translation of 「<heading>」 did not keep the Japanese structure.')`.
- `write` finish step and `outline` step set `titleEn: null, excerptEn: null` together with the JA title/excerpt they overwrite, and mark every section `enStale: true` when the JA text of that section changed (finish does not change sections; outline clears them — so only `titleEn`/`excerptEn` need clearing).

**Files:**

- Modify: `src/generator/pieces/translate.ts`
- Modify: `src/generator/executors/write.ts:121-134`, `src/generator/executors/outline.ts:29-39`
- Test: `src/generator/pieces/translate.test.ts`, `src/generator/executors/generation.db.test.ts`

- [x] **Step 1: Failing tests.** Mock model returns 3 items for a 5-item list then a correct reply → result has 5 items and two model calls were made. Two bad replies → `NonRetryableRunError`. Table with a short row → mismatch detected. DB: piece with `titleEn` set, run a write (mock models) → `titleEn` null after finish.
- [x] **Step 2: Run, expect FAIL.**
- [x] **Step 3: Implement** `shapeProblems(ja: StudioBlock[], en: EnBlock[]): string[]` and the retry.
- [x] **Step 4: Run, expect PASS.**

### Task 5: Retrieval that works at real scale

Two defects in `searchChunks`: (a) the HNSW index filters by scope after the nearest-neighbour scan (`ef_search` 40), so a small scope in a large library returns few or no semantic hits; (b) the keyword half passes the whole `heading intent` sentence to `&@~` (Groonga query syntax): model text with `(`/`"`/`OR`/`-` raises a syntax error that fails every retry, and a Japanese sentence only matches as an exact phrase.

**Rules:**

- Semantic: exact scan over the scoped rows, never the HNSW index, using a materialized CTE:
  ```sql
  WITH scoped AS MATERIALIZED (
    SELECT c.id, c.source_id, c.ordinal, c.text, c.char_start, c.char_end, c.locator, c.embedding
    FROM studio_source_chunks c JOIN studio_sources s ON s.id = c.source_id
    WHERE <scope> AND c.embedding IS NOT NULL)
  SELECT … FROM scoped ORDER BY embedding <=> $vector::vector LIMIT 30
  ```
  Scopes are one project's sources (≤ 40 sources by `MAX_SELECTED_SOURCES`), so an exact scan is cheap and always correct. Keep the HNSW index for future library-wide search.
- Keyword: `keywordTerms(query)` splits on whitespace, punctuation (`、。，．,.!?！？「」『』（）()・:：;；"'`) and any hiragana run (`[ぁ-ゖ]+`), keeps terms of length ≥ 2, dedupes, caps at 10. Query with `c.text &@| ${terms}::text[]` (match any keyword; literal, no query syntax). No terms → skip the keyword query.
- `searchSources` returns `[]` before embedding when `scope.sourceIds` is empty (saves a paid call).

**Files:**

- Create: `src/generator/retrieval/keywords.ts` (`export function keywordTerms(query: string): string[]`)
- Modify: `src/generator/retrieval/search.ts`
- Test: `src/generator/retrieval/keywords.test.ts`, `src/generator/retrieval/search.db.test.ts`

- [x] **Step 1: Failing tests.**
  - `keywordTerms('AI導入のメリットと注意点')` → `['AI導入', 'メリット', '注意点']`; `keywordTerms('a (b "OR" -c')` → no term containing `(` or `"`.
  - DB: insert 200 out-of-scope chunks whose embeddings equal the query vector and 3 in-scope chunks with a slightly different vector; `searchChunks` with the small scope returns the 3 in-scope ids.
  - DB: query `'見出し (未閉 "引用 OR -除外'` does not throw.
  - DB: JA query `'営業の自動化について'` matches a chunk containing `営業` and `自動化` but not the whole phrase.
  - Replace the existing test "treats query syntax characters as plain text" with the stricter version above.
- [x] **Step 2: Run, expect FAIL.**
- [x] **Step 3: Implement.**
- [x] **Step 4: Run, expect PASS.** Also `EXPLAIN` the semantic query once on the local DB and confirm a `CTE Scan` + `Sort`, not an index scan.

### Task 6: Token budget, ingest limits and long jobs

- `estimateTokens` uses `chars/4`; Japanese is ~1 token per character, so the pre-call budget check rarely fires. The output reserve is also added to embeddings.
- Ingest has the generic 400k-token ceiling, but a 400k-character JA source needs roughly 4× that (embed + digest input twice + output).
- Server actions keep Next's default 1 MB body limit; a large JA text source fails before validation.
- `expireInSeconds: 900` covers the whole job; a long digest or a long write can never finish in one attempt.
- On a resumed ingest, segments are re-extracted from the **live** article while `text`/`contentHash` hold the old snapshot.

**Rules:**

- `estimateTokens(text, { output })`: CJK characters (`\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}`) count 1 each, the rest `length/4`; add `OUTPUT_RESERVE` only for generation calls, not `embedTexts`.
- `ingestTokenCeiling(chars: number) = Math.max(runTokenCeiling(), chars * 5)` in `run-types.ts`; `enqueueIngest(boss, sourceId, userId, chars)` uses it. Text sources pass `text.length`; article sources pass the article's extracted length (compute with `articleToSegments` in the action — database work only, no model call); retry passes `source.charCount ?? MAX_TEXT_SOURCE_CHARS`.
- `next.config.ts`: `experimental: { serverActions: { bodySizeLimit: '3mb' } }` (400k JA chars ≈ 1.2 MB UTF-8, plus JSON overhead; 3 MB leaves room without inviting abuse).
- Per-kind job expiry at send time (`createAndEnqueueRun` passes `expireInSeconds`): `ingest` and `write` 3600 s, others 900 s. Heartbeats still detect dead workers within 60 s.
- Digest becomes one step per group: `digest:<n>` returns that group's `DigestSection`; a final `digest` step assembles and saves `meta.digest`. Export `groups` from `digest.ts` and a `digestGroup(group, options)` function.
- `extract` step output persists segment boundaries `{ segments: [{ start, end, locator }] }`; later steps rebuild segments by slicing `stored.text`, never re-reading the article.

**Files:**

- Modify: `src/ai/generate.ts`, `src/generator/runs/run-types.ts`, `src/generator/sources/enqueue-ingest.ts`, `src/actions/studio-sources.ts` (callers), `next.config.ts`, `src/generator/queue/enqueue.ts`, `src/generator/queue/queues.ts` (`JOB_EXPIRE_SECONDS: Record<RunKind, number>`), `src/generator/sources/digest.ts`, `src/generator/executors/ingest.ts`
- Test: `src/ai/generate.test.ts`, `src/generator/sources/enqueue-ingest.test.ts`, `src/generator/sources/digest.test.ts`, `src/generator/executors/ingest.test.ts`, `src/generator/queue/queue.db.test.ts`

- [x] **Step 1: Failing tests.**
  - `ensureBudget` receives ≥ 1000 for a 1000-char Japanese prompt (currently ~250 + reserve); `embedTexts` estimate has no 4,096 reserve.
  - `enqueueIngest(…, 400_000)` → run `tokenCeiling` 2,000,000.
  - Ingest resume test: the `extract` step already succeeded with stored segments; the linked article is changed afterwards; the chunks are built from the stored text (assert `replaceChunks` receives text equal to slices of the stored text).
  - Digest resume: a run whose `digest:0` succeeded and `digest:1` failed → retry calls the model only for group 1.
  - Queue DB test: a `write` job has `expire_seconds = 3600` in `pgboss.job`.
- [x] **Step 2: Run, expect FAIL.**
- [x] **Step 3: Implement.**
- [x] **Step 4: Run, expect PASS.**

### Task 7: Sentence splitting for real transcripts

`splitSentences` breaks only on `。！？`, `.`+space or blank lines. A caption-per-line transcript becomes one "sentence", which `hardSplit` cuts every 1,400 characters at arbitrary positions with no overlap. `[!?]` in the first alternative breaks URLs; `．` is missing.

**Rules:**

- Break characters: `。！？．` (+ closing brackets), `!`/`?` only when followed by whitespace or end, `.` followed by whitespace, blank lines.
- A resulting sentence longer than `max` is re-split on single newlines; still longer → on `、`/`，`/spaces; still longer → hard cut. Each fallback keeps offsets exact.
- The chunker's overlap then applies to these pieces normally (so hard-cut regions also overlap).

**Files:**

- Modify: `src/generator/text/sentences.ts`, `src/generator/text/chunker.ts` (`hardSplit` → `splitLong`)
- Test: `src/generator/text/text.test.ts`

- [x] **Step 1: Failing tests.** 3,000 chars of one-caption-per-line JA text without `。` → every chunk ≤ 1,400 chars, consecutive chunks overlap, and no chunk starts mid-line. `'See https://x.io/a?b=1 now.'` → one sentence. `'全角ピリオド．次の文'` → two sentences. Existing invariant `text.slice(charStart, charEnd) === chunk.text` holds for all.
- [x] **Step 2: Run, expect FAIL.**
- [x] **Step 3: Implement.**
- [x] **Step 4: Run, expect PASS.**

### Task 8: Step accounting and the full brief (spec §3, §4.4, §5)

**Rules:**

- Migration `20260926120000_run_step_accounting`: `ALTER TABLE studio_run_steps ADD COLUMN prompt_version TEXT, ADD COLUMN tokens_in INTEGER NOT NULL DEFAULT 0, ADD COLUMN tokens_out INTEGER NOT NULL DEFAULT 0;` Mirror in `schema.prisma` (`promptVersion String? @map("prompt_version")`, `tokensIn Int @default(0) @map("tokens_in")`, `tokensOut Int @default(0) @map("tokens_out")`).
- `RunContext.step(key, ordinal, fn, opts?: { promptVersion?: string })`. The handler keeps `current: { key } | null` while a step runs (steps are sequential per run); `recordUsage` increments the run **and** the current step in one statement each. Usage outside a step still counts on the run.
- Executors pass the prompt version: outline → `outline.v1`, section steps → `write.v1` (repair usage lands on the same step), finish → `finish.v1`, translate steps → `translate.v1`, digest steps → `digest.v1` (add `VERSION` export next to the digest instructions).
- Writer, repair and finish prompts include `Audience`, `Tone` and `Keywords` lines when set, in the same format `planOutline` uses. Extract `briefLines(brief): string[]` to `piece-types.ts` and use it in all four prompts.

**Files:**

- Create: `prisma/migrations/20260926120000_run_step_accounting/migration.sql`
- Modify: `prisma/schema.prisma`, `src/generator/runs/run-handler.ts`, `src/generator/runs/runs-repository.ts` (`runStep` accepts `promptVersion`; new `addStepUsage`), every executor, `src/generator/pieces/{write-section,finish,outline,piece-types}.ts`, `src/generator/sources/digest.ts`
- Test: `src/generator/runs/run-handler.test.ts`, `src/generator/runs/runs-repository.db.test.ts`, `src/generator/pieces/write-section.test.ts`

- [x] **Step 1: Failing tests.** DB: a step that records usage 10/5 → step row `tokens_in 10, tokens_out 5, prompt_version 'write.v1'`, run totals also incremented. Unit: `writeSection` prompt contains `Tone: 丁寧` when the brief's tone is set; `finishArticle` prompt contains `Keywords:`.
- [x] **Step 2: Run, expect FAIL.**
- [x] **Step 3: Implement;** apply the migration to the local test DB only (`<urls> yarn prisma migrate deploy`), `yarn postinstall`.
- [x] **Step 4: Run, expect PASS.**

### Task 9: Source library guards

- Unlinking needs only `studio.use`, and `deleteSourceAction` only asks for `studio.sources.delete` while links exist, so any studio user can unlink everywhere and then delete a shared source. The count and the delete are not atomic.
- `retryIngestAction` accepts `ready` sources (re-ingest replaces chunk ids and orphans citations) and does not claim the source atomically.
- Storage and Prisma errors escape as throws instead of `{ ok: false }`.
- A PDF whose browser upload never finished stays `pending` forever.

**Rules:**

- Delete: allowed without `studio.sources.delete` only when the actor created the source **and** it has no project links; checked and deleted in one transaction (`SELECT … FOR UPDATE` on the source row, count links, delete). Storage object removal runs after the row delete commits; a failure there is logged, not surfaced (the row is gone; an orphaned object is harmless and private).
- Retry: only `failed` sources (and `pending` PDFs, see next rule), claimed with `updateMany({ where: { id, status: 'failed' }, data: { status: 'pending' } })`; `count === 0` → `INVALID_INPUT`.
- Retry of a `pending` PDF older than 10 minutes runs the `finishPdfUploadAction` check (object exists → `stored`, else `failed`). The Library shows Retry for `pending` PDFs older than 10 minutes.
- `linkSourceAction` on an unknown source, `updateProjectAction`/`archiveProjectAction` on a missing project → `NOT_FOUND` (catch Prisma `P2003`/`P2025`).
- `AddSourceDialog.run()` wraps its body in `try/finally` so `busy` always resets and shows `FAILED` on a throw.

**Files:**

- Modify: `src/actions/studio-sources.ts`, `src/actions/studio-projects.ts`, `src/generator/sources/sources-repository.ts` (`deleteSourceGuarded(sourceId, actor): 'OK' | 'LINKED' | 'NOT_FOUND'`), `src/components/admin/studio/AddSourceDialog.tsx`, `src/components/admin/studio/SourceLibrary.tsx`
- Test: `src/actions/studio-sources.test.ts`, `src/actions/studio-projects.test.ts`, `src/generator/sources/sources-repository.db.test.ts`, `src/components/admin/studio/AddSourceDialog.test.tsx`

- [x] **Step 1: Failing tests.** A user without `studio.sources.delete` cannot delete an unlinked source created by someone else (`LINKED`); can delete their own unlinked source. `retryIngestAction` on a `ready` source → `INVALID_INPUT`. `linkSourceAction` with a random uuid → `NOT_FOUND`. Dialog: action throws → button re-enabled, error shown.
- [x] **Step 2: Run, expect FAIL.**
- [x] **Step 3: Implement.** Rename the error code shown for the guarded delete to reuse `LINKED` copy, adjusted in both locales: "Only its creator or someone with the delete permission can delete this source."
- [x] **Step 4: Run, expect PASS.**

### Task 10: Workspace robustness

- Panels copy the piece into state once and have no `key`; after Undo (or Save) at the same stage they show stale data, and `OutlinePanel.write()` re-saves the stale rows over the restored outline.
- Polling stops forever after one failed refresh (the effect only re-arms when `piece` changes) and a thrown action is an unhandled rejection.
- Handoff without `articles.edit` throws with no message.
- Failed write: nothing in the Writing panel lets the user continue.
- The handoff slug from a Japanese-only title becomes `ai`, `ai-2`…
- `startRunAction(kind)` is not validated at runtime; `listPiecesAction`'s `projectId` is not validated.
- The rail shows "removed" only while `articleId` is set, which `ON DELETE SET NULL` clears.
- Handed-off pieces viewed through earlier rail steps show enabled mutation controls.

**Rules / changes:**

- `PieceWorkspace` renders the main panel with `key={`${viewing}:${piece.updatedAt}`}`.
- `usePiece`: `refresh` wraps the call in `try/catch` (sets `error`), returns nothing thrown. Polling effect depends on `[piece, error, tick, refresh]`, where `tick` increments after every poll attempt, so a failed poll re-arms while `piece.activeRun` is set. `PieceWorkspace` shows `error` as a banner even after the first load.
- New `useStudioAction()` hook in `pieces/useStudioAction.ts`: `{ run(fn): Promise<boolean>, pending, message }` — sets `pending`, catches throws (`FAILED`), maps results through `errorText`, calls `refresh`. All panels and `HistoryList` use it; every mutating button is disabled while `pending || busy || locked`.
- `PanelProps` gains `locked: boolean` (`piece.stage === 'handed_off'`).
- Handoff button hidden unless `usePermissions().can('articles.edit')`; `createDraftPostAction` uses `requireAnyPermission`-style check that returns `{ ok:false, error:'FORBIDDEN' }` instead of throwing when `articles.edit` is missing (keep `requirePermission('studio.use')` throwing as elsewhere).
- `WritingPanel`: when not busy and the piece is in `outline` with some sections written, show **Continue writing** (`startRunAction(id, 'write')`), which resumes unwritten/stale sections. Progress total = number of `section:` steps in the active run.
- Slug: `piece.titleEn ? generateSlug(piece.titleEn) : createFallbackSlug(piece.title)`; if the result is shorter than 3 characters use `createFallbackSlug(piece.title)`.
- `startRunAction`: `z.enum(['outline','write','translate'])`; `listPiecesAction`: validate `projectId` as uuid.
- Rail: `articleStatus = piece.article?.status ?? (piece.handedOffAt ? 'removed' : null)`; same in the list.
- `HandoffPanel` link uses the article's current category (select it in `getPieceAction`).

**Files:**

- Create: `src/components/admin/studio/pieces/useStudioAction.ts`
- Modify: `PieceWorkspace.tsx`, `usePiece.ts`, `panel-props.ts`, every panel, `HistoryList.tsx`, `PieceList.tsx`, `HandoffPanel.tsx`, `src/actions/studio-pieces.ts`, `src/lib/studio/piece-dto.ts`
- Test: `PieceWorkspace.test.tsx`, `OutlinePanel.test.tsx`, `ReviewPanel.test.tsx`, new `usePiece.test.tsx`, `src/actions/studio-pieces.test.ts`, `src/actions/studio-pieces.db.test.ts`

- [x] **Step 1: Failing tests.**
  - `usePiece`: first poll rejects, second resolves → the hook polls again (fake timers) and ends with the new piece.
  - `OutlinePanel`: rerender with a new `piece.updatedAt` and a different outline via `PieceWorkspace` → rows show the new outline.
  - `ReviewPanel` without `articles.edit` → no handoff button.
  - Action: `createDraftPostAction` for a user lacking `articles.edit` → `{ ok:false, error:'FORBIDDEN' }`; JA-only title `AI導入の始め方` → slug starts with `article-`.
  - `startRunAction(id, 'rewrite_section' as never)` → `INVALID_INPUT`.
- [x] **Step 2: Run, expect FAIL.**
- [x] **Step 3: Implement.**
- [x] **Step 4: Run, expect PASS.**

### Task 11: Translated reasons, snapshot labels and run errors (spec §6)

**Rules:**

- `stages.ts` exports `type BlockReason = 'NO_SOURCES' | 'SOURCES_NOT_READY' | 'NO_GOAL' | 'NO_OUTLINE' | 'INCOMPLETE' | 'NOT_REVIEWED' | 'NO_TITLE'` and every `can*` returns a `BlockReason | null`. The worker throws `NonRetryableRunError(reason)` with the code as message; the UI maps it.
- `errorText(t, failure)`: `reason` → `t('workspace.reasons.<reason>')` when the key exists, else the generic `FAILED` text. Known error codes gain `INVALID_INPUT`, `NOT_FOUND`, `FORBIDDEN`.
- Run errors: `lastRunError` goes through `runErrorText(t, error)`: a `BlockReason` or `FORBIDDEN` maps to its translation; the grounding/translation messages from Tasks 3–4 become codes with a heading parameter (`NO_MATERIAL:<heading>`, `TRANSLATION_SHAPE:<heading>`); anything else shows `workspace.errors.RUN_FAILED` ("The step failed. Try again.") with the raw text in a `<details>` element for support.
- Snapshot reasons are stored as keys (`outline`, `write`, `translate`, `rewrite`, `edit_outline`, `change_sources`, `before_undo`) plus an optional heading for `rewrite`: `rewrite:<heading>`. `HistoryList` shows `t('workspace.history.<key>', { heading })`. Old rows with the previous strings (`edit outline`, …) map through a small alias table.
- Template action's English reason (`studio-templates.ts:52`) becomes a code too.
- Section `flags` stay English sentences for now: they are diagnostic lists produced by the validator. **Decision:** acceptable in P1 because they are shown together with the highlighted sentence; recorded in the P1c-3 plan for translation.

**Files:**

- Modify: `src/generator/pieces/stages.ts`, executors that throw stage reasons, `src/generator/pieces/pieces-repository.ts` callers of `takeSnapshot` (reason keys), `src/actions/studio-pieces.ts`, `src/actions/studio-templates.ts`, `src/components/admin/studio/pieces/errorText.ts`, `HistoryList.tsx`, `PieceWorkspace.tsx`, `messages/admin-en.json`, `messages/admin-ja.json`
- Test: `src/generator/pieces/stages.test.ts`, `errorText.test.ts` (new), `src/actions/studio-pieces.test.ts`, a key-parity test that every `BlockReason` and history key exists in both locale files

- [x] **Step 1: Failing tests** (reason codes returned; `errorText` maps `NO_GOAL` to the JA string when given the JA messages; parity test).
- [x] **Step 2: Run, expect FAIL.**
- [x] **Step 3: Implement** and write the JA copy.
- [x] **Step 4: Run, expect PASS.**

### Task 12: Worker and queue operations

- `yarn worker:dev` loads `.env`, which points at Supabase: a laptop would join the live queue with local code.
- Graceful shutdown waits 25 s; Cloud Run kills after 10 s, so interrupted jobs wait for heartbeat expiry and burn a retry.
- The run handler polls `isRunCancelled` every 200 ms per job; with a 3-connection pool that crowds out real work.
- The dead-letter queue has `retryLimit: 0`; one failed `markRunFailed` leaves a run `running` forever.
- `ensureQueues` never updates an existing queue's settings.
- `SystemCheckCard` freezes when an action throws; `STUDIO_RUN_TOKEN_CEILING` is missing from `.env.example`; deploy docs omit the Secret Manager role; ESLint does not ban `@/lib/studio/web-boss` in engine code.

**Rules:**

- `loadWorkerEnv` refuses a `DIRECT_URL` whose host is not `localhost`/`127.0.0.1` unless `NODE_ENV === 'production'` or `STUDIO_WORKER_ALLOW_REMOTE === '1'`, with the message `Refusing to attach a development worker to a remote database. Set STUDIO_WORKER_ALLOW_REMOTE=1 if you mean it.` The Dockerfile sets `NODE_ENV=production`.
- `SHUTDOWN_TIMEOUT_MS = 8_000`.
- `CANCEL_POLL_MS = 2_000`, and a poll is skipped while the previous one is still pending.
- Dead-letter queue: `retryLimit: 3, retryDelay: 30`.
- `ensureQueues` calls `updateQueue(name, settings)` for existing queues so settings converge on deploy.
- `SystemCheckCard`: both calls in `try/catch` → `start-error`/`failed`; a mounted ref stops timers after unmount.
- `.env.example`: `STUDIO_RUN_TOKEN_CEILING=400000`, `STUDIO_WORKER_ALLOW_REMOTE=`.
- ESLint engine boundary adds `@/lib/studio/web-boss`.

**Files:**

- Modify: `worker/env.ts`, `worker/main.ts`, `worker/Dockerfile`, `src/generator/runs/run-handler.ts`, `src/generator/queue/queues.ts`, `src/components/admin/studio/SystemCheckCard.tsx`, `.env.example`, `eslint.config.mjs`
- Test: `worker/env.test.ts`, `src/generator/runs/run-handler.test.ts`, `src/generator/queue/queues.test.ts`, `src/components/admin/studio/SystemCheckCard.test.tsx`

- [x] **Step 1: Failing tests.** `loadWorkerEnv({ DIRECT_URL: 'postgresql://u:p@aws-1.pooler.supabase.com:5432/db', … })` throws; with `STUDIO_WORKER_ALLOW_REMOTE: '1'` passes; localhost passes. `ensureQueues` on an existing queue calls `updateQueue`. SystemCheckCard: start action rejects → shows the start error and the button is enabled.
- [x] **Step 2: Run, expect FAIL.**
- [x] **Step 3: Implement.**
- [x] **Step 4: Run, expect PASS.**

### Task 13: Docs and final verification

- [x] **Step 1: Spec edits in place** (`docs/superpowers/specs/2026-09-22-content-studio-design.md`): §5 digest default → strong model with the reason; §6 workspace route → `/admin/studio/pieces/[id]`; §6 add a short "Deferred to P1c-3" line listing the five deferred features; §4.4 note that a `source` section with no in-scope passages is refused; §7 `yarn worker:dev` refuses remote databases; §8 failed runs settle the stage like cancel.
- [x] **Step 2: CLAUDE.md** Content Studio section: worker deploy step 2 adds `gcloud projects add-iam-policy-binding … --role roles/secretmanager.secretAccessor` for the Cloud Run runtime service account; mention `STUDIO_WORKER_ALLOW_REMOTE`; mention per-step token accounting.
- [x] **Step 3: Pre-deploy check** in CLAUDE.md: before `yarn db:deploy`, run `SELECT piece_id, count(*) FROM studio_runs WHERE status IN ('queued','running') AND piece_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1;` (must be empty, or the unique index migration fails).
- [x] **Step 4: Full verification:** `yarn type-check`, `yarn lint` (0 errors), `yarn test`, `<urls> ADMIN_TEST_DB=1 yarn test:db`, `yarn build`. Record results in this plan's Results section.

## Not in this plan

- P1c-3 workspace completion: piece list filters, re-pointing sources, add-to-library from the Sources panel, rail "Translate needs re-run", live sections during Writing, translated validator flags.
- Failed model calls (timeouts, schema failures) are not counted against the ceiling because the provider reports no usage; documented, not fixed.
- Kanji numerals (三割) in connective sentences are not detected; the heuristic stays conservative to avoid flagging words like 一方 or 同一.
- Duplicate snapshots from retried steps: harmless History noise; the resumable step design makes a clean fix (snapshot id stored in step output) part of P1d's snapshot work.

## Results

All 13 tasks implemented test-first on the working tree (not committed). Final verification: `yarn type-check` clean; `yarn lint` 0 errors (9 pre-existing warnings elsewhere); `yarn test` 820/820; `ADMIN_TEST_DB=1 yarn test:db` 87/87 on the local Supabase-image database; `yarn build` passes. Migration `20260926120000_run_step_accounting` was applied to the local test database only.

Deviations (each ledgered): stage settlement derives from content; PGroonga syntax errors did not reproduce on 3.2.5, so the fix targets phrase-only matching and the HNSW post-filter; article sources keep the default ingest ceiling; the ingest ceiling is 5 tokens per character (a worst-case budget test measured 4.3); "Continue writing" lives on the Outline panel; action messages show at workspace level because panels remount on each piece version; unknown run errors show a generic message without raw text.

A fresh whole-branch review found no critical issues; its three important findings were fixed with failing-first tests. Its nine minor findings were then fixed the same way at the owner's request: retrieval materializes only ids and distances, the worker guard checks both database URLs, `SourcesPanel` uses the shared action hook, outline inputs are disabled while busy or locked, Cancel and template save/delete report failures, outline edits clear the excerpt so finish runs again, all-caps names (other than common acronyms) count as facts in connectives, and ingest resumes from extract steps recorded before segments were stored. Final: `yarn test` 829/829, `yarn test:db` 88/88, type-check clean, lint 0 errors.
