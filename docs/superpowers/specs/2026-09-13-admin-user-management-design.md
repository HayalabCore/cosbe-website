# Admin User Management & Role-Based Permissions — Design

**Date:** 2026-09-13
**Status:** Implemented. Review decisions are in the addendum.

## Goal

Manage admin portal users from the portal itself instead of the Supabase dashboard: create users, disable/re-enable them, delete them, and control what each user can do via roles. Roles are created and edited in the UI; each role is a bundle of code-defined permissions; a user can hold several roles and gets the union of their permissions.

`bivav.r.s@cosbe.inc` is the super-admin with unrestricted access.

## Current state

- Login is Supabase email + password (`signInWithPassword` in `src/lib/auth.ts`, page `src/app/admin/page.tsx`).
- Every Supabase Auth user has full admin access. The only check is "is there a session":
  - `src/app/admin/(protected)/layout.tsx` redirects to `/admin` when there is no user.
  - `requireUser()` in `src/lib/require-user.ts` is called by all server actions in `src/actions/*`.
- No user/role tables exist in Prisma. No service-role key is configured.

## Decisions

| Topic                 | Decision                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Model                 | Roles (UI-managed) composed of permissions (code-defined). Users ↔ roles is many-to-many.                        |
| Onboarding            | Admin sets a temporary password; user must change it on first sign-in. No email invites.                         |
| Disable               | Keeps account/roles; blocks access immediately (DB flag + Supabase ban). Reversible.                             |
| Delete                | Permanent (Supabase Auth user + DB row). Only allowed on a disabled user. Super-admin only (via `users.delete`). |
| Authorization storage | Prisma tables, checked server-side on every request (not JWT claims, not RLS).                                   |
| Existing users        | Bootstrapped with the **Admin** role; `bivav.r.s@cosbe.inc` gets **Super-admin**.                                |
| New users             | Default to **no roles**: can sign in, see "Permission needed" on every page.                                     |

## 1. Data model

New Prisma models (UUID ids, snake_case `@map`, `Timestamptz(6)` like existing models):

```prisma
model AdminUser {
  id                 String     @id @db.Uuid              // = Supabase auth.users.id
  email              String     @unique
  displayName        String?    @map("display_name")
  disabled           Boolean    @default(false)
  mustChangePassword Boolean    @default(false) @map("must_change_password")
  createdBy          String?    @map("created_by")        // creator email, plain text
  createdAt          DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime   @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  roles              UserRole[]

  @@map("admin_users")
}

model Role {
  id          String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key         String           @unique                    // "super-admin", "marketing"; immutable
  name        String
  description String?
  isSystem    Boolean          @default(false) @map("is_system")
  createdAt   DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime         @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  permissions RolePermission[]
  users       UserRole[]

  @@map("roles")
}

model RolePermission {
  roleId     String @map("role_id") @db.Uuid
  permission String
  role       Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([roleId, permission])
  @@map("role_permissions")
}

model UserRole {
  userId     String    @map("user_id") @db.Uuid
  roleId     String    @map("role_id") @db.Uuid
  assignedBy String?   @map("assigned_by")
  assignedAt DateTime  @default(now()) @map("assigned_at") @db.Timestamptz(6)
  user       AdminUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  role       Role      @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@index([roleId])
  @@map("user_roles")
}
```

Permissions are stored as strings, validated against the code catalog on write. A permission string no longer in the catalog is ignored when computing a user's permissions.

The last-sign-in time shown in the UI comes from Supabase Auth (`last_sign_in_at`) and is not duplicated in the DB.

### Permission catalog — `src/lib/permissions.ts`

A typed `as const` catalog; `Permission` is the union of its keys. Each entry has a group (for UI grouping) and i18n keys for label/description.

