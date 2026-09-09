# Admin Panel Test Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). The user asked for inline execution, not subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add phased Vitest coverage for the logged-in admin panel (unit + component + a small real-Postgres slice), running on every PR and `master` so a red CI can gate Vercel.

**Architecture:** Three Vitest projects (`unit`, `component`, `db`). Server actions are tested with `requireUser` and repositories mocked. Admin UI is tested with Testing Library + `next-intl`. Risky writes (duplicate slug, archive/restore/hard-delete, bulk status) hit a CI Postgres service via `yarn test:db`. No Playwright, no live Supabase/OpenAI.

**Tech Stack:** Vitest 4, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, Prisma, Next.js 16 server actions, next-intl.

**Spec:** `docs/superpowers/specs/2026-09-09-admin-test-strategy-design.md`

## Global Constraints

- **No git commits.** Do not run `git add` or `git commit`. Verification is `yarn test` / `yarn test:db` / `yarn type-check` / `yarn lint`.
- Do not add Playwright, MSW, or a test admin user / `.env` password.
- Do not hit live Supabase, Storage, or OpenAI. Mock `@/lib/storage`, `@/lib/openai-translate`, and `next/cache`.
- Do not “fix” product bugs in these tasks (including `updateArticleAction` persisting raw `data` after `safeParse`). Tests document current behavior.
- There is **no** client-side max-file-size guard today. Do not add one. Media tests assert `accept="image/*"` and that a storage throw surfaces `alert`.
- `DividerBlockEditor` has no `onChange`. Test that it renders; do not invent an onChange API.
- `saveTranslation` / `translateKeyToEnglish` / `deleteTranslationHistoryItem` / `restoreTranslation` catch errors and return `{ ok: false, error }` — including `'Unauthorized'`. Other translation list actions throw.
- `yarn test` = unit + component only (no Docker). `yarn test:db` requires `ADMIN_TEST_DB=1` and migrated Postgres.
- Existing `src/lib/validation/article.test.ts` and `src/lib/legacy-import/**/*.test.ts` stay; extend, do not rewrite.
- All new user-facing test strings come from existing `admin.*` message keys. Do not add production copy just for tests.
- Lint has pre-existing admin warnings — do not add new errors.

---

## File structure

| File                                                           | Responsibility                                          |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| `vitest.config.ts`                                             | Three projects; `@` alias; exclude flatten round-trip   |
| `package.json`                                                 | `test`, `test:db`; RTL/jsdom deps                       |
| `.github/workflows/ci.yml`                                     | Dummy-env `yarn test`, then Postgres + `yarn test:db`   |
| `src/test/server-only-stub.ts`                                 | Empty module so `import 'server-only'` does not throw   |
| `src/test/setup-jsdom.ts`                                      | jest-dom, `alert`/`confirm` stubs                       |
| `src/test/setup-db.ts`                                         | Fail fast unless `ADMIN_TEST_DB=1`                      |
| `src/test/require-user.ts`                                     | `authedUser()` / `unauth()` for mocked `requireUser`    |
| `src/test/render-admin.tsx`                                    | RTL render + `NextIntlClientProvider` (`admin-en.json`) |
| `src/test/fixtures/articles.ts`                                | `listItem()` / `createPayload()` factories              |
| `src/lib/admin/build-article-payload.ts`                       | Extracted from `PostEditor`                             |
| `src/lib/admin/build-article-payload.test.ts`                  | Payload/slug/tags/case-study unit tests                 |
| `src/actions/articles.test.ts`                                 | Auth, Zod, bulk no-op, not-found                        |
| `src/components/admin/PostEditor.test.tsx`                     | Save/autosave/translate                                 |
| `src/components/admin/blocks/block-editors.test.tsx`           | Shallow onChange per block type                         |
| `src/lib/prisma.db.test.ts`                                    | `SELECT 1` smoke (Phase 1)                              |
| `src/lib/articles-repository.db.test.ts`                       | Unique slug, archive chain, bulk (Phases 2–3)           |
| `src/app/admin/(protected)/dashboard/DashboardClient.test.tsx` | Table/filters/bulk/alerts                               |
| `src/app/api/admin/media/route.test.ts`                        | 401 + clamp                                             |
| `src/actions/media.test.ts`                                    | record/delete/not-found/storage swallow                 |
| `src/app/admin/(protected)/media/page.test.tsx`                | Upload accept, debounce, delete confirm                 |
| `src/actions/legacy-import.test.ts`                            | Auth, slug collision, draft commit                      |
| `src/app/admin/(protected)/import/BulkImportClient.test.tsx`   | Failed row UI isolation                                 |
| `src/actions/translations.test.ts`                             | Auth + save/history/restore/AI mock                     |
| `src/actions/block-translation.test.ts`                        | Auth + partial meta error                               |
| `src/components/admin/translations/TranslationRow.test.tsx`    | Save + history load                                     |
| `src/app/admin/(protected)/AdminProtectedShell.test.tsx`       | Nav, sign out, locale, drawer                           |
| `src/app/admin/(protected)/layout.test.ts`                     | Redirect when logged out                                |

---

### Task 1: Vitest harness (unit + component + db smoke)

**Files:**

- Modify: `package.json`, `vitest.config.ts`, `.github/workflows/ci.yml`
- Create: `src/test/server-only-stub.ts`, `src/test/setup-jsdom.ts`, `src/test/setup-db.ts`, `src/test/require-user.ts`, `src/test/render-admin.tsx`, `src/test/fixtures/articles.ts`, `src/lib/prisma.db.test.ts`

**Interfaces:**

