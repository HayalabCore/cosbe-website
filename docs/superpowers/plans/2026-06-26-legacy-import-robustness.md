# Legacy Import Robustness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a test safety net around the legacy import extraction pipeline so its heuristics can be changed with confidence, and fix the gaps the net exposes.

**Architecture:** Split a pure `extractFromHtml(html, url)` seam out of the network-bound `previewImport(url)`, then cover it with golden-fixture integration tests (real saved legacy HTML) plus targeted unit tests for the fiddly pure parsers. A `capture-fixture` script makes saving new regression cases a one-command habit. Hardening (e.g. `/news/` support, lazy-image handling) lands only when a failing test justifies it.

**Tech Stack:** TypeScript, Vitest, cheerio, Next.js. Tests run via `yarn test` (`vitest run`).

## Global Constraints

- Test runner is Vitest; run with `yarn test` (single run) or `yarn test:watch`.
- `yarn type-check` and `yarn lint` must stay clean.
- Block IDs come from `generateId()` (non-deterministic) — any snapshot of blocks MUST be normalized first.
- `previewImport(url)` public signature and runtime behavior must NOT change.
- Legacy host is `www.jp.cosbe.inc`; category map lives in `src/lib/legacy-import/types.ts`.
- Fixtures live in `src/lib/legacy-import/__fixtures__/<category>/<slug>.html`.

---

### Task 1: Extract the pure `extractFromHtml` seam

**Files:**

- Modify: `src/lib/legacy-import/index.ts`
- Test: `src/lib/legacy-import/extract.test.ts` (create)

**Interfaces:**

- Consumes: `loadLegacyHtml(html)` from `./fetch`; existing extractors from `./extractors`; `parseLegacyUrl` (already in `index.ts`).
- Produces: `extractFromHtml(html: string, url: string): Omit<ImportPreviewPayload, 'slugCollision'>` — pure, no network, no DB. `previewImport` keeps its existing signature and now delegates to it.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/legacy-import/extract.test.ts
import { describe, expect, it } from 'vitest';
import { extractFromHtml } from '@/lib/legacy-import';

const USEFUL_INFO_HTML = `
<html><body>
  <article class="l-mainContent__inner">
    <h1 class="c-postTitle__ttl">AIで変わる経営</h1>
    <div class="post_content">
      <h2>はじめに</h2>
      <p>これは本文の段落です。</p>
      <ul><li>項目1</li><li>項目2</li></ul>
    </div>
  </article>
</body></html>`;

