# Content Studio (AI Content Generator Rewrite) — Design

**Date:** 2026-09-22
**Status:** Approved (2026-09-22). This spec maps all phases and details **Phase 1**. Phases 2–5 each get their own spec.

## Goal

Replace the standalone marketing content generator (`marketing-chatbot-frontend`, Next.js 14; `marketing-chatbot-backend`, Python FastAPI on EC2) with a **Content Studio** inside the cosbe-website admin. Both old repos are retired and not edited. Fresh start: no data is migrated.

The rewrite is also an upgrade. The main user complaints are that output needs heavy rework, quality is inconsistent, and **the generator assumes things instead of using the notes it was given**. The studio makes grounding structural: every section is planned from specific source passages, every sentence cites them, and code (not the prompt) enforces it.

The public cosbe website must not get slower: no generation work runs in the website's containers.

## Current state (old system)

- The live UI (`/unified`) is a NotebookLM-style chat: projects → sources (YouTube, PDF, pasted text, Google Drive) → streaming generation → chat revisions → translate → accuracy/LLMO → publish to cosbe (`POST /api/articles`, bearer token) and to X / Facebook / LinkedIn.
- One "Generate" is a single SSE request running: optional Gemini web search → OpenAI streamed `<thinking>` + article → Gemini accuracy check with whole-article GPT rewrites (≤2) below 70% → length-floor append loop → quality critic rewrite → LLMO 13-criteria rewrite → Gemini translation → save. Output is markdown; cosbe receives one heading + one paragraph block.
- Four LLM providers (OpenAI, Gemini, Groq, Anthropic key). Own users/sessions auth. Per-user prompt templates ("Gems").

**Why it invents content** (verified in code):

1. Accuracy, quality and LLMO checks all compare against `combined_source_text(sources, limit=6000)` — the first 6,000 characters of all sources combined.
2. The accuracy "fix" rewrites the whole article from those 6,000 characters plus the first 2,000 characters of the old article.
3. The length picker defaults to 3,000–3,500 JA chars and the length-floor loop appends until reached, padding past what the sources support.
4. Each source is silently truncated to 40,000 characters when seeded into the conversation.

## Decisions

| Topic             | Decision                                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope             | Core generator, quality checks, Google Drive import, social posting — delivered in phases.                                                                                 |
| Surface           | New admin menu **Content Studio** (`/admin/studio`). New Post, Import and the editors are unchanged.                                                                       |
| UX model          | Article-centric studio with a visible **stage rail**; a chat assistant drives the same actions as the buttons.                                                             |
| Output            | The studio builds a **piece**; at the end a human clicks **Create draft post**, which creates a normal `articles` draft. The studio then only tracks its status.           |
| Editing           | No manual text editor in the studio. AI section actions only; hand edits happen in the existing editor after handoff.                                                      |
| After handoff     | The piece is locked. To redo, duplicate the piece.                                                                                                                         |
| Sources           | Global **source library**; **projects** link a subset; generation only sees the project's linked sources (narrowed further per piece).                                     |
| Citations         | Editor-only: kept on the piece, stripped when the draft post is created.                                                                                                   |
| Language          | Generate Japanese (primary fields), then translate to English per block.                                                                                                   |
| AI provider       | Provider-agnostic layer (`src/ai/`) on the Vercel AI SDK; OpenAI as default; model chosen per task via config.                                                             |
| Runtime           | Framework-free engine (`src/generator/`) in this repo, executed by a **separate Cloud Run worker** via a Postgres queue (**pg-boss**). Same language, schema, auth, types. |
| PDFs (P1)         | **Upload and store only.** Not extracted, not used in generation. Extraction is an open decision.                                                                          |
| Data migration    | None.                                                                                                                                                                      |
| Jev (TypeSafe AI) | Not used for the core. Later spike for claim verification behind `verifyClaim()` (P2).                                                                                     |

## Phases

| Phase  | Content                                                                                                                                                                                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1** | Foundation + core generator: AI layer, queue + worker, source library (text, YouTube, cosbe articles; PDFs stored only), projects, retrieval, templates, brief, outline, section writing, review actions, agent chat, JA→EN translation, handoff, tracking. **This spec.** |
| P2     | Quality: claim-level verification over full sources, unsupported-claim flags, quality/SEO/LLMO panels (re-runnable), Jev spike.                                                                                                                                            |
| P3     | Google Drive import; YouTube caption hardening; PDF extraction if decided.                                                                                                                                                                                                 |
| P4     | Social summary + X / Facebook / LinkedIn OAuth posting.                                                                                                                                                                                                                    |
| P5     | Decommission: shut down EC2, archive both repos, remove `POST /api/articles` bearer ingestion and `API_SECRET_KEY` if nothing else uses them, clean env vars.                                                                                                              |