- Consumes: existing `vitest.config.ts` alias `@` → `src`.
- Produces: `authedUser()`, `unauth()`, `renderAdmin(ui)`, `listItem(overrides?)`, `yarn test`, `yarn test:db`.

- [ ] **Step 1: Install test deps and add scripts**

```bash
yarn add -D jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

In `package.json` scripts, set:

```json
"test": "vitest run --project unit --project component",
"test:watch": "vitest --project unit --project component",
"test:db": "vitest run --project db"
```

Leave `"test:translations-flatten"` unchanged.

- [ ] **Step 2: Replace `vitest.config.ts`**

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = fileURLToPath(new URL('./src', import.meta.url));
const serverOnlyStub = fileURLToPath(
  new URL('./src/test/server-only-stub.ts', import.meta.url)
);

const shared = {
  resolve: {
    alias: {
      '@': src,
      'server-only': serverOnlyStub,
    },
  },
};

export default defineConfig({
  ...shared,
  test: {
    projects: [
      {
        ...shared,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: [
            'src/**/*.db.test.ts',
            'src/lib/translations/flatten.roundtrip.test.ts',
          ],
        },
      },
      {
        ...shared,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['src/test/setup-jsdom.ts'],
        },
      },
      {
        ...shared,
        test: {
          name: 'db',
          environment: 'node',
          include: ['src/**/*.db.test.ts'],
          setupFiles: ['src/test/setup-db.ts'],
        },
      },
    ],
  },
});
```

- [ ] **Step 3: Create helper files**

`src/test/server-only-stub.ts`:

```ts
export {};
```

`src/test/setup-jsdom.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

vi.stubGlobal(
  'alert',
  vi.fn(() => undefined)
);
vi.stubGlobal(
  'confirm',
  vi.fn(() => true)
);
```

`src/test/setup-db.ts`:

```ts
if (process.env.ADMIN_TEST_DB !== '1') {
  throw new Error(
    'yarn test:db requires ADMIN_TEST_DB=1 and a migrated Postgres'
  );
}
```

`src/test/require-user.ts`:

```ts
import { vi } from 'vitest';
import { requireUser } from '@/lib/require-user';

const authed = {
  user: { id: 'user-1', email: 'admin@test.local' },
  supabase: { storage: { from: vi.fn() } },
};

export function authedUser() {
  vi.mocked(requireUser).mockResolvedValue(authed as never);
}

export function unauth() {
  vi.mocked(requireUser).mockRejectedValue(new Error('Unauthorized'));
}
```

`src/test/render-admin.tsx`:

```tsx
import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import adminEn from '../../messages/admin-en.json';
import type { ReactElement } from 'react';

/** Matches `src/app/admin/layout.tsx`: messages.admin = admin-en.json. */
export function renderAdmin(ui: ReactElement, options?: RenderOptions) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ admin: adminEn }}>
      {ui}
    </NextIntlClientProvider>,
    options
  );
}
```

`src/test/fixtures/articles.ts`:

```ts
import type { Article, ArticleListItem } from '@/types';

export function listItem(
  overrides: Partial<ArticleListItem> = {}
): ArticleListItem {
  return {
    id: 'art-1',
    slug: 'hello',
    title: 'Hello',
    category: 'useful-info',
    tags: [],
    author: { id: 'a1', name: 'Ada', designation: 'Editor' },
    publishedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'draft',
    ...overrides,
  };
}

export function createPayload(
  overrides: Partial<Omit<Article, 'id' | 'createdAt' | 'updatedAt'>> = {}
): Omit<Article, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    slug: 'hello',
    title: 'Hello',
    status: 'draft',
    category: 'useful-info',
    tags: [],
    author: { id: '', name: 'Ada', designation: 'Editor' },
    blocks: [{ id: 'p1', type: 'paragraph', content: '<p>Hi</p>' }],
    toc: [],
    publishedAt: null,
    ...overrides,
  };
}
```

`src/lib/prisma.db.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { prisma } from './prisma';

describe('db smoke', () => {
  it('selects 1', async () => {
    const rows = await prisma.$queryRaw<Array<{ n: number }>>`SELECT 1 as n`;
    expect(rows[0]?.n).toBe(1);
  });
});
```

- [ ] **Step 4: Update `.github/workflows/ci.yml`**

Keep the existing job `env` dummy URLs. Add a Postgres service and a second test step:

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cosbe_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

steps:
  # ... existing checkout, node, yarn install, lint, type-check ...

  - name: Test
    run: yarn test

  - name: Test (db slice)
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/cosbe_test?schema=public
      DIRECT_URL: postgresql://postgres:postgres@localhost:5432/cosbe_test?schema=public
      ADMIN_TEST_DB: '1'
    run: yarn prisma migrate deploy && yarn test:db
```

Keep the dummy `DATABASE_URL` / `DIRECT_URL` on the **job** `env` so `yarn test` still instantiates Prisma without connecting.

- [ ] **Step 5: Run unit/component tests**

Run: `yarn test`

Expected: PASS (existing tests still collected under `unit`).

- [ ] **Step 6: Confirm `yarn test:db` fails without the flag**

Run: `yarn test:db`

Expected: FAIL with `yarn test:db requires ADMIN_TEST_DB=1`.

- [ ] **Step 7: Type-check**

Run: `yarn type-check`

Expected: PASS.

---

### Task 2: Extract `buildArticlePayload`

**Files:**

- Create: `src/lib/admin/build-article-payload.ts`, `src/lib/admin/build-article-payload.test.ts`
- Modify: `src/components/admin/PostEditor.tsx` (delete local function; import helper). Optionally `export const AUTOSAVE_INTERVAL_MS = 10_000` from `PostEditor.tsx`.

**Interfaces:**

- Consumes: `createFallbackSlug`, `generateTOC` from `@/lib/article-utils`; `Article`, `ArticleSEO`, `ArticleStatus`, `CaseStudyMeta`, `ContentBlock`, `ContentCategory` from `@/types`.
- Produces:

```ts
export const DEFAULT_EDITOR_AUTHOR = {
  id: 'author-1',
  name: 'Editor',
  designation: 'CosBE',
};