describe('extractFromHtml', () => {
  it('extracts title, slug and blocks from useful-info HTML without network', () => {
    const result = extractFromHtml(
      USEFUL_INFO_HTML,
      'https://www.jp.cosbe.inc/useful-info/sample-post/'
    );
    expect(result.category).toBe('useful-info');
    expect(result.slug).toBe('sample-post');
    expect(result.title).toBe('AIで変わる経営');
    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.blocks.some((b) => b.type === 'heading')).toBe(true);
    expect('slugCollision' in result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/lib/legacy-import/extract.test.ts`
Expected: FAIL — `extractFromHtml is not a function` (not exported yet).

- [ ] **Step 3: Refactor `previewImport` to delegate to `extractFromHtml`**

In `src/lib/legacy-import/index.ts`, add the pure function and rewrite `previewImport` to use it. Keep the DB-backed slug check in `previewImport` only.

```ts
export function extractFromHtml(
  html: string,
  url: string
): Omit<ImportPreviewPayload, 'slugCollision'> {
  const { category } = parseLegacyUrl(url);
  const $ = loadLegacyHtml(html);
  const warnings: string[] = [];

  if (category === 'case-study') {
    const cs = extractCaseStudy($, url, warnings);
    return {
      sourceUrl: url.trim(),
      category,
      slug: cs.slug,
      title: cs.title,
      excerpt: cs.excerpt,
      featuredImageRemoteUrl: cs.featuredImageRemoteUrl,
      publishedAt: cs.publishedAt,
      tags: cs.tags,
      blocks: cs.blocks,
      caseStudyMeta: cs.caseStudyMeta,
      warnings,
    };
  }

  const extracted =
    category === 'useful-info'
      ? extractUsefulInfo($, url, warnings)
      : category === 'video'
        ? extractVideo($, url, warnings)
        : extractNotice($, url, warnings);

  return {
    sourceUrl: url.trim(),
    category,
    slug: extracted.slug,
    title: extracted.title,
    excerpt: extracted.excerpt,
    featuredImageRemoteUrl: extracted.featuredImageRemoteUrl,
    publishedAt: extracted.publishedAt,
    tags: extracted.tags,
    blocks: extracted.blocks,
    warnings,
  };
}

export async function previewImport(
  url: string
): Promise<ImportPreviewPayload> {
  parseLegacyUrl(url); // validate host + category early
  const html = await fetchLegacyHtml(url);
  const base = extractFromHtml(html, url);
  const slugCollision = !(await isImportSlugAvailable(base.slug));
  return { ...base, slugCollision };
}
```

Update the imports at the top of `index.ts` to drop the now-unused `loadLegacyHtml` double-load (it is now used inside `extractFromHtml`) and keep `fetchLegacyHtml`.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/lib/legacy-import/extract.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify nothing else broke**

Run: `yarn test && yarn type-check`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/legacy-import/index.ts src/lib/legacy-import/extract.test.ts
git commit -m "refactor: extract pure extractFromHtml seam from previewImport"
```

---

### Task 2: Support `/news/` URLs (known gap fix)

**Files:**

- Modify: `src/lib/legacy-import/types.ts:5-10`
- Test: `src/lib/legacy-import/category-map.test.ts` (create)

**Interfaces:**

- Consumes: `parseLegacyUrl` from `@/lib/legacy-import`.
- Produces: `/news/...` legacy URLs resolve to the `notice` category.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/legacy-import/category-map.test.ts
import { describe, expect, it } from 'vitest';
import { parseLegacyUrl } from '@/lib/legacy-import';

describe('parseLegacyUrl category mapping', () => {
  it('maps /news/ to the notice category', () => {
    expect(
      parseLegacyUrl('https://www.jp.cosbe.inc/news/media-1/').category
    ).toBe('notice');
  });

  it('still maps the legacy segments', () => {
    expect(
      parseLegacyUrl('https://www.jp.cosbe.inc/case-studies/kando/').category
    ).toBe('case-study');
    expect(
      parseLegacyUrl('https://www.jp.cosbe.inc/useful-movie/useful-movie-001/')
        .category
    ).toBe('video');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/lib/legacy-import/category-map.test.ts`
Expected: FAIL — `/news/` throws `UnsupportedCategoryError`.

- [ ] **Step 3: Add the `news` mapping**

In `src/lib/legacy-import/types.ts`:

```ts
export const PATH_SEGMENT_TO_CATEGORY: Record<string, ContentCategory> = {
  'case-studies': 'case-study',
  'useful-info': 'useful-info',
  'useful-movie': 'video',
  news: 'notice',
  notice: 'notice',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/lib/legacy-import/category-map.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/legacy-import/types.ts src/lib/legacy-import/category-map.test.ts
git commit -m "fix: map legacy /news/ URLs to notice category"
```

---

### Task 3: `fixturePathForUrl` helper + `normalizeForSnapshot`

**Files:**

- Create: `src/lib/legacy-import/fixtures.ts`
- Test: `src/lib/legacy-import/fixtures.test.ts`

**Interfaces:**

- Consumes: `PATH_SEGMENT_TO_CATEGORY`, `parseLegacyUrl` patterns.
- Produces:
  - `fixturePathForUrl(url: string): { category: ContentCategory; slug: string; relPath: string } | null` — returns `null` for non-article URLs (e.g. `/category/...`, unknown segments) instead of throwing.
  - `normalizeForSnapshot<T extends { blocks: { id: string }[] }>(payload: T): T` — returns a deep copy with every block `id` replaced by `'<id>'`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/legacy-import/fixtures.test.ts
import { describe, expect, it } from 'vitest';
import { fixturePathForUrl, normalizeForSnapshot } from './fixtures';

describe('fixturePathForUrl', () => {
  it('builds a category/slug path for an article URL', () => {
    expect(
      fixturePathForUrl('https://www.jp.cosbe.inc/useful-info/llmo-01/')
    ).toEqual({
      category: 'useful-info',
      slug: 'llmo-01',
      relPath: 'useful-info/llmo-01.html',
    });
  });

  it('maps /news/ articles under notice', () => {
    expect(
      fixturePathForUrl('https://www.jp.cosbe.inc/news/media-1/')?.relPath
    ).toBe('notice/media-1.html');
  });

  it('returns null for listing / non-article URLs', () => {
    expect(
      fixturePathForUrl('https://www.jp.cosbe.inc/category/case-studies/')
    ).toBeNull();
    expect(fixturePathForUrl('https://example.com/foo/')).toBeNull();
  });
});

describe('normalizeForSnapshot', () => {
  it('replaces every block id with a stable placeholder', () => {
    const out = normalizeForSnapshot({
      slug: 'x',
      blocks: [
        { id: 'abc123', type: 'heading' },
        { id: 'def456', type: 'paragraph' },
      ],
    });
    expect(out.blocks.map((b) => b.id)).toEqual(['<id>', '<id>']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/lib/legacy-import/fixtures.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `fixtures.ts`**

```ts
// src/lib/legacy-import/fixtures.ts
import type { ContentCategory } from '@/types';
import { LEGACY_HOST, PATH_SEGMENT_TO_CATEGORY } from './types';

export function fixturePathForUrl(
  url: string
): { category: ContentCategory; slug: string; relPath: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.hostname !== LEGACY_HOST) return null;

  const segments = parsed.pathname.split('/').filter(Boolean);
  const category = PATH_SEGMENT_TO_CATEGORY[segments[0] ?? ''];
  if (!category) return null; // unknown segment (e.g. "category")

  const slug = segments[segments.length - 1];
  if (!slug || segments.length < 2) return null; // listing page, no article slug

  return { category, slug, relPath: `${category}/${slug}.html` };
}

export function normalizeForSnapshot<
  T extends { blocks: Array<Record<string, unknown>> },
>(payload: T): T {
  return {
    ...payload,
    blocks: payload.blocks.map((b) => ({ ...b, id: '<id>' })),
  };
}
```

Note: `PATH_SEGMENT_TO_CATEGORY` keys `case-studies`/`useful-movie` map to category values `case-study`/`video`, so `relPath` uses the canonical category value, not the URL segment. Adjust the `news/media-1` expectation already accounts for this (`notice/media-1.html`).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/lib/legacy-import/fixtures.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/legacy-import/fixtures.ts src/lib/legacy-import/fixtures.test.ts
git commit -m "feat: add fixturePathForUrl and normalizeForSnapshot helpers"
```

---

### Task 4: `capture-fixture` script

**Files:**

- Create: `scripts/capture-fixture.ts`
- Modify: `package.json` (scripts section)

**Interfaces:**

- Consumes: `fetchLegacyHtml` from `@/lib/legacy-import/fetch`; `fixturePathForUrl` from `@/lib/legacy-import/fixtures`.
- Produces: `yarn capture-fixture <url>` writes `src/lib/legacy-import/__fixtures__/<relPath>`; prints a skip message and exits 0 for non-article URLs.

- [ ] **Step 1: Add the script file**

```ts
// scripts/capture-fixture.ts
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchLegacyHtml } from '../src/lib/legacy-import/fetch';
import { fixturePathForUrl } from '../src/lib/legacy-import/fixtures';

const FIXTURE_ROOT = path.join(
  process.cwd(),
  'src/lib/legacy-import/__fixtures__'
);

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: yarn capture-fixture <url>');
    process.exit(1);
  }

  const target = fixturePathForUrl(url);
  if (!target) {
    console.log(`Skipped (not an importable article URL): ${url}`);
    return;
  }

  const html = await fetchLegacyHtml(url);
  const dest = path.join(FIXTURE_ROOT, target.relPath);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, html, 'utf8');
  console.log(`Saved ${target.relPath} (${html.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Wire the yarn script**

Add to `package.json` `scripts`:

```json
"capture-fixture": "tsx scripts/capture-fixture.ts",
```

- [ ] **Step 3: Verify the skip path without network**

Run: `yarn capture-fixture https://www.jp.cosbe.inc/category/case-studies/`
Expected: prints `Skipped (not an importable article URL): ...`, exits 0, writes nothing.

- [ ] **Step 4: Commit**

```bash
git add scripts/capture-fixture.ts package.json
git commit -m "feat: add capture-fixture script for saving legacy HTML fixtures"
```

---

### Task 5: Capture the initial fixture corpus

**Files:**

- Create: `src/lib/legacy-import/__fixtures__/**/*.html` (real saved pages)

**Interfaces:**

- Consumes: `yarn capture-fixture` from Task 4.
- Produces: ~15–20 committed fixtures, ≥3 per category, that Task 6 globs over.

- [ ] **Step 1: Capture a representative subset (3–4 per category)**

Run each (network required — these are real pages):

```bash
yarn capture-fixture https://www.jp.cosbe.inc/case-studies/2month-ai-mvp/
yarn capture-fixture https://www.jp.cosbe.inc/case-studies/kando/
yarn capture-fixture https://www.jp.cosbe.inc/case-studies/cosbe/
yarn capture-fixture https://www.jp.cosbe.inc/useful-info/llmo-01/
yarn capture-fixture https://www.jp.cosbe.inc/useful-info/ai-business-transformation/
yarn capture-fixture https://www.jp.cosbe.inc/useful-info/ai-transformation-blog1/
yarn capture-fixture https://www.jp.cosbe.inc/useful-info/llmo-10/
yarn capture-fixture https://www.jp.cosbe.inc/useful-movie/useful-movie-001/
yarn capture-fixture https://www.jp.cosbe.inc/useful-movie/useful-movie-010/
yarn capture-fixture https://www.jp.cosbe.inc/useful-movie/useful-movie-020/
yarn capture-fixture https://www.jp.cosbe.inc/news/media-1/
yarn capture-fixture https://www.jp.cosbe.inc/news/ai-transformation/
yarn capture-fixture https://www.jp.cosbe.inc/news/2025-02-26-webinar-cosbe/
yarn capture-fixture https://www.jp.cosbe.inc/news/news-260115-01/
```

- [ ] **Step 2: Confirm files landed**

Run: `find src/lib/legacy-import/__fixtures__ -name '*.html' | sort`
Expected: one file per URL above, grouped under `case-study/`, `useful-info/`, `video/`, `notice/`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/legacy-import/__fixtures__
git commit -m "test: capture representative legacy import fixtures"
```

---

### Task 6: Golden-fixture extraction tests

**Files:**

- Test: `src/lib/legacy-import/extract.fixtures.test.ts` (create)

**Interfaces:**

- Consumes: `extractFromHtml` (Task 1), `fixturePathForUrl`/`normalizeForSnapshot` (Task 3), fixtures (Task 5).
- Produces: per-fixture invariant assertions + a normalized snapshot.

- [ ] **Step 1: Write the fixture-driven test**

```ts
// src/lib/legacy-import/extract.fixtures.test.ts
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractFromHtml } from './index';
import { normalizeForSnapshot } from './fixtures';
import type { ContentCategory } from '@/types';

const FIXTURE_ROOT = path.join(__dirname, '__fixtures__');
const files = globSync('**/*.html', { cwd: FIXTURE_ROOT });

// category dir -> a representative legacy URL prefix for slug derivation
const SEGMENT: Record<ContentCategory, string> = {
  'case-study': 'case-studies',
  'useful-info': 'useful-info',
  video: 'useful-movie',
  notice: 'news',
};

describe('extractFromHtml on real fixtures', () => {
  if (files.length === 0) {
    it('has fixtures committed', () => {
      throw new Error('No fixtures found — run yarn capture-fixture first');
    });
    return;
  }

  it.each(files)('extracts %s without falling back', (rel) => {
    const category = rel.split('/')[0] as ContentCategory;
    const slug = path.basename(rel, '.html');
    const url = `https://www.jp.cosbe.inc/${SEGMENT[category]}/${slug}/`;
    const html = readFileSync(path.join(FIXTURE_ROOT, rel), 'utf8');

    const result = extractFromHtml(html, url);

    expect(result.category).toBe(category);
    expect(result.slug).toBe(slug);
    expect(result.title.trim().length).toBeGreaterThan(0);
    expect(result.blocks.length).toBeGreaterThan(0);
    // not the lone fallback paragraph
    expect(
      result.blocks.length === 1 &&
        result.blocks[0].type === 'paragraph' &&
        result.blocks[0].content.startsWith('Imported article')
    ).toBe(false);

    if (category === 'case-study') {
      expect(result.caseStudyMeta).toBeDefined();
    }

    expect(normalizeForSnapshot(result)).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run and inspect the snapshots**

Run: `yarn test src/lib/legacy-import/extract.fixtures.test.ts`
Expected: PASS; snapshot file created under `src/lib/legacy-import/__snapshots__/`. Review the snapshot diff to confirm extraction looks sane (titles, block order, no garbage).

- [ ] **Step 3: Commit**

```bash
git add src/lib/legacy-import/extract.fixtures.test.ts src/lib/legacy-import/__snapshots__
git commit -m "test: golden-fixture coverage for legacy extraction"
```

---

### Task 7: Targeted unit tests for tricky parsers

**Files:**

- Modify: `src/lib/legacy-import/date.ts` (export already present)
- Test: `src/lib/legacy-import/parsers.test.ts` (create)

**Interfaces:**

- Consumes: `parseLegacyDate` (`./date`), `youtubeUrlFromText` (`./shared`).
- Produces: regression coverage for the date and youtube parsers. (Table and paragraph-merge helpers are currently unexported internals of `shared.ts`; see Step 4.)

- [ ] **Step 1: Write the date + youtube tests**

```ts
// src/lib/legacy-import/parsers.test.ts
import { describe, expect, it } from 'vitest';
import { parseLegacyDate } from './date';
import { youtubeUrlFromText } from './shared';

describe('parseLegacyDate', () => {
  it('parses Japanese date text to ISO UTC midnight', () => {
    expect(parseLegacyDate('2024年8月31日')).toBe('2024-08-31T00:00:00.000Z');
  });
  it('returns null on unparseable text', () => {
    expect(parseLegacyDate('not a date')).toBeNull();
  });
});

describe('youtubeUrlFromText', () => {
  it.each([
    ['https://www.youtube.com/watch?v=ABC123', 'ABC123'],
    ['see https://youtu.be/XYZ789 now', 'XYZ789'],
    ['https://www.youtube.com/embed/QWE456', 'QWE456'],
  ])('normalizes %s', (input, id) => {
    expect(youtubeUrlFromText(input)).toBe(
      `https://www.youtube.com/watch?v=${id}`
    );
  });
  it('returns null when no youtube url present', () => {
    expect(youtubeUrlFromText('https://example.com/video')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify**

Run: `yarn test src/lib/legacy-import/parsers.test.ts`
Expected: PASS (both helpers already exported).

- [ ] **Step 3: Commit**

```bash
git add src/lib/legacy-import/parsers.test.ts
git commit -m "test: unit coverage for date and youtube parsers"
```

- [ ] **Step 4: Export and test `extractTable` + paragraph merge**

`extractTable`, `mergeConsecutiveParagraphs`, and `isStandaloneCalloutParagraph` are not currently exported from `shared.ts`. Export them (add `export` to each declaration), then add tests:

```ts
// append to src/lib/legacy-import/parsers.test.ts
import * as cheerio from 'cheerio';
import { extractTable } from './shared';

describe('extractTable', () => {
  it('uses thead for headers and tbody for rows', () => {
    const $ = cheerio.load(
      '<table><thead><tr><th>A</th><th>B</th></tr></thead>' +
        '<tbody><tr><td>1</td><td>2</td></tr></tbody></table>'
    );
    const block = extractTable($, $('table')[0]);
    expect(block).toMatchObject({
      type: 'table',
      headers: ['A', 'B'],
      rows: [['1', '2']],
    });
  });

  it('falls back to first row as headers when no thead', () => {
    const $ = cheerio.load(
      '<table><tr><td>H1</td><td>H2</td></tr><tr><td>x</td><td>y</td></tr></table>'
    );
    const block = extractTable($, $('table')[0]);
    expect(block).toMatchObject({ headers: ['H1', 'H2'], rows: [['x', 'y']] });
  });

  it('returns null for an empty table', () => {
    const $ = cheerio.load('<table></table>');
    expect(extractTable($, $('table')[0])).toBeNull();
  });
});
```

- [ ] **Step 5: Run, type-check, lint**

Run: `yarn test src/lib/legacy-import/parsers.test.ts && yarn type-check && yarn lint`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/legacy-import/shared.ts src/lib/legacy-import/parsers.test.ts
git commit -m "test: cover extractTable; export internals for testing"
```

---

### Task 8: Hardening — lazy/`srcset` images (test-driven)

**Files:**

- Modify: `src/lib/legacy-import/shared.ts` (image branch of `walkBlocks`)
- Test: `src/lib/legacy-import/parsers.test.ts` (append)

**Interfaces:**

- Consumes: `walkBlocks`/`findContentRoot` from `./shared`.
- Produces: images using only `srcset` (no `src`) are still extracted.

> Only implement the fix if Step 2 actually fails. If the existing `src || data-src` logic already covers your fixtures, mark this task done with a note and skip the code change.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/lib/legacy-import/parsers.test.ts
import { findContentRoot, walkBlocks } from './shared';

describe('walkBlocks image handling', () => {
  it('extracts an image that only has srcset', () => {
    const $ = cheerio.load(
      '<div class="entry-content"><img srcset="https://cdn.example.com/a.jpg 1x"></div>'
    );
    const root = findContentRoot($);
    const blocks = walkBlocks($, root, 'https://www.jp.cosbe.inc/x/y/', []);
    const img = blocks.find((b) => b.type === 'image');
    expect(img).toBeDefined();
    expect(img && 'url' in img && img.url).toContain('a.jpg');
  });
});
```

`findContentRoot` and `walkBlocks` are already exported from `shared.ts`.

- [ ] **Step 2: Run to see whether it fails**

Run: `yarn test src/lib/legacy-import/parsers.test.ts -t "srcset"`
Expected: FAIL (current code reads only `src`/`data-src`). If it PASSES, stop — record that no change is needed and skip to Step 5.

- [ ] **Step 3: Add `srcset` fallback in the image branch of `walkBlocks`**

In `src/lib/legacy-import/shared.ts`, the `if (tag === 'img')` branch:

```ts
if (tag === 'img') {
  let src = $el.attr('src') || $el.attr('data-src');
  if (!src) {
    const srcset = $el.attr('srcset') || $el.attr('data-srcset');
    if (srcset) src = srcset.split(',')[0]?.trim().split(/\s+/)[0];
  }
  if (!src) return;
  blocks.push({
    id: generateId(),
    type: 'image',
    url: resolveUrl(src, pageUrl),
    alt: $el.attr('alt') || '',
  });
  return;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `yarn test src/lib/legacy-import/parsers.test.ts -t "srcset"`
Expected: PASS.

- [ ] **Step 5: Full suite + checks, then commit**

Run: `yarn test && yarn type-check && yarn lint`
Expected: all green. Re-run `yarn test` — if fixture snapshots changed because more images are now captured, review and update with `yarn test -u`.

```bash
git add src/lib/legacy-import/shared.ts src/lib/legacy-import/parsers.test.ts src/lib/legacy-import/__snapshots__
git commit -m "fix: extract srcset-only images during legacy import"
```

---

## Self-Review

**Spec coverage:**

- Section 1 (testability seam) → Task 1. ✓
- Section 2 (fixtures + capture script, skip non-articles) → Tasks 3, 4, 5. ✓
- Section 3 (ID normalization, golden-fixture tests, targeted unit tests) → Tasks 3, 6, 7. ✓
- Section 4 (`/news/` fix, srcset hardening, scope discipline) → Tasks 2, 8 (Task 8 gated on a real failure). ✓
- Success criteria (`yarn test`/`type-check`/`lint` green; news imports) → covered by Tasks 2, 7, 8 checks. ✓

**Placeholder scan:** No TBD/TODO; every code step shows real code; gated Task 8 explicitly says skip-if-passing rather than leaving it vague.

**Type consistency:** `extractFromHtml` returns `Omit<ImportPreviewPayload, 'slugCollision'>` in Task 1 and is consumed with that shape in Task 6. `fixturePathForUrl`/`normalizeForSnapshot` signatures in Task 3 match their use in Tasks 4 and 6. `parseLegacyUrl` usage matches its existing export.

**Note on fixtures (Tasks 5–6):** capture requires live network access to `www.jp.cosbe.inc`. If a page is unreachable at execution time, substitute another URL of the same category from the team's mapping list — the tests glob whatever is committed.
