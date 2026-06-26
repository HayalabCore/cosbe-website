# Bulk Legacy Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins paste many legacy URLs, extract them all with bounded concurrency, curate them in a review queue with inline editable previews, and commit only the accepted ones as drafts — reusing the existing single-URL server actions unchanged.

**Architecture:** A single client component (`BulkImportClient`) drives all phases in-place (input → extract → review → commit → summary), so navigation never loses work. Extraction and commit run client-side through a bounded-concurrency helper that calls the existing `previewImportAction` / `commitImportAction`. The preview panel is extracted from the current single-import page into a shared `ImportPreviewFields` component. Batch state is mirrored to `sessionStorage` for refresh resilience.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, next-intl, Tailwind v4. Tests run via `yarn test`.

## Global Constraints

- **No git commits.** The user has disabled commits for this work — make all changes in the working tree only. Every task's verification is `yarn test` + `yarn type-check` + `yarn lint` (and a manual note for UI). Do NOT run `git add`/`git commit`.
- Test runner is Vitest (`yarn test`). `yarn type-check` and `yarn lint` must stay clean (lint has 22 pre-existing warnings in admin components — do not add new errors).
- Styling MUST match existing admin pages: primary actions use `bg-primaryColor hover:bg-primaryHover` (theme token = `#549fe3`); cards are `bg-white rounded-lg border border-slate-200`; use the slate palette. No new accent colors.
- Semantic status colors: ready → emerald/`successColor`, error → red/`errorColor`, collision → amber/`warningColor`.
- All user-facing strings via `next-intl`, new namespace `admin.bulkImport.*` (top-level `bulkImport` key in `messages/admin-en.json` and `messages/admin-ja.json`).
- Reuse server actions unchanged: `previewImportAction(url): Promise<ImportPreviewPayload>`, `commitImportAction(payload): Promise<{id:string;warnings:string[]}>`, `checkImportSlugAction(slug): Promise<boolean>` (from `@/actions/legacy-import`).
- `ImportPreviewPayload` (from `@/lib/legacy-import/types`) includes `slugCollision: boolean`; `ImportCommitPayload = ImportPreviewPayload`.

---

### Task 1: `parseBulkUrls` pure helper

**Files:**

- Create: `src/lib/legacy-import/bulk.ts`
- Test: `src/lib/legacy-import/bulk.test.ts`

**Interfaces:**

- Consumes: `parseLegacyUrl` from `@/lib/legacy-import` (throws on bad host/unsupported segment).
- Produces: `parseBulkUrls(text: string): { valid: string[]; invalid: Array<{ line: string; reason: string }> }` — splits on newlines, trims, drops blanks, dedupes (preserving first-seen order of valids), validates each via `parseLegacyUrl`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/legacy-import/bulk.test.ts
import { describe, expect, it } from 'vitest';
import { parseBulkUrls } from './bulk';