## 1. Architecture

```
 Admin UI (Next.js, existing App Hosting)        Worker (new Cloud Run service, same repo)
 ┌───────────────────────────────────┐          ┌──────────────────────────────────┐
 │ /admin/studio  pages + components │          │ worker/main.ts (plain Node)      │
 │ server actions: requirePermission │─enqueue─▶│ pg-boss consumers                │
 │   CRUD projects/sources/pieces    │  (jobs)  │   ingest.* / run.* / agent.*     │
 │ progress: Supabase Realtime/poll  │◀─rows────│ calls src/generator/*            │
 └───────────────┬───────────────────┘          └───────────────┬──────────────────┘
                 │   shared: Prisma schema, Block types, Zod, src/ai/*              │
                 └──────────────────▶  Supabase Postgres + Storage  ◀───────────────┘
```

### Code layout

- `src/ai/` — the only code that imports a provider SDK (see §5).
- `src/generator/` — framework-free engine: `ingest/`, `chunking/`, `retrieval/`, `outline.ts`, `writeSection.ts`, `grounding.ts`, `toBlocks.ts`, `translate.ts`, `handoff.ts`, `stages.ts`, `agent/tools.ts`. Pure functions + Prisma. An ESLint `no-restricted-imports` rule forbids `next/*` and `@/app/*` in this folder so it runs in the worker, tests, or in-process.
- `worker/` — `main.ts` (pg-boss bootstrap, job registration, graceful shutdown on SIGTERM), `handlers/*.ts`, `Dockerfile`.
- `src/app/admin/(protected)/studio/` — pages; `src/components/admin/studio/` — components; `src/actions/studio/*.ts` — server actions. Actions validate input, call `requirePermission`, write rows and enqueue jobs. They make no LLM calls.

### Rules that keep the site fast

- No model calls in the web app for studio work; every expensive operation (ingest, digest, embed, outline, write, translate, agent turn) is a job.
- The worker has its own CPU/memory, concurrency and scaling, independent of `apphosting.yaml` (website: 1 CPU / 1 GiB / max 3 instances).

## 2. Database capabilities (verified 2026-09-22, read-only queries)

| Need            | Finding                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Postgres        | 17.6                                                                                                                                                         |
| pg-boss         | `postgres` role can `CREATE` schemas. Must use `DIRECT_URL` (Supavisor session mode, :5432), not `DATABASE_URL` (transaction mode, :6543, `pgbouncer=true`). |
| Connections     | `max_connections` = 60, ~15 used at idle. Worker pools must be small (§7).                                                                                   |
| `vector`        | 0.8.0 available, allow-listed (`supautils.privileged_extensions`), not installed. HNSW supported.                                                            |
| Japanese search | No Japanese text-search config. **PGroonga** 3.2.5 available and allow-listed. `pg_trgm` installed.                                                          |
| `pgmq`          | Available but not allow-listed; not used.                                                                                                                    |
| Realtime        | `supabase_realtime` publication exists with no tables.                                                                                                       |
| RLS helper      | `public.admin_has_any_permission(perms text[])` exists and can be used in policies.                                                                          |
| Storage         | Only bucket: `article-images` (public, no size limit). A new private bucket is needed.                                                                       |
| Existing tables | RLS off on `articles` etc., but `anon`/`authenticated` grants are revoked. Exposed PostgREST schemas setting is empty.                                       |
| Vault           | `supabase_vault` installed.                                                                                                                                  |
| Size            | 18 MB.                                                                                                                                                       |

## 3. Data model (Phase 1)

New Prisma models, following existing conventions (UUID ids, snake_case `@map`, `Timestamptz(6)`). All tables are prefixed `studio_` and have **RLS enabled** (no policies except the Realtime SELECT policies below). Prisma connects as `postgres` and is unaffected. `created_by` references `admin_users.id`.