| Permission                    | Covers                                                 |
| ----------------------------- | ------------------------------------------------------ |
| `dashboard.view`              | Dashboard, article list, view counts                   |
| `articles.edit`               | Create/update drafts, AI block/meta translation        |
| `articles.publish`            | Publish / unpublish (single + bulk)                    |
| `articles.archive`            | Archive / restore                                      |
| `articles.delete`             | Hard delete                                            |
| `import.run`                  | Legacy import preview + commit                         |
| `media.upload`                | View library + upload                                  |
| `media.delete`                | Delete media                                           |
| `translations.edit`           | Edit / restore / AI-translate UI strings, view history |
| `translations.history.delete` | Delete history entries                                 |
| `users.view`                  | See user list                                          |
| `users.create`                | Create users, set/reset temporary passwords            |
| `users.assign-roles`          | Change a user's roles (bounded by rule 3)              |
| `users.disable`               | Disable / re-enable users                              |
| `users.delete`                | Hard delete users                                      |
| `roles.manage`                | Create / edit / delete non-system roles                |

### Default roles (seeded by migration)

| Role                               | Permissions                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| **Super-admin** (`isSystem: true`) | Implicitly all permissions, including future ones. No `RolePermission` rows needed.        |
| **Admin**                          | Everything except `users.delete`                                                           |
| **Developer**                      | `dashboard.view`, all `articles.*`, `import.run`, `media.*`, `translations.*`              |
| **Marketing**                      | `dashboard.view`, `articles.edit`, `articles.publish`, `media.upload`, `translations.edit` |

Admin, Developer and Marketing are editable in the UI afterwards.

## 2. Enforcement

### Authorization module — `src/lib/authz.ts` (`server-only`)

- `getCurrentAdmin()` — wrapped in React `cache()` (once per request). Calls `supabase.auth.getUser()` (server-verified), then one Prisma query for the `AdminUser` with roles → permissions. Returns a discriminated result:
  - `{ status: 'unauthenticated' }`
  - `{ status: 'disabled', supabase, user, admin }`
  - `{ status: 'must-change-password', supabase, user, admin }`
  - `{ status: 'active', supabase, user, admin, actor }` (`actor` holds `permissions` and `isSuperAdmin`)
  - If a session exists but no `AdminUser` row does, the row is auto-created (no roles) and the result is `active` with an empty permission set. If create hits a unique-email conflict and the old row's Auth user is gone, that row is adopted (new id, same email/roles, `disabled: false`). Adoption is only for users with no row. Concurrent first requests that lose the adopt race reuse the row the winner wrote. Email is synced when the Auth address has changed; if the new address is already owned, the clash is logged and the existing row is kept. A unique-id race during create returns the existing row; an email unique clash still throws so the clash can be logged.
  - `isSuperAdmin` = holds the `super-admin` role; when true, `permissions` contains the whole catalog.
- `requirePermission(...perms: Permission[])` — for server actions. Throws `Error('Unauthorized')` when unauthenticated, `Error('Forbidden')` when disabled, must-change-password, or missing any listed permission. Returns the active `AuthzContext` (`{ status: 'active', supabase, user, admin, actor }`), so callers can use `actor` for guardrails.
- `requireActiveSession()` — session exists and user is not disabled; allowed while `mustChangePassword` is set. Used only by `changeOwnPasswordAction`.
- `hasPermission(perm)` — non-throwing boolean for pages.

`src/lib/require-user.ts` is deleted. Every `requireUser()` call in `src/actions/*` is replaced by a specific `requirePermission(...)`:

| Action(s)                                                                                                                                                                          | Permission                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `getArticleByIdAction`                                                                                                                                                             | `dashboard.view` or `articles.edit` (either)                                                    |
| `listArticlesAdminAction`                                                                                                                                                          | `dashboard.view`                                                                                |
| `createArticleAction`, `updateArticleAction`                                                                                                                                       | `articles.edit`                                                                                 |
| `publish*`, `unpublish*`                                                                                                                                                           | `articles.publish`, plus `statusChangePermissions` for each article's current status            |
| `archive*`, `restoreArticleAction`                                                                                                                                                 | `articles.archive`, plus `statusChangePermissions` for each article's current status            |
| `hardDeleteArticleAction`, `deleteArticlesAction`                                                                                                                                  | `articles.delete`, plus `statusChangePermissions` treating delete as a transition to `archived` |
| `translateBlockEnAction`, `translateArticleMetaEnAction`, `translateArticleEnAction`                                                                                               | `articles.edit`                                                                                 |
| `previewImportAction`, `checkImportSlugAction`, `commitImportAction`                                                                                                               | `import.run`                                                                                    |
| `recordMediaAction`                                                                                                                                                                | `media.upload`                                                                                  |
| `deleteMediaAction`                                                                                                                                                                | `media.delete`                                                                                  |
| `listTranslationNamespaces`, `listTranslationRowsForNamespace`, `searchTranslationRows`, `saveTranslation`, `getTranslationHistory`, `translateKeyToEnglish`, `restoreTranslation` | `translations.edit`                                                                             |
| `deleteTranslationHistoryItem`                                                                                                                                                     | `translations.history.delete`                                                                   |

For the "either" case, `requireAnyPermission(...perms)` is provided alongside `requirePermission` (which requires all).

