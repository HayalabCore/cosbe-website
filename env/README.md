# Environment files

Commands read their settings from files chosen by `APP_ENV`. You never type
database URLs in the terminal. Deployed services (App Hosting, the Cloud Run
worker) use **no files**: their values are set in the platform console or Secret
Manager, and anything already set in the process always wins over a file.

| `APP_ENV`         | Files read (first wins)                                    | Used by                                             |
| ----------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| `local` (default) | `.env.development.local`, `.env.local`, `.env.development` | `yarn dev`, `yarn worker:dev`, `yarn db:*`, scripts |
| `test`            | `.env.test` (committed, no secrets)                        | `yarn test:db`                                      |
| `staging`         | `env/staging.env`                                          | `yarn db:*:staging`                                 |
| `production`      | `env/production.env`                                       | `yarn db:*:prod`                                    |

`.env.local` and `env/*.env` are gitignored. Copy `.env.example` to start one.

## Local

`.env.local` points at the local Postgres (docker container `cosbe-studio-test-pg`,
database `cosbe_dev`). One URL is enough locally: `DIRECT_URL` falls back to
`DATABASE_URL` for a localhost database. DB tests use `cosbe_test` through
`.env.test`, so they never touch your manual test data.

## Staging and production

Supabase needs both URLs:

- `DATABASE_URL`: transaction pooler, port 6543 (`?pgbouncer=true`). Used by queries.
- `DIRECT_URL`: session pooler, port 5432. Needed by migrations and pg-boss, which
  use session features a transaction pooler cannot give. It is never inferred
  for a remote database.

To run the local site against another environment (for example to reproduce a
bug on real data): `yarn dev:prod`, or `APP_ENV=production yarn dev`. `yarn dev`
loads the chosen file through `scripts/with-env.ts` before starting Next, so its
values win over `.env.local`. Everything you do in that admin changes that
environment's data. A key missing from `env/production.env` but present in
`.env.local` is still filled from `.env.local` by Next, so keep the key sets aligned.

Remote commands print `[env] APP_ENV=production (env/production.env)`. Commands that
write (`db:deploy:*`, bootstrap, translation push/sync/seed) show the target host
and ask you to type the environment name; pass `--yes` in non-interactive runs.
A missing `env/<name>.env`, or one without `DATABASE_URL`, stops the command
instead of falling back to local values.

Staging mirrors production: `yarn dev:staging`, `yarn db:deploy:staging`,
`yarn db:status:staging`, `yarn db:bootstrap-admins:staging`, and
`yarn worker:staging` (a worker on your machine attached to the staging
database, for when no staging worker is deployed). The deployed staging backend
sets `SITE_ENV=staging`, which makes the site noindex.

The remote files are not named `.env.production`, because Next loads that name
automatically on every `next build`.