```
studio_sources                 global library
  id, kind: youtube | pdf | text | article
  status: pending | processing | ready | stored | needs_transcript | failed
  error, title, language: ja | en | mixed
  origin_url, youtube_video_id, storage_path, article_id (kind=article)
  text (full extracted text), char_count, content_hash
  meta Json { duration_s, channel, page_count, chapters[{title, start_s, end_s, char_start, char_end}],
              digest[{range, points[{text, chunk_ids[]}]}] }
  tags[], created_by, created_at, updated_at

studio_source_chunks           retrieval units
  id, source_id → cascade, ordinal, text, char_start, char_end
  locator Json {start_s, end_s, chapter} | {block_id}
  embedding vector(1536), embedding_model
  indexes: HNSW (embedding vector_cosine_ops), PGroonga (text), (source_id, ordinal)

studio_projects                id, name, description, created_by, archived_at, created_at, updated_at
studio_project_sources         (project_id, source_id) PK, added_by, added_at

studio_templates               shared team templates
  id, name, description, instructions, default_category, is_default, created_by, created_at, updated_at

studio_pieces                  one per article being generated
  id, project_id, template_id?, stage (see §6), title, title_en, excerpt, excerpt_en, seo Json
  brief Json { goal, audience, keywords[], tone, target_length: number | "auto" }
  selection Json { source_ids[], chapters { source_id: chapter_index[] } }
  outline Json [{ id, heading, intent, chunk_ids[], est_chars, kind: "source" | "boilerplate", stale }]
  gaps Json [string]
  blocks Json (JA, with citations), blocks_en Json
  category, author_id → authors
  article_id? → articles (set at handoff, ON DELETE SET NULL), handed_off_at
  created_by, created_at, updated_at

studio_runs                    id, piece_id?, source_id?, kind: ingest | digest | outline | write | rewrite_section | translate | agent_turn
                               status: queued | running | succeeded | failed | cancelled, input Json, error
                               tokens_in, tokens_out, token_ceiling, created_by, started_at, finished_at
studio_run_steps               id, run_id → cascade, ordinal, key (e.g. "section:<outlineId>"), status, output Json, error
                               attempts, prompt_version, started_at, finished_at, tokens_in, tokens_out
studio_piece_snapshots         id, piece_id → cascade, outline Json, blocks Json, blocks_en Json, reason, run_id?, created_at
studio_messages                id, piece_id → cascade, role: user | assistant | tool, content Json, run_id?, created_by, created_at
```

`vector` and PGroonga columns/indexes are created in raw SQL in the migration and declared `Unsupported(...)` in Prisma; all queries on them go through `src/generator/retrieval`.

### Rules

- **Grounding lives in the data.** Outline sections carry `chunk_ids`; the writer receives only those chunks. Citations reference `chunk_id`s, resolving to a quote plus a timestamp or block.
- **Citations** are inline marks in the piece's paragraph HTML: `<span data-cite="chunkId,chunkId">…</span>`. JA only. `handoff.ts` strips them when creating the draft post, so the public site never receives them.
- **Snapshots** are taken before every AI write to a piece (button or agent), giving one-click undo.
- **Cosbe article sources** store a JA text snapshot and `content_hash`; they are re-chunked when the hash changes.
- **One active run per piece** (see §7).
- **Deleting a source** linked to any project requires `studio.sources.delete`; chunks cascade. Otherwise sources can only be unlinked.
- **Realtime:** `studio_runs`, `studio_run_steps` and `studio_messages` are added to `supabase_realtime`, with `GRANT SELECT` to `authenticated` and an RLS SELECT policy `admin_has_any_permission(array['studio.use'])`. The exact default-privilege/grant behaviour for new tables is confirmed while writing the migration. Polling (every 2 s while a run is active) is the fallback and is built first.

### Out of P1 (reserved, not built)

Claim-verification results (P2), Drive file ids (P3), social posts (P4), PDF text/chunks (open decision).

## 4. Generation pipeline

**Grounding contract (all writing steps):** the model sees only the chunks provided and returns each sentence with the `chunk_id`s that support it, or marks it `connective` (a transition with no facts). Code validates this.

### 4.1 Ingest (job per source)