export type BuildArticlePayloadArgs = {
  /* same fields as current BuildPayloadArgs */
};

export function buildArticlePayload(
  args: BuildArticlePayloadArgs
): Omit<Article, 'id' | 'createdAt' | 'updatedAt'>;
```

Move the function **verbatim** from `PostEditor.tsx` (including untitled fallback, tag split, publishedAt stamp, avatar dirty, case-study-only-when-category). Do not change behavior.

- [ ] **Step 1: Write the failing tests** (file does not exist yet)

```ts
import { describe, expect, it } from 'vitest';
import { buildArticlePayload } from './build-article-payload';
import type { ContentBlock } from '@/types';

const blocks: ContentBlock[] = [
  { id: 'h1', type: 'heading', level: 2, content: '見出し' },
  { id: 'p1', type: 'paragraph', content: '<p>hello world</p>' },
  { id: 't1', type: 'table', headers: ['A'], rows: [['1']] },
  { id: 'd1', type: 'divider' },
];

function args(
  overrides: Partial<Parameters<typeof buildArticlePayload>[0]> = {}
) {
  return {
    title: 'My Post',
    titleEn: ' My EN ',
    slug: 'my-post',
    excerpt: 'excerpt',
    excerptEn: ' excerpt en ',
    featuredImage: ' https://cdn.example/a.png ',
    showFeaturedImage: false,
    category: 'useful-info' as const,
    tagsStr: 'a, b, ,c',
    status: 'draft' as const,
    authorName: 'Ada',
    authorDesignation: 'Editor',
    authorAvatarUrl: ' https://cdn.example/av.png ',
    authorAvatarDirty: false,
    seo: {},
    blocks,
    untitledFallback: 'Untitled',
    currentPublishedAt: null,
    caseStudy: { aiModels: [], clientName: 'Acme' },
    ...overrides,
  };
}

