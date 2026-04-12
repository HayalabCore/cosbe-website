# CosBE Website

Marketing site and CMS built with [Next.js](https://nextjs.org) (App Router), [next-intl](https://next-intl.dev) (`en` / `ja`), and [Prisma](https://www.prisma.io) on PostgreSQL ([Supabase](https://supabase.com)).

## Prerequisites Required

- Node.js 20+ (match [Vercel / Next.js](https://nextjs.org/docs/getting-started/installation) expectations)
- [Yarn](https://yarnpkg.com) (this repo uses `yarn.lock`)

## Environment variables

Copy `.env.example` to `.env` and fill in values.

| Variable                        | Purpose                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | Postgres connection string. On Supabase, use the **pooled** URL (often port `6543` with PgBouncer) for the app runtime.                                                   |
| `DIRECT_URL`                    | Direct Postgres URL for migrations (Supabase “session” / non-pooler host, port `5432`). Required by `prisma/schema.prisma` for `migrate` / introspection.                 |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL (auth, storage, public client).                                                                                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key.                                                                                                                                                   |
| `NEXT_PUBLIC_HUBSPOT_*`         | HubSpot portal and form IDs for embedded forms.                                                                                                                           |
| `API_SECRET_KEY`                | Secret for **machine-to-machine** article creation (`POST /api/articles`). Use a long random string; send as `Authorization: Bearer <key>`. Set in Vercel for production. |

`.env` is gitignored; never commit secrets.

## External article API

Other systems can create CMS articles over HTTP using the same JSON shape as the admin editor. The browser **admin** at `/admin` uses Supabase login; this API uses **`API_SECRET_KEY`** instead (no cookies).

| Method | Path                     | Auth                                     | Description                                                                       |
| ------ | ------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------- |
| `GET`  | `/api/articles/metadata` | None                                     | JSON documentation of the request body, fields, block types, and example payload. |
| `POST` | `/api/articles`          | `Authorization: Bearer <API_SECRET_KEY>` | Create an article; response **`201`** with `{"id":"<uuid>"}`.                     |

**Production:** set `API_SECRET_KEY` in your host’s environment (e.g. Vercel **Settings → Environment Variables**). Use your site origin, for example `https://<your-project>.vercel.app`.

**Discover the schema:**

```bash
curl -sS "https://<your-domain>/api/articles/metadata"
```

**Create a draft article (replace domain and secret):**

```bash
curl -sS -w "\nHTTP %{http_code}\n" -X POST "https://<your-domain>/api/articles" \
  -H "Authorization: Bearer YOUR_API_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "api-example-'$(date +%s)'",
    "title": "Example title",
    "status": "draft",
    "category": "notice",
    "tags": ["api"],
    "author": { "name": "Author", "designation": "Role" },
    "blocks": [
      { "id": "b1", "type": "heading", "level": 2, "content": "Heading" },
      { "id": "b2", "type": "paragraph", "content": "<p>Body</p>" }
    ],
    "toc": [],
    "publishedAt": null
  }'
```

**Local dev:** use `http://localhost:3000` and the same `API_SECRET_KEY` from `.env`.

Common HTTP responses: **`201`** created; **`400`** validation error (body includes `details`); **`401`** wrong or missing bearer token; **`409`** duplicate `slug`; **`503`** if `API_SECRET_KEY` is not configured on the server.

## Install

```bash
yarn install
```

`postinstall` runs `prisma generate` so the Prisma Client is available after every install (including CI).

## Database (Prisma)

The CMS stores articles in PostgreSQL. The canonical schema lives in [`prisma/schema.prisma`](prisma/schema.prisma) (model `Article` → table `articles`). Migrations are versioned under [`prisma/migrations`](prisma/migrations).

### Typical commands

| Command           | When to use                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `yarn db:migrate` | **Local development:** create/apply migrations when you change `schema.prisma` (`prisma migrate dev`).             |
| `yarn db:deploy`  | **CI / production:** apply existing migrations without creating new ones (`prisma migrate deploy`).                |
| `yarn db:push`    | Quick experiments only: push schema without a migration file. Prefer `db:migrate` for anything shared or deployed. |
| `yarn db:studio`  | Open [Prisma Studio](https://www.prisma.io/studio) against your configured database.                               |

After pulling changes that include new migrations, run `yarn db:deploy` (or `yarn db:migrate` locally) before `yarn dev` or `yarn build`.

### Supabase storage (article images)

Optional SQL for the `article-images` bucket and storage policies lives in [`supabase/schema.sql`](supabase/schema.sql). Run it in the Supabase SQL editor if you use image uploads; create the **public** bucket `article-images` in the dashboard if it does not exist.

## Scripts

| Script                      | Description                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn dev`                  | Next.js dev server ([http://localhost:3000](http://localhost:3000)).                                                                              |
| `yarn build` / `yarn start` | Production build and server.                                                                                                                      |
| `yarn lint`                 | ESLint.                                                                                                                                           |
| `yarn type-check`           | TypeScript (`tsc --noEmit`).                                                                                                                      |
| `yarn import-article <url>` | Scrape a legacy article page and insert a row via Prisma (requires `DATABASE_URL`; see [`scripts/import-article.ts`](scripts/import-article.ts)). |

## App structure (high level)

- **`src/app/[locale]/`** — Locale-prefixed public routes (`/en`, `/ja`).
- **`src/app/admin/`** — Admin UI (dashboard, post editor) backed by Supabase auth and Prisma for article data.

## Deploy

Production hosts should set the same env vars as `.env.example`, run `yarn install` (which generates Prisma Client), then `yarn db:deploy` so the database matches migrations, then `yarn build`. On [Vercel](https://vercel.com), add env vars in the project settings and use the Supabase pooled `DATABASE_URL` for runtime.

For Next.js features and deployment details, see the [Next.js documentation](https://nextjs.org/docs).