- **Text** — pasted; stored as-is.
- **PDF** — the browser uploads directly to the private `studio-sources` bucket using a signed upload URL from a server action; status `stored`. No extraction in P1. Listed in the UI as "Not yet usable for generation"; excluded from selection, retrieval, outline and writing.
- **YouTube** — metadata (title, description, duration, channel) via Data API key; chapters parsed from the description. Transcript via the **owner-OAuth captions API** (`captions.list` / `captions.download`), refresh token stored in Supabase Vault, connected from a studio settings page. No scraping. If captions are unavailable, status `needs_transcript` and the UI accepts a pasted or uploaded `.vtt` / `.srt` / `.txt`. Timed captions map chapters to exact character ranges.
- **Cosbe article** — JA block text; locator `{block_id}`.
- **Then (text, YouTube, article):** language detection (kana/kanji ratio) → sentence-aware chunker (JA `。！？`, EN sentence split; never crosses chapter boundaries; ~1,000 chars with ~150 overlap) → batched embeddings → **source digest** (key points per chapter or range, each tagged with chunk ids; small model; cached in `meta.digest`) → status `ready`.

### 4.2 Retrieval

Hybrid: pgvector top-k + PGroonga keyword top-k, merged by reciprocal rank fusion. Always filtered to the run's scope: project's linked sources ∩ piece selection ∩ character ranges of ticked chapters; `stored` PDFs excluded.

### 4.3 Outline (one structured call)

- Input: brief, template instructions, and digests of the selected sources; full chunks instead of digests when the selection is small enough to fit the budget.
- Output (Zod): title options; sections `{heading, intent, chunk_ids, est_chars, kind}`; `gaps` — things the brief asks for that the sources do not cover.
- Template-required sections (e.g. company CTA) are `kind: "boilerplate"` and exempt from citation.
- Length: `"auto"` sums `est_chars`. If a numeric target exceeds what the material supports, the UI warns; it never pads.
- The author edits, reorders, removes, adds sections and re-points their sources, then approves.

### 4.4 Write (one step per section, sequential)

- Input: brief, template voice, all headings, the previous section's final paragraph, this section's chunks topped up by retrieval on its intent (capped).
- Output (Zod): blocks (`paragraph`, `list`, `table`, `callout`, `quote`, `heading` level 3) composed of sentences with `cite[]` or `connective: true`.
- Deterministic checks (`grounding.ts`): every cited id is in the provided set; `source` sections have citations; `connective` sentences contain no digits or proper-noun candidates (heuristic). Violation → one repair call for that section; still failing → the section is flagged in Review.
- No whole-article rewrites and no length padding.
- `toBlocks` renders the HTML with `data-cite` spans and generates block ids; the step writes the section into `piece.blocks` on success.
- **Finish step** (after all sections): title, excerpt and SEO meta from the finished sections; TOC is derived deterministically from headings at handoff using the existing TOC logic.

### 4.5 Translate

Each block's JA → `*En`, plus `title_en` and `excerpt_en`, reusing the logic of `src/actions/block-translation.ts` moved into `src/generator/translate.ts` (the existing action then calls the engine). Citations are not carried into EN.