**Status changes.** `createArticleAction` / `updateArticleAction` can set `status` (the editor's Publish button uses them). Dedicated publish / unpublish / archive / restore / delete actions use the same mapping: in addition to the action's own permission they require `statusChangePermissions(from, to)` for each article's current status. Delete is treated as a transition to `archived` (draft delete needs `articles.archive` + `articles.delete`; already-archived needs only `articles.delete`; published delete also needs `articles.publish`). A new article counts as coming from `draft`. Editing without changing status needs only `articles.edit`. The mapping lives in `src/lib/article-status-permissions.ts`.

**API route.** `GET /api/admin/media` (media page and the editor's gallery picker) requires `media.upload` or `articles.edit`; it returns 401 when unauthenticated, 403 when forbidden, and 500 for unexpected errors (including database failures during authorization).

**Storage writes.** Uploads and deletes in the `article-images` bucket go directly from the browser (and from the import action under the user's session), so storage policies enforce permissions too — see section 4, "Storage policies".

### Protected layout — `src/app/admin/(protected)/layout.tsx`

Uses `getCurrentAdmin()`:

1. `unauthenticated` → `redirect('/admin')`.
2. `disabled` → `redirect('/admin?error=disabled')`. Server components cannot clear auth cookies, so the login page signs the browser session out when it sees `error=disabled`.
3. `must-change-password` → `redirect('/admin/change-password')`.
4. `active` → render `AdminProtectedShell` with `userEmail` and `permissions` (array).

### Login page

- Shows "Your access has been disabled." when `?error=disabled` is present.
- Maps Supabase's banned-user sign-in error to the same message.

### Page guards

Each page checks its permission and renders `<PermissionNeeded permission="…" />` instead of content:

| Route                                   | Permission          |
| --------------------------------------- | ------------------- |
| `/admin/dashboard`                      | `dashboard.view`    |
| `/admin/posts/new`, `/admin/posts/[id]` | `articles.edit`     |
| `/admin/import`                         | `import.run`        |
| `/admin/media`                          | `media.upload`      |
| `/admin/translations`                   | `translations.edit` |
| `/admin/users`                          | `users.view`        |
| `/admin/roles`                          | `roles.manage`      |

`PermissionNeeded` (`src/components/admin/PermissionNeeded.tsx`) shows a bilingual message naming the missing permission's label and telling the user to ask a super-admin or admin. After sign-in, users still land on `/admin/dashboard`.

### Client-side permission awareness

- `AdminProtectedShell` hides nav items the user lacks permission for, and adds **Users** (`users.view`) and **Roles** (`roles.manage`) nav items.
- A `PermissionsProvider` / `usePermissions()` client context (fed from the layout) lets components hide Publish / Archive / Delete / etc. buttons. This is UX only; server actions remain authoritative.

### Freshness

Layouts persist across client-side navigations, so `AdminProtectedShell` calls `router.refresh()` when the pathname changes. That re-runs the layout: sidebar permissions update, and disabled / must-change-password users are redirected without a full reload. Page guards still protect the data if the refresh has not finished.

Client-side navigation therefore hits the server twice: once for the destination page and once for `router.refresh()`. That is accepted so redirects stay in `layout.tsx` (which persists) instead of a `template.tsx` remount or a middleware authz check.

## 3. Management features

### Supabase admin client — `src/lib/supabase/admin-core.ts` + `src/lib/supabase/admin.ts`

- `admin-core.ts` creates the client with `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix) and `auth: { persistSession: false, autoRefreshToken: false }`, and exposes small wrappers (`listAuthUsers`, `createAuthUser`, `setAuthUserPassword`, `setAuthUserBanned`, `deleteAuthUser`, `authUserExists`, `revokeAuthUserSessions`) that map Supabase error codes to typed results. It has no `server-only` import so the bootstrap script (run with `tsx`) can use it.
- `admin.ts` is `import 'server-only'` + a re-export; app code imports only this file, and only from `src/actions/users.ts`.
- Added to `.env.example`.

### Guardrail rules — `src/lib/authz-rules.ts` (pure, no I/O)

The actor is `{ userId, permissions, isSuperAdmin }`.

1. **Super-admin is locked.** The `isSystem` role cannot be edited or deleted by anyone.
2. **Super-admin is guarded.** Only a super-admin may grant/revoke the Super-admin role, or modify (roles, password reset, disable, enable, delete) a user who holds it.
3. **No escalation.** An actor can assign or remove a role only if they hold every permission in it. An actor can create/edit a role only if they hold every permission in both the role's current set and the new set. An actor can modify a user (reset password, disable, enable, delete, change roles) only if they hold every permission that user currently has (`holdsAll(actor, target.permissions)`). A custom role with only `users.view` + `users.create` therefore cannot reset an Admin's password and inherit Admin.
4. **No self-modification.** An actor cannot disable, enable, delete, reset the password of, or change the roles of their own account. Combined with rule 2, this guarantees at least one active super-admin.
5. **Bootstrap** — see section 4.

Functions:

- `canAssignRole(actor, role): boolean`
- `canModifyUser(actor, target: { id, isSuperAdmin, permissions }): boolean`
- `canEditRole(actor, role: { isSystem, permissions }, nextPermissions: Permission[]): boolean`
- `canDeleteRole(actor, role): boolean`

Server actions enforce these; the UI calls the same functions to disable controls.

### User actions — `src/actions/users.ts`

All inputs validated with Zod (`src/lib/validation/access.ts`, shared with role actions). Mutations `revalidatePath('/admin/users')`.

| Action                                                         | Requires                                                                                    | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listUsersAction`                                              | `users.view`                                                                                | Users with roles, the union of their permissions (for `canModifyUser` in the UI), status, and Supabase `last_sign_in_at`.                                                                                                                                                                                                                                                                                                                                                              |
| `createUserAction({ email, displayName?, password, roleIds })` | `users.create`; `canAssignRole` for each role                                               | `auth.admin.createUser({ email, password, email_confirm: true })` → create `AdminUser` (`mustChangePassword: true`, `createdBy` = actor email) + `UserRole` rows. If the DB write fails, delete the created Supabase user (`AUTH_ORPHAN` if that cleanup fails). Unique-email conflict: if the existing row's Auth user is gone, adopt + apply the chosen profile/roles/`disabled: false` in one transaction; if it is still live, delete the new Auth user and return `EMAIL_EXISTS`. |
| `resetPasswordAction({ userId, password })`                    | `users.create`; `canModifyUser`                                                             | `auth.admin.updateUserById(id, { password })`, set `mustChangePassword: true`, then delete `auth.sessions` for that user (refresh tokens cascade). If sessions cannot be deleted, return `SESSIONS_NOT_REVOKED` — the password has already changed.                                                                                                                                                                                                                                    |
| `setUserRolesAction({ userId, roleIds })`                      | `users.assign-roles`; `canModifyUser`; `canAssignRole` for every added **and** removed role | Replace the user's role set in a transaction.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `disableUserAction({ userId })`                                | `users.disable`; `canModifyUser`                                                            | Set `disabled: true` first, then ban in Supabase, then revoke sessions. If the ban fails, return `BAN_FAILED`; the DB flag still blocks access. If sessions cannot be deleted, return `SESSIONS_NOT_REVOKED`.                                                                                                                                                                                                                                                                          |
| `enableUserAction({ userId })`                                 | `users.disable`; `canModifyUser`                                                            | `ban_duration: 'none'`, then `disabled: false`.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `deleteUserAction({ userId })`                                 | `users.delete`; `canModifyUser`; target must be `disabled`                                  | `auth.admin.deleteUser(id)`, then delete `AdminUser` (cascades `UserRole`).                                                                                                                                                                                                                                                                                                                                                                                                            |
| `changeOwnPasswordAction({ currentPassword, password })`       | `requireActiveSession()`                                                                    | Verifies `currentPassword` with `signInWithPassword` (`WRONG_PASSWORD` on failure). Current password is not length-checked (legacy short passwords still work). New password ≥ 12 characters and different from the current one (Supabase `same_password`). Then `updateUser({ password })` and `mustChangePassword: false`. Forced-change users type the temporary password as current.                                                                                               |

Actions return typed result objects (`{ ok: true } | { ok: false, error: <code> }`) following the pattern in `src/lib/article-mutation-result.ts`, so the UI can show translated messages.

### Role actions — `src/actions/roles.ts`

All require `roles.manage` plus the relevant guardrail. Mutations `revalidatePath('/admin/roles')` and `/admin/users`.

| Action                                                          | Rules                                                                                                                                                            |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listRolesAction`                                               | Roles with permissions and user counts. Also allowed with `users.view` (the users page needs role names).                                                        |
| `createRoleAction({ key, name, description?, permissions })`    | `key` is kebab-case and unique; `canEditRole` against an empty current set.                                                                                      |
| `updateRoleAction({ roleId, name, description?, permissions })` | Not a system role; `canEditRole`. `key` is immutable.                                                                                                            |
| `deleteRoleAction({ roleId })`                                  | Not a system role; actor holds all of its permissions. Removes the role from any users who have it (cascade). The UI confirmation shows the affected user count. |

### Screens

All copy lives in `messages/admin-en.json` / `messages/admin-ja.json`, including a label and description for every permission. Visual style follows the existing admin pages (Tailwind tables, rounded cards); a small shared `AdminDialog` modal is added for the forms.

- **`/admin/users`** — table: email, display name, role chips, status badge (Active / Disabled / Must change password), last sign-in, created. Row action buttons appear only for permitted actions: Edit roles, Reset password, Disable/Enable, Delete (only for disabled users when the actor has `users.delete`; type-the-email confirmation). There are no actions on the actor's own row or on rows the actor may not modify. **Add user** button when the actor has `users.create`.
- **Add user dialog** — email, display name, temporary password with **Generate** (random 16 chars) and **Copy**, role checkboxes (roles failing `canAssignRole` are disabled with a tooltip). After success, a one-time panel shows email + password with Copy buttons.
- **Edit roles dialog** — role checkboxes with the same disabling rules.
- **Reset password dialog** — generate/copy temporary password, then show it once.
- **`/admin/roles`** — list of roles with description, permission count and user count. Super-admin is shown as locked ("All permissions"). **New role** / **Edit** open an editor: name, key (create only), description, permission checkboxes grouped by area with descriptions; permissions the actor doesn't hold are disabled.
- **`/admin/change-password`** — outside the `(protected)` group, styled like the login page. It requires an active session (redirects to `/admin` otherwise, and to `/admin/dashboard` if `mustChangePassword` is false). Fields: current password, new password, confirm. Includes a sign-out link. On success → `/admin/dashboard`.

## 4. Migration, bootstrap and deployment

### Migration — `add_user_management`

- Creates the four tables.
- Runs `ENABLE ROW LEVEL SECURITY` on all four tables with no policies. Prisma creates them in `public`, which the Supabase Data API exposes to the public anon key; without RLS anyone with that key could insert into `user_roles`. Prisma connects as the table owner and is unaffected.
- Inserts the four default roles and their `role_permissions` rows as plain SQL (must match `DEFAULT_ROLE_PERMISSIONS` in `src/lib/permissions.ts`; a db test checks this).
- Does **not** read `auth.users` or touch `storage` (neither schema exists in Prisma's shadow database or the CI Postgres).

### Storage policies — `supabase/schema.sql`

- Adds `public.admin_has_any_permission(perms text[]) returns boolean` (`security definer`, `stable`, `search_path = ''`): true when `auth.uid()` exists, is not disabled, does not need to change their password, and holds the super-admin role or any of `perms`. There is no `uid` argument — callers cannot probe another user's permissions.
- Replaces the `article_images_authenticated_*` policies: insert/update require `media.upload` or `import.run`; delete requires `media.delete`. Public read is unchanged.
- Run manually in the Supabase SQL editor (see deployment order).

### Bootstrap script — `scripts/bootstrap-admin-users.ts` → `yarn db:bootstrap-admins`

1. Refuses to run if any user already holds the Super-admin role, unless `--force` is passed.
2. Pages through `auth.admin.listUsers()` with the service-role key.
3. Aborts with no writes if `bivav.r.s@cosbe.inc` is not among them.
4. In one transaction:
   - Adopts stale email rows whose Auth user is gone, then `createMany` for remaining new `AdminUser` rows (`mustChangePassword: false`, `disabled` mirrors whether the user is currently banned). Existing ids are never overwritten.
   - Assigns **Super-admin** to `bivav.r.s@cosbe.inc`.
   - Assigns **Admin** to every other user who has no roles (this also covers rows auto-created between code deploy and script run).
5. `--dry-run` prints the planned changes without writing, like the translation scripts.

The super-admin email is a constant in the script (`BOOTSTRAP_SUPER_ADMIN_EMAIL`), overridable with `--super-admin <email>`. `--super-admin --dry-run` does not treat `--dry-run` as the email. A banned super-admin email is still assigned, with a warning. An email that already belongs to another admin row is not inserted as a second id (avoids unique/FK failures); a stale row whose Auth user is gone is adopted.

The script warns that every unexpected Auth user will become Admin, and prints the Auth user list. Disable public sign-ups before running it.

### Deployment order

1. **Disable public sign-ups** in the Supabase dashboard (Authentication → Providers → Email → turn off “Allow new users to sign up”). The anon key is public; if sign-up is left on, anyone can create an account and bootstrap would give them Admin.
2. Set `SUPABASE_SERVICE_ROLE_KEY` in local `.env` and in Firebase App Hosting env (same place as `DATABASE_URL`). Never prefix it with `NEXT_PUBLIC_`. Copy the **secret key** (`sb_secret_...`) from Supabase → Project Settings → API Keys. That is the replacement for the old `service_role` JWT.
3. Run `yarn db:deploy`, then `yarn db:bootstrap-admins` against production. Abort if the printed Auth user list includes unexpected emails.
4. Run the updated `supabase/schema.sql` storage section in the Supabase SQL editor.
5. Deploy the code.

If the code is deployed before steps 2–3, existing admins are auto-provisioned with no roles and see "Permission needed" until the bootstrap runs; nothing is corrupted. The same order applies to local/dev databases.

CLAUDE.md gets a short "Users & permissions" section (commands, adding a new permission to the catalog, deploy order).

## 5. Testing

Vitest, using the existing projects.

**unit**

- `authz-rules.ts`: every rule branch — self-modification, super-admin target from a non-super-admin, escalation on assign/remove/create/edit, system role edit/delete.
- `permissions.ts`: catalog shape; every key has `admin-en` and `admin-ja` label/description entries.
- Zod schemas for users and roles (email, password length, role key format, unknown permissions rejected).

- `resolvePermissions`: union of multiple roles, super-admin gets full catalog, unknown permission strings ignored.
- `article-status-permissions.ts`: every transition.
- `getCurrentAdmin` / `requirePermission` (Supabase client and repository mocked): unauthenticated, disabled, must-change-password, auto-provisioning, forbidden, allowed.
- User actions (Supabase admin wrapper and repositories mocked, following the existing action tests): create success; rollback deletes the Supabase user when the DB write fails; duplicate email; disable ordering and ban failure; enable; delete requires disabled; every guardrail rejection.
- Role actions: create/update/delete, system role protection, escalation rejection.
- Bootstrap plan (pure function): missing super-admin email aborts; existing rows and roles aren't overwritten; banned users imported as disabled.
- Existing action tests and the media API route test cover the new permission checks.

**db**

- Repositories against Postgres: provisioning, role replacement, cascade on role/user delete.
- Migration seed: default roles exist and their permissions equal `DEFAULT_ROLE_PERMISSIONS`; RLS is enabled on the four tables.

**component**

- `PermissionNeeded` renders the permission label.
- `AdminProtectedShell` hides nav items per permissions.
- Users table shows only permitted row actions; none on own row.
- Role checkboxes disabled when `canAssignRole` fails; role editor disables unheld permissions.
- Change-password form validation.

**Existing tests**

- Tests that mock `@/lib/require-user` switch to mocking `@/lib/authz`.
- Each action test file gains a "Forbidden without permission" case.
- `layout.test.ts` covers the four protected-layout branches.

## Out of scope (v1)

- Audit log of administrative actions
- Email invites and "forgot password" (need SMTP)
- MFA
- Per-article ownership rules
- Creating new permissions from the UI (permissions stay code-defined)
- Row Level Security on existing tables (`articles`, `translations`, …). They have none today; if the Data API exposes `public` they are writable with the anon key. Check Supabase → Security Advisor separately.

## Review addendum

Decisions from implementation reviews. The code matches these; do not re-open them without a reason.

### Session revocation

GoTrue has no admin “log out this user id” endpoint. Reset and disable delete `auth.sessions` through Prisma. Refresh tokens have `session_id … ON DELETE CASCADE`; `auth.refresh_tokens.user_id` is `varchar`, so a uuid-cast compare fails and is not used.

The `DATABASE_URL` role must be allowed to `DELETE` from `auth.sessions`. The default Supabase `postgres` user can. A restricted Prisma role cannot, and then the password/ban has already been applied. Those actions return `SESSIONS_NOT_REVOKED` instead of `FAILED`. Confirm privileges with:

```sql
DELETE FROM auth.sessions WHERE user_id = '00000000-0000-0000-0000-000000000000';
```

0 rows is success. Already-issued access tokens stay valid until they expire.

### Provisioning and adoption

- Adopt only when the signed-in user has no `admin_users` row. Email sync never adopts; a clash is logged and the existing row is kept.
- A `P2002` on `id` during provision is a create race and returns that row. A `P2002` on `email` still becomes `EmailOwnedByOtherRowError`.
- Concurrent first-request adoptions: if the loser cannot move the stale row, it returns the winner’s new row.
- Creating a user that adopts a stale row applies the chosen display name, roles, `mustChangePassword: true`, and `disabled: false` in the same transaction as the id move. If that transaction fails, the stale row is unchanged and the new Auth user is deleted.
- Adopting a disabled stale row **re-enables** it (`disabled: false`) on login auto-adopt and on create-user adopt. The admin is creating or the user is signing in; keeping them disabled would lock them out with no explanation. Bootstrap still mirrors the Auth ban flag.

### Freshness

`layout.tsx` owns disabled / must-change-password redirects. The shell calls `router.refresh()` on pathname change so the persisted layout re-runs. That doubles the server fetch on each client navigation; accepted so the shell is not remounted via `template.tsx`.

### Bootstrap

`--super-admin` requires an email value. Auth emails are lowercased when planning and writing. Adoptions run inside the write transaction.
