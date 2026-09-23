# Environment configuration — Design

**Date:** 2026-09-23
**Status:** Approved in conversation (sections 1–2 reviewed; 3–4 summarised and accepted with the go-ahead).

## Goal

Every command picks up the right settings without typing variables in the terminal: the website, the Content Studio worker, Prisma CLI, scripts and DB tests. Local work uses local databases by default; staging and production are reachable from a laptop only by an explicit choice. Deployed services (App Hosting, Cloud Run) keep getting their values from the platform console / Secret Manager and must work with no env files at all.

## Why two database URLs

- `DATABASE_URL`: Supabase's transaction pooler (:6543). A server connection is borrowed per transaction, so many short-lived instances share Supabase's small connection limit. Prisma queries use it.
- `DIRECT_URL`: a session connection (:5432) held for the life of the client. Prisma migrations and pg-boss need session features (advisory locks, prepared statements across statements, long-lived connections) that a transaction pooler cannot give.

A local Postgres has no pooler, so the two are the same. `DIRECT_URL` therefore falls back to `DATABASE_URL` **only when that is a localhost database**. Supabase environments must set both; a missing `DIRECT_URL` there fails visibly rather than silently using the transaction pooler, which would break migrations and pg-boss.

## 1. Files and precedence

| File | Committed | Used for |
| --- | --- | --- |
| `.env.example` | yes | Template listing every variable. |
| `.env.local` | no | This machine: `cosbe_dev` local DB, own API keys. |
| `.env.test` | yes | DB tests: `cosbe_test` local DB, `ADMIN_TEST_DB=1`. No secrets. |
| `env/staging.env` | no | Optional. Only with `APP_ENV=staging`. |
| `env/production.env` | no | Optional. Only with `APP_ENV=production`. |
| `env/README.md` | yes | How to fill and select the files. |

- `APP_ENV` ∈ `local` (default) · `test` · `staging` · `production`. It selects files only; it never changes application behaviour.
- `local` loads `.env.development.local`, `.env.local`, `.env.development` (Next's own order). `test` loads `.env.test`. `staging`/`production` load only `env/<name>.env`, never local files.
- Remote files are not named `.env.production`: Next loads that name automatically on `next build`, which would let a laptop build read production data unintentionally.
- `.env` is retired (its contents move to `.env.local` and `env/production.env`), so no secret loads "by default".
- Precedence: a variable already set in the process always wins over every file. A missing file is not an error, except `env/<name>.env` when `APP_ENV` names a remote environment (the command stops with a clear message instead of falling back to local values).

## 2. Loading, per entry point

`src/lib/env/load-env.ts` (framework-free, usable by the worker) exports `loadAppEnv()`: resolve `APP_ENV`, load its files with Node's `util.parseEnv` without overriding set values, apply the local-only `DIRECT_URL` fallback, and return `{ appEnv, files }`. Remote environments log `[env] APP_ENV=production (env/production.env)`.

| Entry point | Mechanism |
| --- | --- |
| `yarn dev` / `build` / `start` | Next's built-in loading (reads `.env.local`). The web app's pg-boss pool already falls back to `DATABASE_URL` when `DIRECT_URL` is unset. |
| `yarn worker:dev` / `worker:start` | `worker/main.ts` calls `loadAppEnv()` first; `--env-file` removed. |
| Prisma CLI | `prisma.config.ts` calls `loadAppEnv()`; Prisma no longer reads `.env` on its own. |
| Scripts | First line calls `loadAppEnv()`. |
| DB tests | The vitest `db` project sets `APP_ENV=test` and loads `.env.test`. |
| Unit tests | Unchanged: no files, dummy values. |

Named scripts select remote environments: `db:deploy:staging`, `db:deploy:prod`, `db:bootstrap-admins:prod`.

## 3. Remote safety guard

Commands that write to a database (`db:deploy:*`, `db:bootstrap-admins:*`, translation push/seed/sync) run `confirmRemote()` when `APP_ENV` is `staging` or `production`: it prints the target database host and requires typing the environment name. Non-interactive runs (CI) pass `--yes`. Local-only scripts keep refusing any non-localhost database (`local-db-guard`). The worker keeps refusing a remote database unless `NODE_ENV=production` or `STUDIO_WORKER_ALLOW_REMOTE=1`.

## 4. Tests and docs

- Unit tests for `loadAppEnv`: file order per `APP_ENV`, process values win, missing local files are fine, missing remote file fails, `DIRECT_URL` fallback, remote files never mixed with local ones.
- Unit test for `confirmRemote`: refuses a wrong answer, accepts the environment name or `--yes`.
- CI keeps setting variables in the workflow (process values win).
- `CLAUDE.md`, `.env.example` and `env/README.md` document the files, `APP_ENV`, the named scripts and the two URLs.

## Out of scope

Encrypted committed env files (dotenvx), a staging deployment itself, and moving App Hosting values out of the console.