Translation is optional: handoff is allowed from `review` (EN empty, the public site's existing fallback in `src/lib/article-locale.ts` applies) or from `ready` (EN done). A rewrite after translation marks the affected EN blocks stale and the rail shows Translate as needing a re-run.

### 4.6 Handoff

`Create draft post` (human click only; requires `studio.use` and `articles.edit`): strip citations → build TOC → `createArticleRecord` with `status = draft`, the piece's category, author, title/excerpt (JA + EN), SEO and blocks; slug from the English title plus a short suffix, editable later in the editor. Sets `piece.article_id`, `handed_off_at`, stage `handed_off`; the piece is locked. Case-study metadata fields are left empty for the editor.

### Progress

Step-level in P1 ("Writing section 3/6"); sections appear as each step finishes. Token-level streaming is deferred (open decision).

## 5. AI layer and agent

### `src/ai/`

- `models.ts` — task → model map (`outline`, `write`, `repair`, `digest`, `translate`, `finish`, `agent`, `embed`), each overridable by env (`STUDIO_MODEL_<TASK>`). Defaults: a strong model for outline/write/repair/agent, a small model for digest/translate/finish, `text-embedding-3-small` (1536 dims) for embed.
- `generate.ts` — `generateObject(task, schema, prompt)`, `generateText(task, …)`, `embed(texts)`, `runAgent(task, messages, tools)` on the Vercel AI SDK. Timeouts, retry on 429/5xx, token accounting written to the current run step, run token ceiling enforcement, redacting logger (never logs full source text).
- `prompts/` — versioned modules (`outline.v1.ts`, `writeSection.v1.ts`, …); the version is stored on each step (`prompt_version`).
- `verify.ts` — `verifyClaim(claim, passages)` interface defined in P1, implemented in P2 (LLM judge, Jev spike).

### Agent (`agent_turn` job)

- Context: piece stage, brief, outline, section summaries, last N messages. No raw sources; it uses tools.
- Tools (thin wrappers over the engine functions the buttons use; permission-checked for the message's author): `searchSources(query)`, `updateBrief(patch)`, `editOutline(ops)`, `approveOutline()`, `startWriting()`, `rewriteSection(id, instruction)`, `setSectionSources(id, chunkIds)`, `translate()`, `undo(snapshotId)`, `linkSource(sourceId)`, `addTextSource(title, text)`.
- Guardrails: no tool reaches handoff or publishing; content-mutating tools snapshot first; long actions start a normal run and the agent replies "started" rather than waiting; max ~8 tool calls per turn; it will not write without sources — it offers to add the missing material as a text source.
- Output: `studio_messages` rows (text + tool-call cards + `run_id`); every action appears as a card with Undo and moves the stage rail exactly as a button would.

## 6. Studio UI/UX

### Navigation and permissions

New sidebar entry **Content Studio** in `AdminProtectedShell`, shown with `studio.use`. New permissions in `src/lib/permissions.ts` (new group `studio`):

- `studio.use` — projects, sources, pieces, generation, handoff (handoff additionally needs `articles.edit`).
- `studio.templates.manage` — create/edit/delete shared templates.
- `studio.sources.delete` — delete linked sources.

Labels in `messages/admin-{en,ja}.json`; migration inserts `role_permissions` rows and updates `DEFAULT_ROLE_PERMISSIONS`: `marketing` and `developer` get `studio.use` and `studio.templates.manage`; `admin` gets all three (it already takes every permission except `users.delete`). All studio UI strings are translated in both admin locales.

### Pages

- `/admin/studio` — pieces list: title, project, stage (dots + label), updated; filters by project and stage. Tabs: **Pieces**, **Projects**, **Source library**, **Templates**.
- `/admin/studio/projects/[id]` — project's linked sources; link from library or add new (uploads land in the library and are linked).
- `/admin/studio/settings` — YouTube owner connection status and Connect / Reconnect.
- `/admin/studio/[pieceId]` — workspace: stage rail (top), stage panel (main), assistant (right).

### Stage rail

`① Sources ─ ② Brief ─ ③ Outline ─ ④ Writing ─ ⑤ Review ─ ⑥ Translate ─ ⑦ Draft post ─ ⑧ Published`

`piece.stage` values: `sources`, `brief`, `outline`, `writing`, `review`, `translating`, `ready`, `handed_off`. Stages advance on actions; reopening an earlier stage moves back (editing the outline after writing marks affected sections `stale`). ⑧ is derived live from the linked `articles.status`: draft / published / archived, or "removed" if the article was deleted. Completed stages are clickable to view. Transition rules live in `src/generator/stages.ts` (pure, tested).

### Stage panels

1. **Sources** — pick from the project's linked sources, tick chapters, add to the library inline; `stored` PDFs greyed out.
2. **Brief** — goal, audience, keywords, tone, template, category, length (auto / target), author (existing authors).
3. **Outline** — editable sections with their source passages, gaps warnings, **Approve**.
4. **Writing** — per-section progress; sections appear as they finish; per-section Retry; Cancel.
5. **Review** — rendered article with citations (hover → passage + timestamp); per-section: regenerate, expand, shorten, change tone, re-point sources; flagged sections; undo list from snapshots. No manual text editing.
6. **Translate** — generate EN; JA/EN side by side.
7. **Draft post** — **Create draft post**, then "Open in editor" (`/admin/posts/[id]`).
8. **Published** — tracked status and link to the public page.

The assistant is available at every stage.

## 7. Worker, deployment and operations

- **Build:** `worker/Dockerfile` in this repo runs `worker/main.ts` with `tsx` (resolves the `@/` path alias without a bundler); deployed as its own Cloud Run service (starting size 1 vCPU / 2 GiB, max 1 instance). Cloud Run services must listen on `$PORT`, so the worker serves `GET /healthz`.
- **Runtime:** pg-boss 12 and AI SDK 7 require Node ≥ 22.12; the worker image uses Node 24 and the web app's App Hosting runtime must be ≥ 22.12 too (the web app enqueues through pg-boss).
- **Always on:** pg-boss pulls jobs, so the worker runs with `minInstances: 1` and CPU always allocated. Rough, unverified cost estimate ~$25–55/month; compare with the current EC2 bill. Scale-to-zero (web app wakes the worker on enqueue) is an open decision.
- **Concurrency:** pg-boss team sizes — ingest 2, write 2, agent 4.
- **Connections:** Prisma via `DATABASE_URL` with `connection_limit=3`; pg-boss via `DIRECT_URL` with max 2. Each web instance also holds a one-connection pg-boss pool on `DIRECT_URL` (closed when idle) for pg-boss's startup check and queue cache; the job insert itself runs in the caller's Prisma transaction.
- **Local dev:** `yarn worker:dev` (tsx watch) alongside `yarn dev`.
- **Environment:** worker — `DATABASE_URL`, `DIRECT_URL`, `OPENAI_API_KEY`, `STUDIO_MODEL_*`, `STUDIO_RUN_TOKEN_CEILING`, `YOUTUBE_API_KEY`, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`. Web — `DIRECT_URL` (the web app's pg-boss pool; must be set in App Hosting, otherwise it falls back to `DATABASE_URL` with a warning) and the Google OAuth redirect values for the YouTube connect callback. Documented in `.env.example`.
- **Deploy order:**
  1. Migration: `create extension vector`, `create extension pgroonga`, `studio_*` tables, raw-SQL indexes, RLS, Realtime publication + policies, permission rows.
  2. `studio-sources` private bucket + storage policies in `supabase/schema.sql` (size limit, MIME allowlist, `admin_has_any_permission(array['studio.use'])`).
  3. Env vars for web and worker.
  4. Deploy the worker.
  5. Deploy the web app.

## 8. Error handling

- One active run per piece: pg-boss `singletonKey = piece_id` plus a DB check before enqueue.
- Stuck work: studio queues set pg-boss `heartbeatSeconds` and `expireInSeconds`. A job whose worker dies or stops heartbeating is retried, and after its last retry pg-boss routes it to the `studio.dead` dead-letter queue, whose handler marks the run failed, so the UI shows Retry instead of spinning.
- The web app enqueues inside the same Prisma transaction that creates the run row (pg-boss `fromPrisma` adapter), so a run never exists without its job or vice versa.
- Transient provider errors and 429s: retried with backoff (2 attempts) by pg-boss; then the step fails and only that section shows Retry.
- Per-run token ceiling (`STUDIO_RUN_TOKEN_CEILING`) fails the run with a clear message.
- Partial success is normal: finished sections stay; resume skips succeeded steps.
- Ingest failures set `status = failed | needs_transcript` with a readable reason.
- Cancel sets the run `cancelled`; handlers check it between steps.

## 9. Security

- Every server action calls `requirePermission`; jobs carry `created_by` and the worker re-checks permissions from the database before acting (including agent tools).
- Source text (transcripts, notes, articles; later PDFs and web pages) is untrusted data: delimited in prompts, the agent's instructions state that source text cannot give instructions, and no tool can hand off or publish. Worst case of prompt injection is bad text that a human reviews.
- Private bucket with signed URLs; OAuth refresh tokens in Supabase Vault; service-role key server/worker only; RLS enabled on all `studio_*` tables.

## 10. Testing

Vitest, existing setup.

- **Unit:** JA/EN chunker, chapter → character mapping, VTT/SRT parsing, `toBlocks`, citation stripping at handoff, grounding validator, RRF merge, stage transitions, permission guards on actions and agent tools.
- **Engine:** full pipeline with the AI SDK mock model (deterministic, no network): ingest text → outline → write (including the repair path) → translate → handoff.
- **Retrieval SQL:** against local Supabase (`supabase start`) in a separate `yarn test:db` script, not part of the default run.
- **Quality eval (manual):** `yarn studio:eval` runs a small golden set of real sources and briefs and reports citation coverage, connective-sentence ratio and gap detection; the baseline P2 is measured against.

## Open decisions

- PDF extraction method and how PDFs join generation.
- Token-level streaming (Realtime Broadcast from the worker).
- Worker scale-to-zero.
- Jev spike for claim verification (P2).

## Out of scope (P1)

Quality checks beyond the grounding validator (P2), Google Drive (P3), social posting (P4), decommissioning (P5), web search, manual editing inside the studio, editing a piece after handoff, migrating old data.