describe('parseBulkUrls', () => {
  it('keeps valid legacy URLs in order and dedupes', () => {
    const text = [
      'https://www.jp.cosbe.inc/useful-info/a/',
      'https://www.jp.cosbe.inc/news/b/',
      'https://www.jp.cosbe.inc/useful-info/a/', // dup
    ].join('\n');
    const { valid, invalid } = parseBulkUrls(text);
    expect(valid).toEqual([
      'https://www.jp.cosbe.inc/useful-info/a/',
      'https://www.jp.cosbe.inc/news/b/',
    ]);
    expect(invalid).toEqual([]);
  });

  it('drops blank/whitespace-only lines', () => {
    const text = '\n  \nhttps://www.jp.cosbe.inc/news/b/\n\n';
    expect(parseBulkUrls(text).valid).toEqual([
      'https://www.jp.cosbe.inc/news/b/',
    ]);
  });

  it('flags invalid lines with a reason but keeps valid ones', () => {
    const text = [
      'https://example.com/foo/',
      'not a url',
      'https://www.jp.cosbe.inc/useful-info/a/',
    ].join('\n');
    const { valid, invalid } = parseBulkUrls(text);
    expect(valid).toEqual(['https://www.jp.cosbe.inc/useful-info/a/']);
    expect(invalid.map((i) => i.line)).toEqual([
      'https://example.com/foo/',
      'not a url',
    ]);
    expect(invalid[0].reason.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/lib/legacy-import/bulk.test.ts`
Expected: FAIL — module `./bulk` not found.

- [ ] **Step 3: Implement `parseBulkUrls`**

```ts
// src/lib/legacy-import/bulk.ts
import { parseLegacyUrl } from './index';

export function parseBulkUrls(text: string): {
  valid: string[];
  invalid: Array<{ line: string; reason: string }>;
} {
  const valid: string[] = [];
  const invalid: Array<{ line: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    try {
      parseLegacyUrl(line);
    } catch (e) {
      invalid.push({
        line,
        reason: e instanceof Error ? e.message : 'Invalid URL',
      });
      continue;
    }
    if (seen.has(line)) continue;
    seen.add(line);
    valid.push(line);
  }

  return { valid, invalid };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/lib/legacy-import/bulk.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify**

Run: `yarn type-check`
Expected: clean. (No commit — working tree only.)

---

### Task 2: `mapWithConcurrency` pure async helper

**Files:**

- Create: `src/lib/concurrency.ts`
- Test: `src/lib/concurrency.test.ts`

**Interfaces:**

- Produces: `mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<PromiseSettledResult<R>[]>` — runs at most `limit` concurrently, returns settled results in input order, never rejects on a single failure.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/concurrency.test.ts
import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './concurrency';

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('mapWithConcurrency', () => {
  it('returns settled results in input order', async () => {
    const out = await mapWithConcurrency([1, 2, 3], 2, async (n) => n * 10);
    expect(out).toEqual([
      { status: 'fulfilled', value: 10 },
      { status: 'fulfilled', value: 20 },
      { status: 'fulfilled', value: 30 },
    ]);
  });

  it('never exceeds the concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await tick(5);
      active--;
    });
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('isolates rejections — one failure does not sink the rest', async () => {
    const out = await mapWithConcurrency([1, 2, 3], 3, async (n) => {
      if (n === 2) throw new Error('boom');
      return n;
    });
    expect(out[0]).toEqual({ status: 'fulfilled', value: 1 });
    expect(out[1].status).toBe('rejected');
    expect(out[2]).toEqual({ status: 'fulfilled', value: 3 });
  });

  it('handles empty input', async () => {
    expect(await mapWithConcurrency([], 4, async (n) => n)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/lib/concurrency.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/concurrency.ts
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let next = 0;
  const effectiveLimit = Math.max(1, Math.min(limit, items.length));

  async function worker() {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = {
          status: 'fulfilled',
          value: await fn(items[index]!, index),
        };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: effectiveLimit }, () => worker()));
  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/lib/concurrency.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Verify**

Run: `yarn type-check`
Expected: clean.

---

### Task 3: Bulk state model + reducer + `findDuplicateSlugs`

**Files:**

- Create: `src/lib/legacy-import/bulk-state.ts`
- Test: `src/lib/legacy-import/bulk-state.test.ts`

**Interfaces:**

- Consumes: `ImportPreviewPayload` from `@/lib/legacy-import/types`.
- Produces:
  - `type BulkRowStatus = 'queued' | 'extracting' | 'ready' | 'error' | 'committing' | 'committed' | 'commitError'`
  - `type BulkRow = { url: string; status: BulkRowStatus; payload?: ImportPreviewPayload; error?: string; included: boolean; draftId?: string }`
  - `type BulkState = { rows: BulkRow[] }`
  - `type BulkAction` (see implementation)
  - `bulkInit(urls: string[]): BulkState`
  - `bulkReducer(state: BulkState, action: BulkAction): BulkState`
  - `findDuplicateSlugs(rows: BulkRow[]): Set<string>` — slugs that appear >1× among `ready` rows with a payload.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/legacy-import/bulk-state.test.ts
import { describe, expect, it } from 'vitest';
import {
  bulkInit,
  bulkReducer,
  findDuplicateSlugs,
  type BulkRow,
} from './bulk-state';
import type { ImportPreviewPayload } from './types';

function payload(slug: string): ImportPreviewPayload {
  return {
    sourceUrl: `https://www.jp.cosbe.inc/news/${slug}/`,
    category: 'notice',
    slug,
    slugCollision: false,
    title: slug,
    excerpt: '',
    featuredImageRemoteUrl: null,
    publishedAt: '2025-01-01T00:00:00.000Z',
    tags: [],
    blocks: [],
    warnings: [],
  };
}

describe('bulkInit', () => {
  it('creates queued, included rows for each url', () => {
    const s = bulkInit(['a', 'b']);
    expect(s.rows).toHaveLength(2);
    expect(s.rows[0]).toMatchObject({
      url: 'a',
      status: 'queued',
      included: true,
    });
  });
});

describe('bulkReducer', () => {
  it('setPayload marks the row ready', () => {
    let s = bulkInit(['a']);
    s = bulkReducer(s, { type: 'setPayload', url: 'a', payload: payload('a') });
    expect(s.rows[0].status).toBe('ready');
    expect(s.rows[0].payload?.slug).toBe('a');
  });

  it('setStatus records an error message', () => {
    let s = bulkInit(['a']);
    s = bulkReducer(s, {
      type: 'setStatus',
      url: 'a',
      status: 'error',
      error: '404',
    });
    expect(s.rows[0]).toMatchObject({ status: 'error', error: '404' });
  });

  it('patchPayload merges into the row payload', () => {
    let s = bulkInit(['a']);
    s = bulkReducer(s, { type: 'setPayload', url: 'a', payload: payload('a') });
    s = bulkReducer(s, {
      type: 'patchPayload',
      url: 'a',
      patch: { slug: 'a2' },
    });
    expect(s.rows[0].payload?.slug).toBe('a2');
  });

  it('toggleInclude flips the flag', () => {
    let s = bulkInit(['a']);
    s = bulkReducer(s, { type: 'toggleInclude', url: 'a' });
    expect(s.rows[0].included).toBe(false);
  });

  it('setBatchInclude only affects ready rows', () => {
    let s = bulkInit(['a', 'b']);
    s = bulkReducer(s, { type: 'setPayload', url: 'a', payload: payload('a') });
    s = bulkReducer(s, { type: 'setBatchInclude', included: false });
    expect(s.rows[0].included).toBe(false); // a is ready
    expect(s.rows[1].included).toBe(true); // b still queued, untouched
  });

  it('setCommitted records the draft id', () => {
    let s = bulkInit(['a']);
    s = bulkReducer(s, { type: 'setPayload', url: 'a', payload: payload('a') });
    s = bulkReducer(s, { type: 'setCommitted', url: 'a', draftId: 'draft-1' });
    expect(s.rows[0]).toMatchObject({
      status: 'committed',
      draftId: 'draft-1',
    });
  });
});

describe('findDuplicateSlugs', () => {
  it('returns slugs appearing more than once among ready rows', () => {
    const rows: BulkRow[] = [
      { url: '1', status: 'ready', included: true, payload: payload('dup') },
      { url: '2', status: 'ready', included: true, payload: payload('dup') },
      { url: '3', status: 'ready', included: true, payload: payload('unique') },
      { url: '4', status: 'queued', included: true },
    ];
    expect(findDuplicateSlugs(rows)).toEqual(new Set(['dup']));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/lib/legacy-import/bulk-state.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/legacy-import/bulk-state.ts
import type { ImportPreviewPayload } from './types';

export type BulkRowStatus =
  | 'queued'
  | 'extracting'
  | 'ready'
  | 'error'
  | 'committing'
  | 'committed'
  | 'commitError';

export type BulkRow = {
  url: string;
  status: BulkRowStatus;
  payload?: ImportPreviewPayload;
  error?: string;
  included: boolean;
  draftId?: string;
};

export type BulkState = { rows: BulkRow[] };

export type BulkAction =
  | { type: 'setStatus'; url: string; status: BulkRowStatus; error?: string }
  | { type: 'setPayload'; url: string; payload: ImportPreviewPayload }
  | { type: 'patchPayload'; url: string; patch: Partial<ImportPreviewPayload> }
  | { type: 'toggleInclude'; url: string }
  | { type: 'setBatchInclude'; included: boolean }
  | { type: 'setCommitted'; url: string; draftId: string }
  | { type: 'hydrate'; state: BulkState }
  | { type: 'reset' };

export function bulkInit(urls: string[]): BulkState {
  return {
    rows: urls.map((url) => ({ url, status: 'queued', included: true })),
  };
}

function mapRow(
  state: BulkState,
  url: string,
  fn: (row: BulkRow) => BulkRow
): BulkState {
  return { rows: state.rows.map((r) => (r.url === url ? fn(r) : r)) };
}

export function bulkReducer(state: BulkState, action: BulkAction): BulkState {
  switch (action.type) {
    case 'setStatus':
      return mapRow(state, action.url, (r) => ({
        ...r,
        status: action.status,
        error: action.error,
      }));
    case 'setPayload':
      return mapRow(state, action.url, (r) => ({
        ...r,
        status: 'ready',
        error: undefined,
        payload: action.payload,
      }));
    case 'patchPayload':
      return mapRow(state, action.url, (r) =>
        r.payload ? { ...r, payload: { ...r.payload, ...action.patch } } : r
      );
    case 'toggleInclude':
      return mapRow(state, action.url, (r) => ({
        ...r,
        included: !r.included,
      }));
    case 'setBatchInclude':
      return {
        rows: state.rows.map((r) =>
          r.status === 'ready' ? { ...r, included: action.included } : r
        ),
      };
    case 'setCommitted':
      return mapRow(state, action.url, (r) => ({
        ...r,
        status: 'committed',
        draftId: action.draftId,
        error: undefined,
      }));
    case 'hydrate':
      return action.state;
    case 'reset':
      return { rows: [] };
    default:
      return state;
  }
}

export function findDuplicateSlugs(rows: BulkRow[]): Set<string> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.status === 'ready' && r.payload) {
      counts.set(r.payload.slug, (counts.get(r.payload.slug) ?? 0) + 1);
    }
  }
  return new Set([...counts].filter(([, n]) => n > 1).map(([slug]) => slug));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/lib/legacy-import/bulk-state.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify**

Run: `yarn type-check`
Expected: clean.

---

### Task 4: i18n keys for bulk import

**Files:**

- Modify: `messages/admin-en.json` (add top-level `"bulkImport"` object)
- Modify: `messages/admin-ja.json` (add top-level `"bulkImport"` object)

**Interfaces:**

- Produces: `admin.bulkImport.*` keys consumed by Tasks 6–7.

- [ ] **Step 1: Add the English keys**

Add this top-level key to `messages/admin-en.json` (e.g. right after the `"import"` block):

```json
"bulkImport": {
  "title": "Bulk Import",
  "description": "Paste one legacy URL per line. We extract them all, you review, then import only the ones you keep.",
  "singleLink": "← Single import",
  "multipleLink": "Import multiple →",
  "urlsLabel": "Legacy URLs (one per line)",
  "extract": "Extract {count} articles",
  "extractOne": "Extract 1 article",
  "validCount": "{count} valid URL(s) ready",
  "invalidTitle": "Skipped {count} invalid line(s)",
  "statsSummary": "{total} URLs · {ready} ready · {errors} errors · {collisions} collisions",
  "colStatus": "Status",
  "colTitle": "Title",
  "colCategory": "Category",
  "colSlug": "Slug",
  "colContent": "Content",
  "statusQueued": "Queued",
  "statusExtracting": "Extracting…",
  "statusReady": "Ready",
  "statusError": "Error",
  "statusCommitting": "Importing…",
  "statusCommitted": "Imported",
  "statusCommitError": "Failed",
  "selectAllReady": "Select all ready",
  "deselectAll": "Deselect all",
  "retryFailed": "Retry failed ({count})",
  "retry": "Retry",
  "preview": "Preview",
  "commit": "Import {count} selected as drafts →",
  "contentSummary": "{blocks} blocks · {images} img",
  "collisionFlag": "exists",
  "duplicateFlag": "duplicate in batch",
  "summaryTitle": "Import complete",
  "summaryDone": "Imported {count} article(s) as drafts.",
  "summaryFailedTitle": "{count} failed to import",
  "viewDraft": "Open draft",
  "newBatch": "Start new batch",
  "backToDashboard": "Back to dashboard",
  "tooLargeToSave": "Batch too large to auto-save; don't refresh.",
  "noValidUrls": "No valid legacy URLs found."
}
```

- [ ] **Step 2: Add the Japanese keys**

Add the same key shape to `messages/admin-ja.json` with Japanese values:

```json
"bulkImport": {
  "title": "一括インポート",
  "description": "レガシーURLを1行に1つ貼り付けてください。すべて抽出し、確認後、残したものだけをインポートします。",
  "singleLink": "← 単一インポート",
  "multipleLink": "複数をインポート →",
  "urlsLabel": "レガシーURL（1行に1つ）",
  "extract": "{count}件の記事を抽出",
  "extractOne": "1件の記事を抽出",
  "validCount": "{count}件の有効なURL",
  "invalidTitle": "{count}件の無効な行をスキップしました",
  "statsSummary": "{total}件 · 準備完了{ready} · エラー{errors} · 重複{collisions}",
  "colStatus": "状態",
  "colTitle": "タイトル",
  "colCategory": "カテゴリ",
  "colSlug": "スラッグ",
  "colContent": "内容",
  "statusQueued": "待機中",
  "statusExtracting": "抽出中…",
  "statusReady": "準備完了",
  "statusError": "エラー",
  "statusCommitting": "インポート中…",
  "statusCommitted": "インポート済み",
  "statusCommitError": "失敗",
  "selectAllReady": "準備完了をすべて選択",
  "deselectAll": "選択を解除",
  "retryFailed": "失敗を再試行（{count}）",
  "retry": "再試行",
  "preview": "プレビュー",
  "commit": "選択した{count}件を下書きとしてインポート →",
  "contentSummary": "{blocks}ブロック · 画像{images}",
  "collisionFlag": "既存",
  "duplicateFlag": "バッチ内で重複",
  "summaryTitle": "インポート完了",
  "summaryDone": "{count}件の記事を下書きとしてインポートしました。",
  "summaryFailedTitle": "{count}件のインポートに失敗",
  "viewDraft": "下書きを開く",
  "newBatch": "新しいバッチを開始",
  "backToDashboard": "ダッシュボードに戻る",
  "tooLargeToSave": "バッチが大きすぎて自動保存できません。更新しないでください。",
  "noValidUrls": "有効なレガシーURLが見つかりません。"
}
```

- [ ] **Step 3: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/admin-en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/admin-ja.json','utf8'));console.log('ok')"`
Expected: prints `ok`.

---

### Task 5: Extract shared `ImportPreviewFields` from `ImportClient`

**Files:**

- Create: `src/components/admin/ImportPreviewFields.tsx`
- Modify: `src/app/admin/(protected)/import/ImportClient.tsx`

**Interfaces:**

- Consumes: `ImportPreviewPayload` (`@/lib/legacy-import/types`), `CaseStudyMetaFields`, `BlockRenderer`, `checkImportSlugAction`.
- Produces: default export `ImportPreviewFields` with props:
  ```ts
  type ImportPreviewFieldsProps = {
    value: ImportPreviewPayload;
    onChange: (patch: Partial<ImportPreviewPayload>) => void;
    onValidateSlug?: (slug: string) => void;
  };
  ```
  Plus named exports `isoToDatetimeLocal(iso: string): string` and `blockSummary(blocks)` reused by both pages.

This task moves the existing preview body (the two-column grid of editable fields + listing/body preview, currently inline in `ImportClient.tsx` lines ~136–296) into the new component **with no behavior change**, and rewires `ImportClient` to use it. The single-import page must look and work exactly as before.

- [ ] **Step 1: Create `ImportPreviewFields.tsx`**

```tsx
// src/components/admin/ImportPreviewFields.tsx
'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import CaseStudyMetaFields from '@/components/admin/CaseStudyMetaFields';
import type { ImportPreviewPayload } from '@/lib/legacy-import/types';
import type { CaseStudyMeta } from '@/types';

const BlockRenderer = dynamic(
  () => import('@/components/article/BlockRenderer'),
  { ssr: false }
);

const emptyCaseStudy: CaseStudyMeta = { aiModels: [] };

export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function blockSummary(blocks: ImportPreviewPayload['blocks']) {
  return {
    blocks: blocks.length,
    images: blocks.filter((b) => b.type === 'image').length,
    tables: blocks.filter((b) => b.type === 'table').length,
    callouts: blocks.filter((b) => b.type === 'callout').length,
  };
}

type ImportPreviewFieldsProps = {
  value: ImportPreviewPayload;
  onChange: (patch: Partial<ImportPreviewPayload>) => void;
  onValidateSlug?: (slug: string) => void;
};

export default function ImportPreviewFields({
  value,
  onChange,
  onValidateSlug,
}: ImportPreviewFieldsProps) {
  const t = useTranslations('admin.import');
  const summary = blockSummary(value.blocks);
  const tagsStr = value.tags.join(', ');

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {value.category}
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            {t('fieldTitle')}
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            {t('fieldSlug')}
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
            value={value.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
            onBlur={(e) => onValidateSlug?.(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            {t('fieldExcerpt')}
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[80px]"
            value={value.excerpt}
            onChange={(e) => onChange({ excerpt: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            {t('fieldPublishedAt')}
          </label>
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={isoToDatetimeLocal(value.publishedAt)}
            onChange={(e) =>
              onChange({
                publishedAt: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : value.publishedAt,
              })
            }
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            {t('fieldTags')}
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={tagsStr}
            onChange={(e) =>
              onChange({
                tags: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>

        {value.featuredImageRemoteUrl && (
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
              {t('featuredImage')}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.featuredImageRemoteUrl}
              alt=""
              className="max-h-40 rounded-lg border border-slate-200 object-contain"
            />
            <p className="mt-1 text-xs text-slate-400">
              {t('featuredImageNote')}
            </p>
          </div>
        )}

        {value.category === 'case-study' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <CaseStudyMetaFields
              value={value.caseStudyMeta ?? emptyCaseStudy}
              onChange={(patch) =>
                onChange({
                  caseStudyMeta: {
                    ...(value.caseStudyMeta ?? emptyCaseStudy),
                    ...patch,
                  },
                })
              }
            />
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
          {t('listingPreview')}
        </p>
        <div className="rounded-xl border border-slate-200 bg-white p-6 mb-4">
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            {value.title}
          </h2>
          {value.excerpt ? (
            <p className="text-sm text-slate-600 leading-relaxed">
              {value.excerpt}
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">{t('noExcerpt')}</p>
          )}
          {value.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {value.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
          {t('bodyPreview')}
        </p>
        <p className="text-sm text-slate-600 mb-3">
          {t('blockSummary', {
            blocks: summary.blocks,
            images: summary.images,
            tables: summary.tables,
            callouts: summary.callouts,
          })}
        </p>
        <div className="rounded-xl border border-slate-200 bg-white p-6 max-h-[70vh] overflow-y-auto">
          {value.blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewire `ImportClient.tsx` to use the shared component**

In `src/app/admin/(protected)/import/ImportClient.tsx`:

1. Remove the local `BlockRenderer` dynamic import, `emptyCaseStudy`, `isoToDatetimeLocal`, and `blockSummary` (now in the shared file).
2. Remove the unused `CaseStudyMetaFields` and `CaseStudyMeta` imports if no longer referenced.
3. Add: `import ImportPreviewFields from '@/components/admin/ImportPreviewFields';`
4. Replace the entire `<div className="grid lg:grid-cols-2 gap-8"> … </div>` block (the two-column fields + preview) with:

```tsx
<ImportPreviewFields
  value={payload}
  onChange={updatePayload}
  onValidateSlug={(slug) => void validateSlug(slug)}
/>
```

Keep everything else in `ImportClient` (the warnings banner, slug-collision banner, the action buttons, the URL input phase) exactly as is.

- [ ] **Step 3: Verify single import still type-checks and lints**

Run: `yarn type-check && yarn lint`
Expected: clean (no new errors; pre-existing warnings unchanged).

- [ ] **Step 4: Manual smoke check**

Run: `yarn dev`, open `/admin/import`, paste a known legacy URL, fetch preview — confirm the preview renders identically to before (fields editable, body preview shows, slug collision still works). Stop the dev server. (No commit.)

---

### Task 6: `BulkImportRow` component

**Files:**

- Create: `src/components/admin/BulkImportRow.tsx`

**Interfaces:**

- Consumes: `BulkRow` (`@/lib/legacy-import/bulk-state`), `ImportPreviewFields` + `blockSummary` (`@/components/admin/ImportPreviewFields`).
- Produces: default export `BulkImportRow` with props:
  ```ts
  type BulkImportRowProps = {
    row: BulkRow;
    expanded: boolean;
    duplicate: boolean; // slug duplicated within the batch
    onToggleExpand: () => void;
    onToggleInclude: () => void;
    onPatch: (
      patch: Partial<import('@/lib/legacy-import/types').ImportPreviewPayload>
    ) => void;
    onValidateSlug: (slug: string) => void;
    onRetry: () => void;
  };
  ```
  Renders one `<tr>` (the row) and, when `expanded`, a second `<tr>` containing the inline `ImportPreviewFields`.

This is presentational only — all state lives in the parent. It must render every `BulkRowStatus`. Use the admin palette (slate, `primaryColor`); status badges use emerald (ready/committed), red (error/commitError), indigo→use `primaryColor`/blue tones for in-progress, slate for queued, amber for collision.

- [ ] **Step 1: Implement the component**

```tsx
// src/components/admin/BulkImportRow.tsx
'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import ImportPreviewFields, {
  blockSummary,
} from '@/components/admin/ImportPreviewFields';
import type { BulkRow } from '@/lib/legacy-import/bulk-state';
import type { ImportPreviewPayload } from '@/lib/legacy-import/types';

const STATUS_BADGE: Record<string, string> = {
  queued: 'bg-slate-100 text-slate-600',
  extracting: 'bg-blue-50 text-blue-700',
  ready: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
  committing: 'bg-blue-50 text-blue-700',
  committed: 'bg-emerald-100 text-emerald-700',
  commitError: 'bg-red-100 text-red-700',
};

const STATUS_KEY: Record<string, string> = {
  queued: 'statusQueued',
  extracting: 'statusExtracting',
  ready: 'statusReady',
  error: 'statusError',
  committing: 'statusCommitting',
  committed: 'statusCommitted',
  commitError: 'statusCommitError',
};

type BulkImportRowProps = {
  row: BulkRow;
  expanded: boolean;
  duplicate: boolean;
  onToggleExpand: () => void;
  onToggleInclude: () => void;
  onPatch: (patch: Partial<ImportPreviewPayload>) => void;
  onValidateSlug: (slug: string) => void;
  onRetry: () => void;
};

function shortUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export default function BulkImportRow({
  row,
  expanded,
  duplicate,
  onToggleExpand,
  onToggleInclude,
  onPatch,
  onValidateSlug,
  onRetry,
}: BulkImportRowProps) {
  const t = useTranslations('admin.bulkImport');
  const p = row.payload;
  const inProgress = row.status === 'extracting' || row.status === 'committing';
  const collision = Boolean(p?.slugCollision) || duplicate;
  const summary = p ? blockSummary(p.blocks) : null;

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50/60">
        <td className="px-3 py-3">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primaryColor"
            checked={row.included}
            disabled={row.status !== 'ready'}
            onChange={onToggleInclude}
          />
        </td>
        <td className="px-3 py-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[row.status]}`}
          >
            {inProgress && (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            )}
            {t(STATUS_KEY[row.status])}
          </span>
        </td>
        <td className="px-3 py-3 min-w-0">
          <div className="font-semibold text-slate-900 truncate max-w-md">
            {p?.title || (row.status === 'error' ? (row.error ?? '—') : '…')}
          </div>
          <div className="font-mono text-[11px] text-slate-400 truncate max-w-md">
            {shortUrl(row.url)}
          </div>
          {row.status === 'commitError' && row.error && (
            <div className="text-[11px] text-red-600 mt-0.5">{row.error}</div>
          )}
        </td>
        <td className="px-3 py-3">
          {p && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {p.category}
            </span>
          )}
        </td>
        <td className="px-3 py-3">
          {p && (
            <span
              className={`font-mono text-xs ${collision ? 'text-amber-700 font-semibold' : 'text-slate-600'}`}
            >
              {p.slug}
              {p.slugCollision && ` ⚠ ${t('collisionFlag')}`}
              {!p.slugCollision && duplicate && ` ⚠ ${t('duplicateFlag')}`}
            </span>
          )}
        </td>
        <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
          {summary &&
            t('contentSummary', {
              blocks: summary.blocks,
              images: summary.images,
            })}
        </td>
        <td className="px-3 py-3 text-right whitespace-nowrap">
          {row.status === 'ready' || row.status === 'committed' ? (
            <button
              type="button"
              className="text-xs font-semibold text-primaryColor hover:text-primaryHover"
              onClick={onToggleExpand}
            >
              {t('preview')} {expanded ? '▴' : '▾'}
            </button>
          ) : row.status === 'error' || row.status === 'commitError' ? (
            <button
              type="button"
              className="text-xs font-semibold text-primaryColor hover:text-primaryHover"
              onClick={onRetry}
            >
              {t('retry')}
            </button>
          ) : null}
        </td>
      </tr>

      {expanded && p && (
        <tr className="bg-slate-50/60 border-b border-slate-100">
          <td colSpan={7} className="px-5 py-4">
            <ImportPreviewFields
              value={p}
              onChange={onPatch}
              onValidateSlug={onValidateSlug}
            />
          </td>
        </tr>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run: `yarn type-check && yarn lint`
Expected: clean (component is imported nowhere yet, but must compile).

---

### Task 7: `BulkImportClient` + route + nav links

**Files:**

- Create: `src/app/admin/(protected)/import/bulk/page.tsx`
- Create: `src/app/admin/(protected)/import/bulk/BulkImportClient.tsx`
- Modify: `src/app/admin/(protected)/import/ImportClient.tsx` (add "Import multiple →" link on the URL-input phase)

**Interfaces:**

- Consumes: `parseBulkUrls` (`@/lib/legacy-import/bulk`), `mapWithConcurrency` (`@/lib/concurrency`), `bulkInit`/`bulkReducer`/`findDuplicateSlugs`/types (`@/lib/legacy-import/bulk-state`), `BulkImportRow`, the three server actions, `Link`/`useRouter`.

- [ ] **Step 1: Create the route page**

```tsx
// src/app/admin/(protected)/import/bulk/page.tsx
import BulkImportClient from './BulkImportClient';

export default function AdminBulkImportPage() {
  return <BulkImportClient />;
}
```

- [ ] **Step 2: Create `BulkImportClient.tsx`**

```tsx
// src/app/admin/(protected)/import/bulk/BulkImportClient.tsx
'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import {
  checkImportSlugAction,
  commitImportAction,
  previewImportAction,
} from '@/actions/legacy-import';
import { parseBulkUrls } from '@/lib/legacy-import/bulk';
import { mapWithConcurrency } from '@/lib/concurrency';
import {
  bulkInit,
  bulkReducer,
  findDuplicateSlugs,
} from '@/lib/legacy-import/bulk-state';
import BulkImportRow from '@/components/admin/BulkImportRow';

const CONCURRENCY = 4;
const STORAGE_KEY = 'cosbe.bulk-import.v1';
const MAX_PERSIST_BYTES = 4_000_000;

type Phase = 'input' | 'review' | 'summary';

export default function BulkImportClient() {
  const t = useTranslations('admin.bulkImport');
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('input');
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState<
    Array<{ line: string; reason: string }>
  >([]);
  const [state, dispatch] = useReducer(bulkReducer, { rows: [] });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [persistWarning, setPersistWarning] = useState(false);

  // Rehydrate from sessionStorage on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          phase: Phase;
          rows: ReturnType<typeof bulkInit>['rows'];
        };
        if (saved.rows?.length) {
          dispatch({ type: 'hydrate', state: { rows: saved.rows } });
          setPhase(saved.phase === 'input' ? 'review' : saved.phase);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  // Persist on every change (skip while on input phase / empty).
  useEffect(() => {
    if (phase === 'input' || state.rows.length === 0) return;
    try {
      const serialized = JSON.stringify({ phase, rows: state.rows });
      if (serialized.length > MAX_PERSIST_BYTES) {
        setPersistWarning(true);
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, serialized);
      setPersistWarning(false);
    } catch {
      setPersistWarning(true);
    }
  }, [state, phase]);

  const duplicateSlugs = useMemo(
    () => findDuplicateSlugs(state.rows),
    [state.rows]
  );

  const parsed = useMemo(() => parseBulkUrls(text), [text]);

  const counts = useMemo(() => {
    let ready = 0;
    let errors = 0;
    let collisions = 0;
    for (const r of state.rows) {
      if (r.status === 'ready') ready++;
      if (r.status === 'error' || r.status === 'commitError') errors++;
      if (
        r.payload?.slugCollision ||
        (r.payload && duplicateSlugs.has(r.payload.slug))
      )
        collisions++;
    }
    return { total: state.rows.length, ready, errors, collisions };
  }, [state.rows, duplicateSlugs]);

  const selectedCount = state.rows.filter(
    (r) => r.included && r.status === 'ready'
  ).length;

  const hasBlockingCollision = state.rows.some(
    (r) =>
      r.included &&
      r.status === 'ready' &&
      r.payload &&
      (r.payload.slugCollision || duplicateSlugs.has(r.payload.slug))
  );

  async function extractUrl(url: string) {
    dispatch({ type: 'setStatus', url, status: 'extracting' });
    try {
      const payload = await previewImportAction(url);
      dispatch({ type: 'setPayload', url, payload });
    } catch (e) {
      dispatch({
        type: 'setStatus',
        url,
        status: 'error',
        error: e instanceof Error ? e.message : 'Extraction failed',
      });
    }
  }

  async function handleExtract() {
    if (parsed.valid.length === 0) return;
    setInvalid(parsed.invalid);
    dispatch({ type: 'hydrate', state: bulkInit(parsed.valid) });
    setPhase('review');
    // Defer so the reducer state is applied before we start mutating rows.
    await mapWithConcurrency(parsed.valid, CONCURRENCY, (url) =>
      extractUrl(url)
    );
  }

  async function commitRow(url: string) {
    const row = state.rows.find((r) => r.url === url);
    if (!row?.payload) return;
    dispatch({ type: 'setStatus', url, status: 'committing' });
    try {
      const { id } = await commitImportAction(row.payload);
      dispatch({ type: 'setCommitted', url, draftId: id });
    } catch (e) {
      dispatch({
        type: 'setStatus',
        url,
        status: 'commitError',
        error: e instanceof Error ? e.message : 'Import failed',
      });
    }
  }

  async function handleCommit() {
    const targets = state.rows
      .filter((r) => r.included && r.status === 'ready')
      .map((r) => r.url);
    if (targets.length === 0) return;
    await mapWithConcurrency(targets, CONCURRENCY, (url) => commitRow(url));
    setPhase('summary');
  }

  async function validateSlug(url: string, slug: string) {
    const trimmed = slug.trim();
    if (!trimmed) return;
    try {
      const available = await checkImportSlugAction(trimmed);
      dispatch({
        type: 'patchPayload',
        url,
        patch: { slugCollision: !available },
      });
    } catch {
      /* keep current state on network error */
    }
  }

  function startNewBatch() {
    sessionStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'reset' });
    setText('');
    setInvalid([]);
    setExpanded(null);
    setPhase('input');
  }

  // ---- INPUT PHASE ----
  if (phase === 'input') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <Link
            href="/admin/import"
            className="text-sm font-semibold text-primaryColor hover:text-primaryHover"
          >
            {t('singleLink')}
          </Link>
        </div>
        <p className="text-sm text-slate-500 mb-8">{t('description')}</p>

        <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
          {t('urlsLabel')}
        </label>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono min-h-[220px] mb-3"
          placeholder={`https://www.jp.cosbe.inc/useful-info/example/\nhttps://www.jp.cosbe.inc/news/example/`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {parsed.valid.length > 0 && (
          <p className="text-xs text-emerald-700 mb-2">
            {t('validCount', { count: parsed.valid.length })}
          </p>
        )}
        {parsed.invalid.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <p className="font-semibold mb-1">
              {t('invalidTitle', { count: parsed.invalid.length })}
            </p>
            <ul className="list-disc pl-5 space-y-0.5">
              {parsed.invalid.slice(0, 8).map((i) => (
                <li key={i.line} className="font-mono break-all">
                  {i.line}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          disabled={parsed.valid.length === 0}
          onClick={() => void handleExtract()}
          className="rounded-lg bg-primaryColor px-4 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-50"
        >
          {parsed.valid.length === 1
            ? t('extractOne')
            : t('extract', { count: parsed.valid.length })}
        </button>
      </div>
    );
  }

  // ---- SUMMARY PHASE ----
  if (phase === 'summary') {
    const committed = state.rows.filter((r) => r.status === 'committed');
    const failed = state.rows.filter((r) => r.status === 'commitError');
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {t('summaryTitle')}
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          {t('summaryDone', { count: committed.length })}
        </p>

        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 mb-6">
          {committed.map((r) => (
            <div
              key={r.url}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm text-slate-800 truncate">
                {r.payload?.title}
              </span>
              <Link
                href={`/admin/posts/${r.draftId}`}
                className="text-xs font-semibold text-primaryColor hover:text-primaryHover whitespace-nowrap ml-3"
              >
                {t('viewDraft')} →
              </Link>
            </div>
          ))}
        </div>

        {failed.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6">
            <p className="text-sm font-semibold text-red-800 mb-1">
              {t('summaryFailedTitle', { count: failed.length })}
            </p>
            <ul className="list-disc pl-5 text-xs text-red-700 space-y-0.5">
              {failed.map((r) => (
                <li key={r.url}>
                  {r.payload?.title || r.url} — {r.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={startNewBatch}
            className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover"
          >
            {t('newBatch')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/dashboard')}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  // ---- REVIEW PHASE ----
  const extracting = state.rows.some(
    (r) => r.status === 'queued' || r.status === 'extracting'
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <button
          type="button"
          onClick={startNewBatch}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          {t('newBatch')}
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap rounded-xl border border-slate-200 bg-white px-4 py-3 mb-4">
        <p className="text-sm text-slate-600">
          {t('statsSummary', {
            total: counts.total,
            ready: counts.ready,
            errors: counts.errors,
            collisions: counts.collisions,
          })}
        </p>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => dispatch({ type: 'setBatchInclude', included: true })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t('selectAllReady')}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'setBatchInclude', included: false })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t('deselectAll')}
        </button>
        {counts.errors > 0 && (
          <button
            type="button"
            onClick={() =>
              void mapWithConcurrency(
                state.rows
                  .filter((r) => r.status === 'error')
                  .map((r) => r.url),
                CONCURRENCY,
                (url) => extractUrl(url)
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('retryFailed', { count: counts.errors })}
          </button>
        )}
        <button
          type="button"
          disabled={selectedCount === 0 || hasBlockingCollision || extracting}
          onClick={() => void handleCommit()}
          className="inline-flex items-center gap-2 rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-50"
        >
          {extracting && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          )}
          {t('commit', { count: selectedCount })}
        </button>
      </div>

      {persistWarning && (
        <p className="text-xs text-amber-700 mb-3">{t('tooLargeToSave')}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-3 py-2.5 w-9" />
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 w-28">
                {t('colStatus')}
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {t('colTitle')}
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 w-28">
                {t('colCategory')}
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {t('colSlug')}
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {t('colContent')}
              </th>
              <th className="px-3 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody>
            {state.rows.map((row) => (
              <BulkImportRow
                key={row.url}
                row={row}
                expanded={expanded === row.url}
                duplicate={Boolean(
                  row.payload && duplicateSlugs.has(row.payload.slug)
                )}
                onToggleExpand={() =>
                  setExpanded((cur) => (cur === row.url ? null : row.url))
                }
                onToggleInclude={() =>
                  dispatch({ type: 'toggleInclude', url: row.url })
                }
                onPatch={(patch) =>
                  dispatch({ type: 'patchPayload', url: row.url, patch })
                }
                onValidateSlug={(slug) => void validateSlug(row.url, slug)}
                onRetry={() => void extractUrl(row.url)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the "Import multiple →" link to the single-import page**

In `src/app/admin/(protected)/import/ImportClient.tsx`, in the URL-input phase (the final `return` block, near the `<h1>{t('title')}</h1>`), add a link to the bulk page. Wrap the existing heading so the link sits beside it:

```tsx
<div className="flex items-center justify-between mb-2">
  <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
  <Link
    href="/admin/import/bulk"
    className="text-sm font-semibold text-primaryColor hover:text-primaryHover"
  >
    {useTranslations('admin.bulkImport')('multipleLink')}
  </Link>
</div>
```

Add `import Link from 'next/link';` at the top if not present. NOTE: calling `useTranslations` inline is not allowed (hooks rule) — instead add near the other hooks at the top of the component: `const tb = useTranslations('admin.bulkImport');` and use `{tb('multipleLink')}` in the JSX.

- [ ] **Step 4: Verify**

Run: `yarn type-check && yarn lint`
Expected: clean (no new errors).

- [ ] **Step 5: Manual verification (the spec's checklist)**

Run `yarn dev`, then:

1. Go to `/admin/import`, click **Import multiple →** → lands on `/admin/import/bulk`.
2. Paste 3–4 real legacy URLs (mix of categories) + one bad line; confirm valid count + invalid list.
3. Click Extract → rows transition queued → extracting → ready live, ≤4 at once.
4. Expand a row → edit title/slug → collapse → confirm edits stuck and no refetch.
5. Paste two URLs that yield the same slug → confirm `duplicate in batch` flag + commit disabled until resolved.
6. Deselect one, click Import → rows go committing → imported; lands on summary with working **Open draft** links.
7. Refresh during review → confirm the queue restored from sessionStorage.
8. Confirm visual consistency with other admin pages (blue primaryColor, slate, cards).

Stop the dev server. (No commit.)

---

## Self-Review

**Spec coverage:**

- Strict one-per-line + dedupe + invalid flagging → Task 1 (`parseBulkUrls`) + Task 7 input phase. ✓
- Client-orchestrated concurrency ≤4 (extract + commit) → Task 2 (`mapWithConcurrency`) + Task 7. ✓
- Queue table + expandable inline preview → Tasks 6, 7. ✓
- Shared preview component (refactor of `ImportClient`) → Task 5. ✓
- Slug collision (DB + within-batch) blocks only offending rows → Task 3 (`findDuplicateSlugs`) + Task 6/7 (`hasBlockingCollision`). ✓
- Reject without persisting; commit → draft with `/admin/posts/{id}` links → Task 7 (commit only included+ready; summary links). ✓
- sessionStorage persistence + size guard → Task 7. ✓
- Routing + nav links both directions → Task 7 (route, both links). ✓
- Admin styling / primaryColor / next-intl `admin.bulkImport.*` → Tasks 4, 6, 7 (Global Constraints). ✓
- Pure-logic unit tests → Tasks 1, 2, 3. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. UI tasks (5–7) use type-check/lint + an explicit manual checklist as verification (the repo has no React test harness — stated in the spec).

**Type consistency:** `BulkRow`, `BulkRowStatus`, `BulkAction`, `bulkInit`, `bulkReducer`, `findDuplicateSlugs` defined in Task 3 are consumed with matching shapes in Tasks 6–7. `parseBulkUrls` return shape (Task 1) matches Task 7 usage. `mapWithConcurrency` signature (Task 2) matches Task 7 calls. `ImportPreviewFields` props (Task 5) match Task 6 usage. Server action signatures match the Global Constraints block.

**Note on `hydrate` action:** Task 3's `BulkAction` includes `{ type: 'hydrate'; state: BulkState }`, used in Task 7 for both sessionStorage restore and resetting rows at extract start. Consistent.