describe('buildArticlePayload', () => {
  it('uses untitled fallback when title is empty', () => {
    expect(buildArticlePayload(args({ title: '' })).title).toBe('Untitled');
  });

  it('derives slug from title when slug is empty', () => {
    const p = buildArticlePayload(args({ slug: '', title: 'Hello World' }));
    expect(p.slug).toBe('hello-world');
  });

  it('splits and trims tags, dropping empties', () => {
    expect(buildArticlePayload(args()).tags).toEqual(['a', 'b', 'c']);
  });

  it('omits caseStudy unless category is case-study', () => {
    expect(buildArticlePayload(args()).caseStudy).toBeUndefined();
    expect(
      buildArticlePayload(args({ category: 'case-study' })).caseStudy
    ).toEqual({ aiModels: [], clientName: 'Acme' });
  });

  it('omits author.avatarUrl when not dirty', () => {
    expect(buildArticlePayload(args()).author.avatarUrl).toBeUndefined();
  });

  it('sends trimmed avatarUrl when dirty, including empty string', () => {
    expect(
      buildArticlePayload(args({ authorAvatarDirty: true })).author.avatarUrl
    ).toBe('https://cdn.example/av.png');
    expect(
      buildArticlePayload(
        args({ authorAvatarDirty: true, authorAvatarUrl: '  ' })
      ).author.avatarUrl
    ).toBe('');
  });

  it('stamps publishedAt on first publish and keeps existing', () => {
    const first = buildArticlePayload(args({ status: 'published' }));
    expect(first.publishedAt).toBeTruthy();
    const kept = buildArticlePayload(
      args({
        status: 'published',
        currentPublishedAt: '2020-01-01T00:00:00.000Z',
      })
    );
    expect(kept.publishedAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('clears publishedAt when status is not published', () => {
    expect(
      buildArticlePayload(
        args({
          status: 'draft',
          currentPublishedAt: '2020-01-01T00:00:00.000Z',
        })
      ).publishedAt
    ).toBeNull();
  });

  it('round-trips showFeaturedImage and featuredImage', () => {
    const p = buildArticlePayload(args());
    expect(p.showFeaturedImage).toBe(false);
    expect(p.featuredImage).toBe('https://cdn.example/a.png');
  });

  it('accepts every block type in the fixture without throwing', () => {
    expect(buildArticlePayload(args()).blocks).toHaveLength(4);
  });

  it('trims titleEn/excerptEn empty to undefined', () => {
    const p = buildArticlePayload(args({ titleEn: '  ', excerptEn: '  ' }));
    expect(p.titleEn).toBeUndefined();
    expect(p.excerptEn).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL** (cannot find module)

Run: `yarn test src/lib/admin/build-article-payload.test.ts`

Expected: FAIL, module not found.

- [ ] **Step 3: Extract implementation**

Create `src/lib/admin/build-article-payload.ts` with the current `PostEditor.tsx` `buildArticlePayload` body (copy, do not rewrite). Export `DEFAULT_EDITOR_AUTHOR` (the current `defaultAuthor` object). Point `PostEditor.tsx` at it. Keep `AUTOSAVE_INTERVAL_MS` exported from `PostEditor.tsx` as `export const AUTOSAVE_INTERVAL_MS = 10_000`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `yarn test src/lib/admin/build-article-payload.test.ts`

Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `yarn type-check`

Expected: PASS.

---

### Task 3: Article server actions

**Files:**

- Create: `src/actions/articles.test.ts`
- Test also covers `listArticlesAdminAction` page/pageSize clamp from the spec.

**Interfaces:**

- Consumes: `authedUser`, `unauth` from `src/test/require-user.ts`; `createPayload` from fixtures.
- Mocks: `server-only` (alias), `@/lib/require-user`, `@/lib/articles`, `@/lib/article-revalidation`, `next/cache`.

- [ ] **Step 1: Write `src/actions/articles.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authedUser, unauth } from '@/test/require-user';
import { createPayload } from '@/test/fixtures/articles';

vi.mock('@/lib/require-user', () => ({
  requireUser: vi.fn(),
}));

vi.mock('@/lib/article-revalidation', () => ({
  revalidateArticlePaths: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/articles', () => ({
  createArticleRecord: vi.fn(),
  updateArticleRecord: vi.fn(),
  archiveArticleRecord: vi.fn(),
  deleteArticleRecord: vi.fn(),
  getArticleByIdAdmin: vi.fn(),
  getArticleSlugCategoryById: vi.fn(),
  getArticles: vi.fn(),
  countArticles: vi.fn(),
  getArticleStatusCounts: vi.fn(),
  publishArticleRecord: vi.fn(),
  unpublishArticleRecord: vi.fn(),
  publishArticlesRecord: vi.fn(),
  unpublishArticlesRecord: vi.fn(),
  archiveArticlesRecord: vi.fn(),
  deleteArticlesRecord: vi.fn(),
}));

import {
  archiveArticleAction,
  archiveArticlesAction,
  createArticleAction,
  deleteArticlesAction,
  hardDeleteArticleAction,
  listArticlesAdminAction,
  publishArticleAction,
  publishArticlesAction,
  restoreArticleAction,
  unpublishArticleAction,
  unpublishArticlesAction,
  updateArticleAction,
} from './articles';
import * as articles from '@/lib/articles';
import { requireUser } from '@/lib/require-user';

describe('article actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedUser();
  });

  it('createArticleAction throws Unauthorized when logged out', async () => {
    unauth();
    await expect(createArticleAction(createPayload())).rejects.toThrow(
      'Unauthorized'
    );
    expect(articles.createArticleRecord).not.toHaveBeenCalled();
  });

  it('createArticleAction persists the normalized payload', async () => {
    vi.mocked(articles.createArticleRecord).mockResolvedValue('new-id');
    const id = await createArticleAction(
      createPayload({ titleEn: '   ', toc: [{ id: 'x', level: 2, text: 't' }] })
    );
    expect(id).toBe('new-id');
    const sent = vi.mocked(articles.createArticleRecord).mock.calls[0][0];
    expect(sent.titleEn).toBeUndefined();
    expect(sent.toc).toEqual([]);
  });

  it('createArticleAction throws Zod details on empty title', async () => {
    await expect(
      createArticleAction(createPayload({ title: '   ' }))
    ).rejects.toThrow(/Invalid article data/);
    expect(articles.createArticleRecord).not.toHaveBeenCalled();
  });

  it('updateArticleAction throws Zod details on invalid status', async () => {
    await expect(
      updateArticleAction('id-1', { status: 'bogus' as never })
    ).rejects.toThrow(/Invalid article data/);
  });

  it('updateArticleAction documents current behavior: valid extra keys are not the parsed object', async () => {
    vi.mocked(articles.updateArticleRecord).mockResolvedValue(undefined);
    const raw = { title: 'Ok', extra: 'still-passed' };
    await updateArticleAction('id-1', raw as never);
    expect(articles.updateArticleRecord).toHaveBeenCalledWith('id-1', raw);
  });

  it('restore/publish/unpublish throw Not found when missing', async () => {
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue(null);
    await expect(restoreArticleAction('missing')).rejects.toThrow('Not found');
    await expect(publishArticleAction('missing')).rejects.toThrow('Not found');
    await expect(unpublishArticleAction('missing')).rejects.toThrow(
      'Not found'
    );
  });

  it('empty bulk ids are no-ops', async () => {
    await publishArticlesAction([]);
    await unpublishArticlesAction([]);
    await archiveArticlesAction([]);
    await deleteArticlesAction([]);
    expect(articles.publishArticlesRecord).not.toHaveBeenCalled();
    expect(articles.unpublishArticlesRecord).not.toHaveBeenCalled();
    expect(articles.archiveArticlesRecord).not.toHaveBeenCalled();
    expect(articles.deleteArticlesRecord).not.toHaveBeenCalled();
  });

  it('listArticlesAdminAction clamps page and pageSize', async () => {
    vi.mocked(articles.getArticles).mockResolvedValue([]);
    vi.mocked(articles.countArticles).mockResolvedValue(0);
    vi.mocked(articles.getArticleStatusCounts).mockResolvedValue({
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
    });
    await listArticlesAdminAction({ page: 0, pageSize: 999 });
    expect(articles.getArticles).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 100 }),
      true
    );
  });

  it('archive and hardDelete require a user', async () => {
    unauth();
    await expect(
      archiveArticleAction('id', 'slug', 'useful-info')
    ).rejects.toThrow('Unauthorized');
    await expect(
      hardDeleteArticleAction('id', 'slug', 'useful-info')
    ).rejects.toThrow('Unauthorized');
  });
});
```

Also add one `it` per remaining article action (`getArticleByIdAction`, `unpublishArticlesAction` authed path) asserting `requireUser` was called — same file.

- [ ] **Step 2: Run tests**

Run: `yarn test src/actions/articles.test.ts`

Expected: PASS (actions already exist; these are characterization tests). If import of `@/lib/articles` still pulls `server-only` despite alias, the alias is working when the mock is in place; if FAIL on `react/cache`, mock `react` `cache` or import repository mocks only. Fix the mock until green — do not change production action signatures.

- [ ] **Step 3: Type-check**

Run: `yarn type-check`

Expected: PASS.

---

### Task 4: PostEditor + block editors

**Files:**

- Create: `src/components/admin/PostEditor.test.tsx`, `src/components/admin/blocks/block-editors.test.tsx`
- Modify: none except exporting `AUTOSAVE_INTERVAL_MS` if not done in Task 2.

**Interfaces:**

- Consumes: `renderAdmin`, `buildArticlePayload` (already extracted), `AUTOSAVE_INTERVAL_MS`.
- Mocks: `@/actions/articles`, `@/actions/block-translation`, `next/navigation`, `next/dynamic` (identity stub that returns `() => null`), `@/components/admin/AdminViewArticleContext`.

- [ ] **Step 1: Write `PostEditor.test.tsx`**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';
import { AUTOSAVE_INTERVAL_MS } from './PostEditor';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  usePathname: () => '/admin/posts/new',
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('@/components/admin/AdminViewArticleContext', () => ({
  useAdminViewArticleLink: () => ({ setViewArticleHref: vi.fn() }),
}));

const createArticleAction = vi.fn();
const updateArticleAction = vi.fn();
vi.mock('@/actions/articles', () => ({
  createArticleAction: (...a: unknown[]) => createArticleAction(...a),
  updateArticleAction: (...a: unknown[]) => updateArticleAction(...a),
}));

const translateArticleEnAction = vi.fn();
vi.mock('@/actions/block-translation', () => ({
  translateArticleEnAction: (...a: unknown[]) => translateArticleEnAction(...a),
}));

import PostEditor from './PostEditor';
import { listItem } from '@/test/fixtures/articles';
import type { Article } from '@/types';

function article(overrides: Partial<Article> = {}): Article {
  const item = listItem();
  return {
    ...item,
    status: 'draft',
    blocks: [{ id: 'p1', type: 'paragraph', content: '<p>Hi</p>' }],
    toc: [],
    publishedAt: null,
    updatedAt: item.createdAt,
    ...overrides,
  };
}

describe('PostEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.confirm).mockReturnValue(true);
  });

  it('creates then replaces URL on first save', async () => {
    createArticleAction.mockResolvedValue('new-id');
    renderAdmin(<PostEditor />);
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(createArticleAction).toHaveBeenCalled());
    expect(replace).toHaveBeenCalledWith('/admin/posts/new-id');
  });

  it('updates an existing article without create', async () => {
    updateArticleAction.mockResolvedValue(undefined);
    renderAdmin(<PostEditor initialArticle={article({ id: 'art-1' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(updateArticleAction).toHaveBeenCalled());
    expect(createArticleAction).not.toHaveBeenCalled();
  });

  it('alerts on manual save failure', async () => {
    createArticleAction.mockRejectedValue(new Error('nope'));
    renderAdmin(<PostEditor />);
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
  });

  it('does not translate when confirm is cancelled', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    renderAdmin(
      <PostEditor initialArticle={article({ id: 'art-1', title: 'T' })} />
    );
    const btn = screen.queryByRole('button', {
      name: 'Translate Entire Page to English',
    });
    if (btn) {
      await userEvent.click(btn);
    }
    expect(translateArticleEnAction).not.toHaveBeenCalled();
  });

  it('alerts partial translation errors', async () => {
    translateArticleEnAction.mockResolvedValue({
      titleEn: 'EN',
      excerptEn: '',
      blocks: [],
      errors: [{ blockId: 'p1', message: 'fail-block' }],
    });
    renderAdmin(
      <PostEditor initialArticle={article({ id: 'art-1', title: 'T' })} />
    );
    const btn = screen.getByRole('button', {
      name: 'Translate Entire Page to English',
    });
    await userEvent.click(btn);
    await waitFor(() =>
      expect(String(vi.mocked(window.alert).mock.calls[0]?.[0])).toMatch(
        /fail-block/
      )
    );
  });

  it('does not autosave without persistedId', async () => {
    vi.useFakeTimers();
    renderAdmin(<PostEditor />);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MS + 50);
    expect(updateArticleAction).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('swallows autosave failures (no alert)', async () => {
    vi.useFakeTimers();
    updateArticleAction.mockRejectedValue(new Error('autosave-fail'));
    renderAdmin(
      <PostEditor initialArticle={article({ id: 'art-1', title: 'T' })} />
    );
    await userEvent.type(screen.getByDisplayValue('T'), 'x');
    await vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MS + 50);
    await waitFor(() => expect(updateArticleAction).toHaveBeenCalled());
    expect(window.alert).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
```

Use these exact `admin.editor` labels from `messages/admin-en.json`: Save draft, Translate Entire Page to English, Untitled.

Add tests for: publish stamps `publishedAt` (spy payload of `updateArticleAction`); save-as-draft of published clears `publishedAt`; translate in-flight guard (double click, `translatingArticle`); `canTranslateArticle` hides/disables when title and blocks empty.

- [ ] **Step 2: Write `block-editors.test.tsx`**

For heading, paragraph, list, quote, callout, image, code, embed, table: render with `renderAdmin`, change the primary field, `expect(onChange).toHaveBeenCalled()`. For `DividerBlockEditor`, `expect(screen.getByText(/divider/i)).toBeInTheDocument()` (use exact `admin.divider.label`). Mock `@/actions/block-translation` as a resolved dummy so Generate buttons do not hit OpenAI.

- [ ] **Step 3: Run component tests**

Run: `yarn test --project component src/components/admin/PostEditor.test.tsx src/components/admin/blocks/block-editors.test.tsx`

Expected: PASS. If a control is not a `button` (e.g. icon-only), query by `title` / `aria-label` from the messages file.

- [ ] **Step 4: Type-check**

Run: `yarn type-check`

Expected: PASS.

---

### Task 5: Real-DB slice — slug + archive chain

**Files:**

- Create: `src/lib/articles-repository.db.test.ts`

**Interfaces:**

- Consumes: `createArticleRecord`, `archiveArticleRecord`, `updateArticleRecord`, `deleteArticleRecord`, `prisma`.
- Produces: unique-slug + archive → draft → hard-delete coverage from the spec.

- [ ] **Step 1: Write the db tests**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import {
  archiveArticleRecord,
  createArticleRecord,
  deleteArticleRecord,
  updateArticleRecord,
} from './articles-repository';
import { createPayload } from '@/test/fixtures/articles';

const slug = `db-test-${Date.now()}`;

afterEach(async () => {
  await prisma.article.deleteMany({
    where: { slug: { startsWith: 'db-test-' } },
  });
});

describe('articles-repository db', () => {
  it('rejects a duplicate slug', async () => {
    await createArticleRecord(createPayload({ slug, title: 'A' }));
    await expect(
      createArticleRecord(createPayload({ slug, title: 'B' }))
    ).rejects.toMatchObject({
      code: 'P2002',
    } as Prisma.PrismaClientKnownRequestError);
  });

  it('archive → restore to draft → hard delete', async () => {
    const id = await createArticleRecord(
      createPayload({ slug: `${slug}-life`, title: 'Life' })
    );
    await archiveArticleRecord(id);
    expect((await prisma.article.findUnique({ where: { id } }))?.status).toBe(
      'archived'
    );
    await updateArticleRecord(id, { status: 'draft' });
    expect((await prisma.article.findUnique({ where: { id } }))?.status).toBe(
      'draft'
    );
    await deleteArticleRecord(id);
    expect(await prisma.article.findUnique({ where: { id } })).toBeNull();
  });
});
```

- [ ] **Step 2: Run locally only if you have Postgres**

Run: `ADMIN_TEST_DB=1 DATABASE_URL=... DIRECT_URL=... yarn test:db`

If you do not, skip local and rely on CI. `yarn test` must still pass without this.

- [ ] **Step 3: Type-check**

Run: `yarn type-check`

Expected: PASS.

---

### Task 6: Dashboard client + `listArticlesAdminAction` (already in Task 3)

**Files:**

- Create: `src/app/admin/(protected)/dashboard/DashboardClient.test.tsx`

**Interfaces:**

- Consumes: `renderAdmin`, `listItem`.
- Mocks: `@/actions/articles` row/bulk actions, `next/navigation` (`useRouter`, `usePathname`, `useLocale` via next-intl provider).

- [ ] **Step 1: Write dashboard tests**

Cover, each as its own `it`:

1. `items={[]}` → `noPostsTitle` / `noPostsEmpty` text.
2. Search miss → `noPostsFiltered`.
3. Status filter: click Published badge → draft row hidden (use `aria-pressed`).
4. Category select `case-study` hides `useful-info` row.
5. Published row: unpublish control present (`unpublishTitle`); publish title absent.
6. Archived row: restore present; archive absent.
7. Archive confirm false → `archiveArticleAction` not called.
8. Bulk archive / bulk delete confirm false → actions not called.
9. No selection → bulk bar not in the document (`selectedCount` text absent).
10. Action reject → `role="alert"` with `actionFailed`.
11. Pagination: one page → previous/next disabled (set items length 1, default page size 10 in the table — if page size is 10, use 1 item).

Stub actions:

```ts
vi.mock('@/actions/articles', () => ({
  archiveArticleAction: vi.fn(),
  archiveArticlesAction: vi.fn(),
  deleteArticlesAction: vi.fn(),
  publishArticleAction: vi.fn(),
  publishArticlesAction: vi.fn(),
  restoreArticleAction: vi.fn(),
  unpublishArticleAction: vi.fn(),
  unpublishArticlesAction: vi.fn(),
}));
```

Use **exact** strings from `messages/admin-en.json` → `admin.dashboard.*`.

- [ ] **Step 2: Run**

Run: `yarn test --project component src/app/admin/\(protected\)/dashboard/DashboardClient.test.tsx`

Expected: PASS.

---

### Task 7: Real-DB bulk status

**Files:**

- Modify: `src/lib/articles-repository.db.test.ts`

**Interfaces:**

- Consumes: `publishArticlesRecord`, `unpublishArticlesRecord`, `archiveArticlesRecord`, `deleteArticlesRecord`.

- [ ] **Step 1: Add tests**

```ts
it('bulk publish/unpublish/archive/delete only touch the given ids', async () => {
  const a = await createArticleRecord(
    createPayload({ slug: `${slug}-a`, title: 'A', status: 'draft' })
  );
  const b = await createArticleRecord(
    createPayload({ slug: `${slug}-b`, title: 'B', status: 'draft' })
  );
  await publishArticlesRecord([a]);
  expect((await prisma.article.findUnique({ where: { id: a } }))?.status).toBe(
    'published'
  );
  expect((await prisma.article.findUnique({ where: { id: b } }))?.status).toBe(
    'draft'
  );
  await unpublishArticlesRecord([a]);
  await archiveArticlesRecord([a]);
  await deleteArticlesRecord([a]);
  expect(await prisma.article.findUnique({ where: { id: a } })).toBeNull();
  expect(await prisma.article.findUnique({ where: { id: b } })).not.toBeNull();
});
```

- [ ] **Step 2: `yarn type-check`**

Expected: PASS.

---

### Task 8: Media

**Files:**

- Create: `src/app/api/admin/media/route.test.ts`, `src/actions/media.test.ts`, `src/app/admin/(protected)/media/page.test.tsx`

**Interfaces:**

- Route uses `createServerSupabaseClient` + `listMedia` / `countMedia`.
- `deleteMediaAction` swallows `deleteFromGallery` errors after `deleteMediaRecord`.

- [ ] **Step 1: Route tests**

```ts
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock('@/lib/media-repository', () => ({
  listMedia: vi.fn(),
  countMedia: vi.fn(),
}));

import { GET } from './route';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listMedia, countMedia } from '@/lib/media-repository';

it('returns 401 when logged out', async () => {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: null } }) },
  } as never);
  const res = await GET(new Request('http://localhost/api/admin/media'));
  expect(res.status).toBe(401);
});

it('clamps pageSize and page', async () => {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: 'u' } } }) },
  } as never);
  vi.mocked(listMedia).mockResolvedValue([]);
  vi.mocked(countMedia).mockResolvedValue(0);
  await GET(
    new Request('http://localhost/api/admin/media?page=0&pageSize=999')
  );
  expect(listMedia).toHaveBeenCalledWith(
    expect.objectContaining({ page: 1, pageSize: 100 })
  );
});
```

- [ ] **Step 2: `src/actions/media.test.ts`**

Mock `requireUser`, `createMediaRecord`, `getMediaById`, `deleteMediaRecord`, `deleteFromGallery`, `revalidatePath`.

- `recordMediaAction` unauthorized.
- `recordMediaAction` authed calls `createMediaRecord`.
- `deleteMediaAction` throws `Not found` when `getMediaById` is null.
- `deleteMediaAction` still succeeds when `deleteFromGallery` rejects.

- [ ] **Step 3: Media page component**

Mock `uploadToGallery`, `recordMediaAction`, `deleteMediaAction`, `createBrowserSupabaseClient`, `fetch`.

- File input has `accept="image/*"`.
- Choosing a file calls `uploadToGallery`.
- `uploadToGallery` throw → `alert`.
- Delete confirm false → `deleteMediaAction` not called.
- Fake timers: typing search does not fetch until 300ms (page uses 300).

- [ ] **Step 4: Run `yarn test` and `yarn type-check`**

Expected: PASS.

---

### Task 9: Import actions + bulk client UI

**Files:**

- Create: `src/actions/legacy-import.test.ts`, `src/app/admin/(protected)/import/BulkImportClient.test.tsx`

**Interfaces:**

- `commitImportAction` throws `SlugCollisionError` when `isImportSlugAvailable` is false.
- Successful commit: `createArticleRecord` status `'draft'`.
- `ImageRehostError` becomes `Error(message)`.
- Do not duplicate `bulk.test.ts` / `bulk-state.test.ts`. Client test only: one row error text while a sibling stays success.

- [ ] **Step 1: Action tests**

Mock `requireUser`, `previewImport`, `isImportSlugAvailable`, `rehostImportImages`, `createArticleRecord`, `revalidateArticlePaths`.

```ts
it('preview/check/commit unauthorized', async () => {
  unauth();
  await expect(previewImportAction('https://x')).rejects.toThrow(
    'Unauthorized'
  );
  await expect(checkImportSlugAction('s')).rejects.toThrow('Unauthorized');
  await expect(commitImportAction(payload)).rejects.toThrow('Unauthorized');
});

it('commit throws SlugCollisionError when slug taken', async () => {
  authedUser();
  vi.mocked(isImportSlugAvailable).mockResolvedValue(false);
  await expect(commitImportAction(payload)).rejects.toBeInstanceOf(
    SlugCollisionError
  );
});

it('commit creates a draft and concatenates rehost warnings', async () => {
  authedUser();
  vi.mocked(isImportSlugAvailable).mockResolvedValue(true);
  vi.mocked(rehostImportImages).mockResolvedValue({
    featuredImageUrl: null,
    blocks: payload.blocks,
    warnings: ['rehost-w'],
  });
  vi.mocked(createArticleRecord).mockResolvedValue('id-1');
  const result = await commitImportAction({
    ...payload,
    warnings: ['preview-w'],
  });
  expect(result.warnings).toEqual(['preview-w', 'rehost-w']);
  expect(vi.mocked(createArticleRecord).mock.calls[0][0].status).toBe('draft');
});

it('surfaces ImageRehostError message', async () => {
  authedUser();
  vi.mocked(isImportSlugAvailable).mockResolvedValue(true);
  vi.mocked(rehostImportImages).mockRejectedValue(
    new ImageRehostError('bad-image')
  );
  await expect(commitImportAction(payload)).rejects.toThrow('bad-image');
});
```

Build `payload` as a minimal `ImportCommitPayload` (`sourceUrl`, `category: 'useful-info'`, `slug: 'imp'`, `slugCollision: false`, `title: 'T'`, `excerpt: ''`, `featuredImageRemoteUrl: null`, `publishedAt: new Date().toISOString()`, `tags: []`, `blocks: []`, `warnings: []`).

- [ ] **Step 2: BulkImportClient UI**

If `bulk-state.test.ts` already covers reducer isolation, render `BulkImportClient` with mocked actions: two URLs, `previewImportAction` resolves for first and rejects for second; expect the failed row to show error text and the first row not to display that error. Use `admin.bulkImport.*` strings.

- [ ] **Step 3: `yarn test` + `yarn type-check`**

Expected: PASS.

---

### Task 10: Translations + block-translation actions

**Files:**

- Create: `src/actions/translations.test.ts`, `src/actions/block-translation.test.ts`, `src/components/admin/translations/TranslationRow.test.tsx`

**Interfaces:**

- `saveTranslation` returns `{ ok: false, error: 'Unauthorized' }` when `requireUser` throws (it catches).
- `listTranslationNamespaces` **throws** `'Unauthorized'`.
- `translateToEnglish` mocked at `@/lib/openai-translate`.
- `translateArticleEnAction` collects `{ blockId: '__meta__', message }` when meta translation throws, still returns blocks.

- [ ] **Step 1: translations.test.ts**

Mock `requireUser`, `prisma` (`translation.findMany`, `findUnique`, `$transaction`, `translationHistory`), `translateToEnglish`, `revalidateTag`.

Cases: every exported action logged-out (throw **or** `{ ok: false, error: 'Unauthorized' }` matching production); authed save `{ ok: true }`; unknown key path `{ ok: false }`; `translateKeyToEnglish` success; `translateKeyToEnglish` when OpenAI throws `{ ok: false, error }`; restore missing history `{ ok: false, error: 'History entry not found' }`; delete history unauthorized.

- [ ] **Step 2: block-translation.test.ts**

Mock `requireUser`, `translateArticleMetaParts`, `translateBlocksWithConcurrency`.

- unauthorized on all three actions.
- `translateArticleEnAction` with throwing meta still returns `errors` containing `__meta__`.

- [ ] **Step 3: TranslationRow.test.tsx**

Mock `saveTranslation` / `getTranslationHistory` / `translateKeyToEnglish`. Change EN field, blur/save, expect `saveTranslation` called. Open history, expect `getTranslationHistory`.

- [ ] **Step 4: `yarn test` + `yarn type-check`**

Expected: PASS.

---

### Task 11: Shell + protected layout

**Files:**

- Create: `src/app/admin/(protected)/AdminProtectedShell.test.tsx`, `src/app/admin/(protected)/layout.test.ts`

**Interfaces:**

- `signOut(supabase)` then `router.replace('/admin')`.
- Locale switcher sets cookie `admin_locale` (`ADMIN_LOCALE_COOKIE` from `@/lib/admin-locale`) and `router.refresh()`.
- Layout: `getUser()` null → `redirect('/admin')`.

- [ ] **Step 1: Shell tests**

Mock `next/navigation` (`usePathname` `/admin/dashboard`, `useRouter`), `@/lib/supabase/client`, `@/lib/auth` `signOut`.

`renderAdmin(<AdminProtectedShell userEmail="a@b.c">child</AdminProtectedShell>)`.

- Links to `/admin/dashboard`, `/admin/posts/new`, `/admin/import`, `/admin/media`, `/admin/translations`.
- Sign out: click the sign-out control (`admin.sidebar.signOut`), expect `signOut` + `replace('/admin')`.
- Locale: click the button named `JP` (`AdminLocaleSwitcher` label) and assert `document.cookie` contains `admin_locale=ja`.
- Mobile: click the header menu button, expect the overlay (`fixed inset-0`); click overlay, drawer closes (`translate-x-full` or overlay gone).

- [ ] **Step 2: layout.test.ts**

```ts
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));
vi.mock('./AdminProtectedShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

import AdminProtectedLayout from './layout';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

it('redirects to /admin when there is no user', async () => {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: null } }) },
  } as never);
  await AdminProtectedLayout({ children: null });
  expect(redirect).toHaveBeenCalledWith('/admin');
});

it('renders children when authed', async () => {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: 'u' } } }) },
  } as never);
  const el = await AdminProtectedLayout({ children: 'ok' });
  expect(redirect).not.toHaveBeenCalled();
  expect(el).toBeTruthy();
});
```

- [ ] **Step 3: Full local gate**

Run: `yarn test && yarn lint && yarn type-check`

Expected: tests PASS; lint has no new errors.

---

## Human follow-up (not a coding task)

After CI is green on `master`:

1. GitHub branch protection on `master`: require the `Lint, type-check & test` check.
2. Vercel project: wait for GitHub checks before production deploy.

---

## Spec coverage (self-review)

| Spec item                                                           | Task                                    |
| ------------------------------------------------------------------- | --------------------------------------- |
| Vitest projects, helpers, CI Postgres, Vercel notes                 | 1 + human follow-up                     |
| `buildArticlePayload` extract + payload edges                       | 2                                       |
| Article Zod (existing file) + actions auth/Zod/bulk/not-found/clamp | 3 (schema already in `article.test.ts`) |
| PostEditor save/autosave/translate + block onChange                 | 4                                       |
| Duplicate slug + archive/restore/hard-delete                        | 5                                       |
| Dashboard UI catalog                                                | 6                                       |
| Bulk DB                                                             | 7                                       |
| Media 401/clamp/upload/delete swallow                               | 8                                       |
| Import auth/collision/draft/rehost + bulk UI                        | 9                                       |
| Translations + OpenAI mock + block-translation                      | 10                                      |
| Shell nav/locale/sign-out/drawer + layout redirect                  | 11                                      |
| No Playwright / no test user                                        | Global constraints                      |
| `updateArticleAction` raw `data`                                    | Task 3 characterization test            |
| `yarn test` without Docker                                          | Task 1 scripts                          |

No TBD. Divider has no onChange (Task 4). Media has no max-size guard (Task 8). Translation save returns `{ ok: false }` on unauthorized (Task 10).
