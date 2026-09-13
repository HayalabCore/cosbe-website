# Admin User Management & Permissions Implementation Plan

> **Superseded by the spec and the code.** Do not execute this plan. Current source of truth: `docs/superpowers/specs/2026-09-13-admin-user-management-design.md` and the implementation in the repo.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manage admin users (create, disable, delete) and UI-managed roles built from code-defined permissions, enforced on every admin page, server action, API route and storage write.

**Architecture:** Four Prisma tables (`admin_users`, `roles`, `role_permissions`, `user_roles`) keyed by the Supabase auth user id. `src/lib/authz.ts` loads the current user's permissions once per request and replaces `requireUser()` with `requirePermission(...)`. Pure guardrail functions (`src/lib/authz-rules.ts`) are shared by server actions and UI. Supabase Auth account operations go through a service-role client wrapper.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6, Supabase (`@supabase/ssr`, `@supabase/supabase-js` 2.x), next-intl, Zod 4, Vitest 4 (`unit` / `component` / `db` projects), Tailwind v4, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-13-admin-user-management-design.md`

## Global Constraints

- **Do not run `git commit` (or `git add`) at any point.** The user commits manually. Leave every change in the working tree.
- Never run migrations or scripts against a database unless you have confirmed `DATABASE_URL` is not production. If unsure, stop and ask.
- Node 24 (`nvm use`). Package manager: `yarn`.
- Super-admin bootstrap email: `bivav.r.s@cosbe.inc`.
- Role key of the system role: `super-admin`. Default role keys: `admin`, `developer`, `marketing`.
- Temporary/new password minimum length: 12 characters. Generated temporary passwords: 16 characters.
- Supabase ban duration for disabled users: `'876000h'`; unban: `'none'`.
- Service role env var: `SUPABASE_SERVICE_ROLE_KEY` (never `NEXT_PUBLIC_`).
- All admin UI copy goes in both `messages/admin-en.json` and `messages/admin-ja.json`.
- Match existing style: 2-space indent, single quotes, Prettier formatting (`yarn format` on touched files), `@/` imports.
- After editing `prisma/schema.prisma`, run `yarn postinstall`.
- Verification commands: `yarn test`, `yarn type-check`, `yarn lint`. DB slice: `ADMIN_TEST_DB=1 yarn test:db` (only against a local/CI Postgres).

## File Map

| File                                                                                | Responsibility                                                                                          |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/lib/permissions.ts`                                                            | Permission catalog, default role permission sets, `resolvePermissions`                                  |
| `src/lib/authz-rules.ts`                                                            | Pure guardrails: `canAssignRole`, `canModifyUser`, `canEditRole`, `canDeleteRole`                       |
| `src/lib/article-status-permissions.ts`                                             | Permissions required for an article status transition                                                   |
| `prisma/schema.prisma` + `prisma/migrations/<ts>_add_user_management/migration.sql` | Tables, RLS, default roles                                                                              |
| `src/lib/admin-users-repository.ts`                                                 | Prisma queries for admin users                                                                          |
| `src/lib/roles-repository.ts`                                                       | Prisma queries for roles                                                                                |
| `src/lib/access-types.ts`                                                           | Serializable DTOs + action result/error codes shared by server and client                               |
| `src/lib/authz.ts`                                                                  | `getCurrentAdmin`, `requirePermission`, `requireAnyPermission`, `requireActiveSession`, `hasPermission` |
| `src/test/authz.ts`                                                                 | Test helper replacing `src/test/require-user.ts`                                                        |
| `src/lib/supabase/admin-core.ts`                                                    | Service-role client + auth admin wrappers (no `server-only`, usable from scripts)                       |
| `src/lib/supabase/admin.ts`                                                         | `server-only` re-export of `admin-core` for app code                                                    |
| `src/lib/validation/access.ts`                                                      | Zod schemas for user/role/password inputs                                                               |
| `src/lib/temp-password.ts`                                                          | `generateTempPassword()`                                                                                |
| `src/actions/users.ts`, `src/actions/roles.ts`, `src/actions/account.ts`            | Server actions                                                                                          |
| `src/components/admin/PermissionsContext.tsx`                                       | `PermissionsProvider`, `usePermissions`                                                                 |
| `src/components/admin/PermissionNeeded.tsx`                                         | "Permission needed" screen                                                                              |
| `src/components/admin/access/*`                                                     | Users/roles UI (dialog, tables, forms)                                                                  |
| `src/app/admin/(protected)/users/page.tsx`, `.../roles/page.tsx`                    | Pages                                                                                                   |
| `src/app/admin/change-password/page.tsx`                                            | Forced password change                                                                                  |
| `src/lib/admin-bootstrap-plan.ts` + `scripts/bootstrap-admin-users.ts`              | Bootstrap                                                                                               |
| `supabase/schema.sql`                                                               | Storage policies + `admin_has_any_permission`                                                           |

---

### Task 1: Permission catalog

**Files:**

- Create: `src/lib/permissions.ts`
- Test: `src/lib/permissions.test.ts`

**Interfaces:**

- Produces:
  - `type Permission` (union of catalog keys), `type PermissionGroup = 'content' | 'media' | 'translations' | 'access'`
  - `PERMISSIONS: Record<Permission, { group: PermissionGroup }>`
  - `ALL_PERMISSIONS: Permission[]`, `PERMISSION_GROUPS: PermissionGroup[]`
  - `SUPER_ADMIN_ROLE_KEY = 'super-admin'`
  - `DEFAULT_ROLE_PERMISSIONS: Record<'admin' | 'developer' | 'marketing', Permission[]>`
  - `isPermission(value: string): value is Permission`
  - `permissionMessageKey(p: Permission): string` — dots → underscores (`'translations.history.delete'` → `'translations_history_delete'`)
  - `resolvePermissions(roles: { key: string; permissions: readonly string[] }[]): { permissions: Set<Permission>; isSuperAdmin: boolean }`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/permissions.test.ts
import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  SUPER_ADMIN_ROLE_KEY,
  isPermission,
  permissionMessageKey,
  resolvePermissions,
} from './permissions';

describe('permission catalog', () => {
  it('has the 16 spec permissions', () => {
    expect(ALL_PERMISSIONS).toHaveLength(16);
    expect(ALL_PERMISSIONS).toContain('users.delete');
    expect(ALL_PERMISSIONS).toContain('translations.history.delete');
  });

  it('isPermission rejects unknown strings', () => {
    expect(isPermission('articles.publish')).toBe(true);
    expect(isPermission('articles.fly')).toBe(false);
  });

  it('permissionMessageKey replaces dots', () => {
    expect(permissionMessageKey('translations.history.delete')).toBe(
      'translations_history_delete'
    );
    expect(permissionMessageKey('users.assign-roles')).toBe(
      'users_assign-roles'
    );
  });

  it('admin default role has everything except users.delete', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.admin).not.toContain('users.delete');
    expect(DEFAULT_ROLE_PERMISSIONS.admin).toHaveLength(
      ALL_PERMISSIONS.length - 1
    );
  });

  it('developer has no access-management permissions', () => {
    expect(
      DEFAULT_ROLE_PERMISSIONS.developer.some(
        (p) => p.startsWith('users.') || p.startsWith('roles.')
      )
    ).toBe(false);
  });
});

describe('resolvePermissions', () => {
  it('returns an empty set for no roles', () => {
    const r = resolvePermissions([]);
    expect(r.permissions.size).toBe(0);
    expect(r.isSuperAdmin).toBe(false);
  });

  it('unions multiple roles and ignores unknown strings', () => {
    const r = resolvePermissions([
      { key: 'a', permissions: ['media.upload', 'gone.permission'] },
      { key: 'b', permissions: ['media.delete', 'media.upload'] },
    ]);
    expect([...r.permissions].sort()).toEqual(['media.delete', 'media.upload']);
  });

  it('super-admin gets the whole catalog', () => {
    const r = resolvePermissions([
      { key: SUPER_ADMIN_ROLE_KEY, permissions: [] },
    ]);
    expect(r.isSuperAdmin).toBe(true);
    expect(r.permissions.size).toBe(ALL_PERMISSIONS.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run --project unit src/lib/permissions.test.ts`
Expected: FAIL — cannot resolve `./permissions`.

- [ ] **Step 3: Implement**

```ts
// src/lib/permissions.ts
export type PermissionGroup = 'content' | 'media' | 'translations' | 'access';

export const PERMISSION_GROUPS: PermissionGroup[] = [
  'content',
  'media',
  'translations',
  'access',
];

/**
 * Code-defined permission catalog. Roles (managed in the admin UI) are bundles
 * of these keys. A permission only means something where code checks it, so
 * new keys are added here together with the check that uses them.
 */
export const PERMISSIONS = {
  'dashboard.view': { group: 'content' },
  'articles.edit': { group: 'content' },
  'articles.publish': { group: 'content' },
  'articles.archive': { group: 'content' },
  'articles.delete': { group: 'content' },
  'import.run': { group: 'content' },
  'media.upload': { group: 'media' },
  'media.delete': { group: 'media' },
  'translations.edit': { group: 'translations' },
  'translations.history.delete': { group: 'translations' },
  'users.view': { group: 'access' },
  'users.create': { group: 'access' },
  'users.assign-roles': { group: 'access' },
  'users.disable': { group: 'access' },
  'users.delete': { group: 'access' },
  'roles.manage': { group: 'access' },
} as const satisfies Record<string, { group: PermissionGroup }>;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const SUPER_ADMIN_ROLE_KEY = 'super-admin';

/** Must match the seed SQL in the add_user_management migration. */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  'admin' | 'developer' | 'marketing',
  Permission[]
> = {
  admin: ALL_PERMISSIONS.filter((p) => p !== 'users.delete'),
  developer: [
    'dashboard.view',
    'articles.edit',
    'articles.publish',
    'articles.archive',
    'articles.delete',
    'import.run',
    'media.upload',
    'media.delete',
    'translations.edit',
    'translations.history.delete',
  ],
  marketing: [
    'dashboard.view',
    'articles.edit',
    'articles.publish',
    'media.upload',
    'translations.edit',
  ],
};

export function isPermission(value: string): value is Permission {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, value);
}

/** next-intl treats dots as nesting, so message keys use underscores. */
export function permissionMessageKey(p: Permission): string {
  return p.replace(/\./g, '_');
}

export function resolvePermissions(
  roles: { key: string; permissions: readonly string[] }[]
): { permissions: Set<Permission>; isSuperAdmin: boolean } {
  const isSuperAdmin = roles.some((r) => r.key === SUPER_ADMIN_ROLE_KEY);
  if (isSuperAdmin) {
    return { permissions: new Set(ALL_PERMISSIONS), isSuperAdmin };
  }
  const permissions = new Set<Permission>();
  for (const role of roles) {
    for (const p of role.permissions) {
      if (isPermission(p)) permissions.add(p);
    }
  }
  return { permissions, isSuperAdmin };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run --project unit src/lib/permissions.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Leave uncommitted.** Do not commit.

---

### Task 2: Guardrail rules

**Files:**

- Create: `src/lib/authz-rules.ts`
- Test: `src/lib/authz-rules.test.ts`

**Interfaces:**

- Consumes: `Permission`, `SUPER_ADMIN_ROLE_KEY`, `isPermission` from Task 1.
- Produces:
  - `type Actor = { userId: string; permissions: ReadonlySet<Permission>; isSuperAdmin: boolean }`
  - `type RoleLike = { key: string; isSystem: boolean; permissions: readonly string[] }`
  - `holdsAll(actor: Actor, perms: readonly string[]): boolean` (unknown strings ignored)
  - `canAssignRole(actor: Actor, role: RoleLike): boolean`
  - `canModifyUser(actor: Actor, target: { id: string; isSuperAdmin: boolean }): boolean`
  - `canEditRole(actor: Actor, role: RoleLike | null, nextPermissions: readonly string[]): boolean` (`null` = new role)
  - `canDeleteRole(actor: Actor, role: RoleLike): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/authz-rules.test.ts
import { describe, expect, it } from 'vitest';
import {
  canAssignRole,
  canDeleteRole,
  canEditRole,
  canModifyUser,
  holdsAll,
  type Actor,
  type RoleLike,
} from './authz-rules';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from './permissions';

const superAdmin: Actor = {
  userId: 'sa',
  permissions: new Set(ALL_PERMISSIONS),
  isSuperAdmin: true,
};
const admin: Actor = {
  userId: 'ad',
  permissions: new Set(DEFAULT_ROLE_PERMISSIONS.admin),
  isSuperAdmin: false,
};

const superRole: RoleLike = {
  key: 'super-admin',
  isSystem: true,
  permissions: [],
};
const adminRole: RoleLike = {
  key: 'admin',
  isSystem: false,
  permissions: DEFAULT_ROLE_PERMISSIONS.admin,
};
const powerRole: RoleLike = {
  key: 'power',
  isSystem: false,
  permissions: ['users.delete'],
};

describe('holdsAll', () => {
  it('ignores unknown permission strings', () => {
    expect(holdsAll(admin, ['media.upload', 'legacy.gone'])).toBe(true);
  });
  it('fails when one permission is missing', () => {
    expect(holdsAll(admin, ['media.upload', 'users.delete'])).toBe(false);
  });
});

describe('canAssignRole', () => {
  it('only super-admins can assign the super-admin role', () => {
    expect(canAssignRole(superAdmin, superRole)).toBe(true);
    expect(canAssignRole(admin, superRole)).toBe(false);
  });
  it('admin can assign roles within their permissions', () => {
    expect(canAssignRole(admin, adminRole)).toBe(true);
  });
  it('admin cannot assign a role with a permission they lack', () => {
    expect(canAssignRole(admin, powerRole)).toBe(false);
  });
});

describe('canModifyUser', () => {
  it('nobody can modify themselves', () => {
    expect(canModifyUser(superAdmin, { id: 'sa', isSuperAdmin: true })).toBe(
      false
    );
    expect(canModifyUser(admin, { id: 'ad', isSuperAdmin: false })).toBe(false);
  });
  it('only super-admins can modify a super-admin', () => {
    expect(canModifyUser(admin, { id: 'x', isSuperAdmin: true })).toBe(false);
    expect(canModifyUser(superAdmin, { id: 'x', isSuperAdmin: true })).toBe(
      true
    );
  });
  it('admin can modify a regular user', () => {
    expect(canModifyUser(admin, { id: 'x', isSuperAdmin: false })).toBe(true);
  });
});

describe('canEditRole', () => {
  it('system roles are never editable', () => {
    expect(canEditRole(superAdmin, superRole, [])).toBe(false);
  });
  it('creating a role requires holding the new permissions', () => {
    expect(canEditRole(admin, null, ['media.upload'])).toBe(true);
    expect(canEditRole(admin, null, ['users.delete'])).toBe(false);
  });
  it('editing requires holding both current and next permissions', () => {
    // admin cannot strip users.delete from a more powerful role
    expect(canEditRole(admin, powerRole, [])).toBe(false);
    expect(canEditRole(superAdmin, powerRole, [])).toBe(true);
  });
});

describe('canDeleteRole', () => {
  it('system roles cannot be deleted', () => {
    expect(canDeleteRole(superAdmin, superRole)).toBe(false);
  });
  it('requires holding all of the role permissions', () => {
    expect(canDeleteRole(admin, powerRole)).toBe(false);
    expect(canDeleteRole(admin, adminRole)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run --project unit src/lib/authz-rules.test.ts`
Expected: FAIL — cannot resolve `./authz-rules`.

- [ ] **Step 3: Implement**

```ts
// src/lib/authz-rules.ts
import {
  SUPER_ADMIN_ROLE_KEY,
  isPermission,
  type Permission,
} from '@/lib/permissions';

/**
 * Pure access-management guardrails. Server actions enforce these; the admin
 * UI calls the same functions only to disable controls.
 */
export type Actor = {
  userId: string;
  permissions: ReadonlySet<Permission>;
  isSuperAdmin: boolean;
};

export type RoleLike = {
  key: string;
  isSystem: boolean;
  permissions: readonly string[];
};

export function holdsAll(actor: Actor, perms: readonly string[]): boolean {
  if (actor.isSuperAdmin) return true;
  return perms.every((p) => !isPermission(p) || actor.permissions.has(p));
}

/** Rules 2 + 3: super-admin role is super-admin-only; no escalation. */
export function canAssignRole(actor: Actor, role: RoleLike): boolean {
  if (role.key === SUPER_ADMIN_ROLE_KEY || role.isSystem) {
    return actor.isSuperAdmin;
  }
  return holdsAll(actor, role.permissions);
}

/** Rules 2 + 4: never yourself; super-admin targets need a super-admin. */
export function canModifyUser(
  actor: Actor,
  target: { id: string; isSuperAdmin: boolean }
): boolean {
  if (target.id === actor.userId) return false;
  if (target.isSuperAdmin && !actor.isSuperAdmin) return false;
  return true;
}

/** Rules 1 + 3. `role === null` means creating a new role. */
export function canEditRole(
  actor: Actor,
  role: RoleLike | null,
  nextPermissions: readonly string[]
): boolean {
  if (role?.isSystem) return false;
  return (
    holdsAll(actor, role?.permissions ?? []) && holdsAll(actor, nextPermissions)
  );
}

export function canDeleteRole(actor: Actor, role: RoleLike): boolean {
  if (role.isSystem) return false;
  return holdsAll(actor, role.permissions);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run --project unit src/lib/authz-rules.test.ts`
Expected: PASS.

- [ ] **Step 5: Leave uncommitted.** Do not commit.

---

### Task 3: Article status-transition permissions

**Files:**

- Create: `src/lib/article-status-permissions.ts`
- Test: `src/lib/article-status-permissions.test.ts`

**Interfaces:**

- Consumes: `Permission` (Task 1), `ArticleStatus` from `@/types` (`'draft' | 'published' | 'archived'`).
- Produces: `statusChangePermissions(from: ArticleStatus, to: ArticleStatus): Permission[]` — `[]` when unchanged; includes `'articles.publish'` if either side is `published`; includes `'articles.archive'` if either side is `archived`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/article-status-permissions.test.ts
import { describe, expect, it } from 'vitest';
import { statusChangePermissions } from './article-status-permissions';

describe('statusChangePermissions', () => {
  it('no change needs nothing extra', () => {
    expect(statusChangePermissions('published', 'published')).toEqual([]);
    expect(statusChangePermissions('draft', 'draft')).toEqual([]);
  });
  it('publishing and unpublishing need articles.publish', () => {
    expect(statusChangePermissions('draft', 'published')).toEqual([
      'articles.publish',
    ]);
    expect(statusChangePermissions('published', 'draft')).toEqual([
      'articles.publish',
    ]);
  });
  it('archiving and restoring need articles.archive', () => {
    expect(statusChangePermissions('draft', 'archived')).toEqual([
      'articles.archive',
    ]);
    expect(statusChangePermissions('archived', 'draft')).toEqual([
      'articles.archive',
    ]);
  });
  it('published <-> archived needs both', () => {
    expect(statusChangePermissions('published', 'archived')).toEqual([
      'articles.publish',
      'articles.archive',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run --project unit src/lib/article-status-permissions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/article-status-permissions.ts
import type { Permission } from '@/lib/permissions';
import type { ArticleStatus } from '@/types';

/**
 * Extra permissions (beyond `articles.edit`) needed when a create/update
 * changes an article's status. A new article counts as coming from `draft`.
 */
export function statusChangePermissions(
  from: ArticleStatus,
  to: ArticleStatus
): Permission[] {
  if (from === to) return [];
  const needed: Permission[] = [];
  if (from === 'published' || to === 'published') {
    needed.push('articles.publish');
  }
  if (from === 'archived' || to === 'archived') {
    needed.push('articles.archive');
  }
  return needed;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run --project unit src/lib/article-status-permissions.test.ts`
Expected: PASS.

- [ ] **Step 5: Leave uncommitted.** Do not commit.

---

### Task 4: Prisma schema, migration (tables, RLS, default roles)

**Files:**

- Modify: `prisma/schema.prisma` (append four models at the end)
- Create: `prisma/migrations/20260913120000_add_user_management/migration.sql`
- Test: `src/lib/roles-seed.db.test.ts`

**Interfaces:**

- Consumes: `DEFAULT_ROLE_PERMISSIONS`, `SUPER_ADMIN_ROLE_KEY` (Task 1).
- Produces: Prisma client delegates `prisma.adminUser`, `prisma.role`, `prisma.rolePermission`, `prisma.userRole`; generated types `AdminUser`, `Role`, `RolePermission`, `UserRole`.

- [ ] **Step 1: Append models to `prisma/schema.prisma`**

```prisma
/// Admin portal account. `id` equals the Supabase auth.users id.
model AdminUser {
  id                 String     @id @db.Uuid
  email              String     @unique
  displayName        String?    @map("display_name")
  disabled           Boolean    @default(false)
  mustChangePassword Boolean    @default(false) @map("must_change_password")
  createdBy          String?    @map("created_by")
  createdAt          DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime   @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  roles              UserRole[]

  @@map("admin_users")
}

/// UI-managed bundle of code-defined permissions (src/lib/permissions.ts).
model Role {
  id          String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key         String           @unique
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

- [ ] **Step 2: Generate the DDL offline (no database connection needed)**

```bash
git show HEAD:prisma/schema.prisma > "$TMPDIR/schema-before.prisma"
yarn -s prisma migrate diff \
  --from-schema-datamodel "$TMPDIR/schema-before.prisma" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "$TMPDIR/add_user_management.sql"
cat "$TMPDIR/add_user_management.sql"
```

Expected: `CREATE TABLE "admin_users"`, `"roles"`, `"role_permissions"`, `"user_roles"`, unique indexes on `admin_users.email` and `roles.key`, index on `user_roles.role_id`, and three `ADD CONSTRAINT ... FOREIGN KEY ... ON DELETE CASCADE`. Nothing touching existing tables. If anything else appears, stop and investigate.

- [ ] **Step 3: Create the migration file**

Create `prisma/migrations/20260913120000_add_user_management/migration.sql` containing the generated DDL from Step 2 verbatim, followed by:

```sql
-- Prisma creates these in "public", which the Supabase Data API exposes to the
-- public anon key. RLS with no policies blocks anon/authenticated API access;
-- Prisma connects as the table owner and is unaffected.
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;

-- Default roles. Permission sets must match DEFAULT_ROLE_PERMISSIONS in
-- src/lib/permissions.ts (checked by src/lib/roles-seed.db.test.ts).
INSERT INTO "roles" ("key", "name", "description", "is_system") VALUES
  ('super-admin', 'Super-admin', 'Full access to everything, including permissions added in the future.', true),
  ('admin', 'Admin', 'Manages content, media, translations, users and roles. Cannot permanently delete users.', false),
  ('developer', 'Developer', 'Content, import, media and translations. No access management.', false),
  ('marketing', 'Marketing', 'Writes and publishes articles, uploads media and edits UI copy.', false);

INSERT INTO "role_permissions" ("role_id", "permission")
SELECT r."id", p.permission
FROM "roles" r
CROSS JOIN LATERAL unnest(
  CASE r."key"
    WHEN 'admin' THEN ARRAY[
      'dashboard.view', 'articles.edit', 'articles.publish', 'articles.archive',
      'articles.delete', 'import.run', 'media.upload', 'media.delete',
      'translations.edit', 'translations.history.delete', 'users.view',
      'users.create', 'users.assign-roles', 'users.disable', 'roles.manage'
    ]
    WHEN 'developer' THEN ARRAY[
      'dashboard.view', 'articles.edit', 'articles.publish', 'articles.archive',
      'articles.delete', 'import.run', 'media.upload', 'media.delete',
      'translations.edit', 'translations.history.delete'
    ]
    WHEN 'marketing' THEN ARRAY[
      'dashboard.view', 'articles.edit', 'articles.publish', 'media.upload',
      'translations.edit'
    ]
  END
) AS p(permission)
WHERE r."key" IN ('admin', 'developer', 'marketing');
```

- [ ] **Step 4: Regenerate the client and type-check**

Run: `yarn postinstall && yarn type-check`
Expected: success.

- [ ] **Step 5: Write the seed consistency db test**

```ts
// src/lib/roles-seed.db.test.ts
import { describe, expect, it } from 'vitest';
import { prisma } from './prisma';
import { DEFAULT_ROLE_PERMISSIONS, SUPER_ADMIN_ROLE_KEY } from './permissions';

describe('add_user_management migration seed', () => {
  it('creates super-admin as the only system role, with no permission rows', async () => {
    const system = await prisma.role.findMany({
      where: { isSystem: true },
      include: { permissions: true },
    });
    expect(system.map((r) => r.key)).toEqual([SUPER_ADMIN_ROLE_KEY]);
    expect(system[0].permissions).toEqual([]);
  });

  it.each(['admin', 'developer', 'marketing'] as const)(
    '%s permissions match DEFAULT_ROLE_PERMISSIONS',
    async (key) => {
      const role = await prisma.role.findUniqueOrThrow({
        where: { key },
        include: { permissions: true },
      });
      expect(role.permissions.map((p) => p.permission).sort()).toEqual(
        [...DEFAULT_ROLE_PERMISSIONS[key]].sort()
      );
    }
  );

  it('enables RLS on the access tables', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ relname: string; relrowsecurity: boolean }>
    >`SELECT relname, relrowsecurity FROM pg_class
      WHERE relname IN ('admin_users', 'roles', 'role_permissions', 'user_roles')`;
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });
});
```

- [ ] **Step 6: Run the db test (local/CI Postgres only)**

Only if you have a disposable local Postgres (e.g. `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cosbe_test?schema=public \
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/cosbe_test?schema=public \
ADMIN_TEST_DB=1 sh -c 'yarn prisma migrate deploy && yarn vitest run --project db src/lib/roles-seed.db.test.ts'
```

Expected: PASS (5 tests). If no local Postgres is available, note it in your report; CI runs this slice.

- [ ] **Step 7: Leave uncommitted.** Do not commit.

---

### Task 5: Admin user and role repositories

**Files:**

- Create: `src/lib/admin-users-repository.ts`
- Create: `src/lib/roles-repository.ts`
- Test: `src/lib/admin-users-repository.db.test.ts`
- Test: `src/lib/roles-repository.db.test.ts`

**Interfaces:**

- Consumes: Prisma models (Task 4), `SUPER_ADMIN_ROLE_KEY` (Task 1).
- Produces (`admin-users-repository.ts`):
  - `type AdminUserWithRoles = Prisma.AdminUserGetPayload<{ include: { roles: { include: { role: { include: { permissions: true } } } } } }>`
  - `rolesOf(user: AdminUserWithRoles): { id: string; key: string; isSystem: boolean; permissions: string[] }[]`
  - `isSuperAdminUser(user: AdminUserWithRoles): boolean`
  - `findAdminUserWithRoles(id: string): Promise<AdminUserWithRoles | null>`
  - `provisionAdminUser(id: string, email: string): Promise<AdminUserWithRoles>` (upsert, no roles, never overwrites an existing row)
  - `listAdminUsers(): Promise<AdminUserWithRoles[]>` (ordered by email)
  - `createAdminUserRecord(input: { id: string; email: string; displayName: string | null; createdBy: string; roleIds: string[] }): Promise<void>` (`mustChangePassword: true`)
  - `setAdminUserRoles(userId: string, roleIds: string[], assignedBy: string): Promise<void>`
  - `setAdminUserDisabled(userId: string, disabled: boolean): Promise<void>`
  - `setMustChangePassword(userId: string, value: boolean): Promise<void>`
  - `deleteAdminUserRecord(userId: string): Promise<void>`
- Produces (`roles-repository.ts`):
  - `type RoleRecord = { id: string; key: string; name: string; description: string | null; isSystem: boolean; permissions: string[]; userCount: number }`
  - `listRoles(): Promise<RoleRecord[]>` (system first, then by name)
  - `getRoleById(id: string): Promise<RoleRecord | null>`
  - `getRolesByIds(ids: string[]): Promise<RoleRecord[]>`
  - `roleKeyExists(key: string): Promise<boolean>`
  - `createRoleRecord(input: { key: string; name: string; description: string | null; permissions: string[] }): Promise<string>`
  - `updateRoleRecord(id: string, input: { name: string; description: string | null; permissions: string[] }): Promise<void>`
  - `deleteRoleRecord(id: string): Promise<void>`

- [ ] **Step 1: Write the failing db tests**

```ts
// src/lib/admin-users-repository.db.test.ts
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from './prisma';
import {
  createAdminUserRecord,
  deleteAdminUserRecord,
  findAdminUserWithRoles,
  isSuperAdminUser,
  provisionAdminUser,
  rolesOf,
  setAdminUserDisabled,
  setAdminUserRoles,
  setMustChangePassword,
} from './admin-users-repository';

const emailPrefix = 'db-test-user-';

afterEach(async () => {
  await prisma.adminUser.deleteMany({
    where: { email: { startsWith: emailPrefix } },
  });
});

async function roleId(key: string) {
  return (await prisma.role.findUniqueOrThrow({ where: { key } })).id;
}

describe('admin-users-repository db', () => {
  it('provisions a user with no roles and does not overwrite on repeat', async () => {
    const id = randomUUID();
    const first = await provisionAdminUser(id, `${emailPrefix}a@test.local`);
    expect(first.roles).toEqual([]);
    await setAdminUserDisabled(id, true);
    const again = await provisionAdminUser(id, `${emailPrefix}a@test.local`);
    expect(again.disabled).toBe(true);
  });

  it('creates a user with roles and mustChangePassword', async () => {
    const id = randomUUID();
    await createAdminUserRecord({
      id,
      email: `${emailPrefix}b@test.local`,
      displayName: 'B',
      createdBy: 'creator@test.local',
      roleIds: [await roleId('marketing')],
    });
    const user = await findAdminUserWithRoles(id);
    expect(user?.mustChangePassword).toBe(true);
    expect(rolesOf(user!).map((r) => r.key)).toEqual(['marketing']);
    expect(rolesOf(user!)[0].permissions).toContain('articles.publish');
    expect(isSuperAdminUser(user!)).toBe(false);
  });

  it('replaces the role set', async () => {
    const id = randomUUID();
    await createAdminUserRecord({
      id,
      email: `${emailPrefix}c@test.local`,
      displayName: null,
      createdBy: 'x',
      roleIds: [await roleId('marketing')],
    });
    await setAdminUserRoles(
      id,
      [await roleId('developer'), await roleId('super-admin')],
      'actor@test.local'
    );
    const user = await findAdminUserWithRoles(id);
    expect(
      rolesOf(user!)
        .map((r) => r.key)
        .sort()
    ).toEqual(['developer', 'super-admin']);
    expect(isSuperAdminUser(user!)).toBe(true);
  });

  it('toggles mustChangePassword and deletes with cascade', async () => {
    const id = randomUUID();
    await createAdminUserRecord({
      id,
      email: `${emailPrefix}d@test.local`,
      displayName: null,
      createdBy: 'x',
      roleIds: [await roleId('marketing')],
    });
    await setMustChangePassword(id, false);
    expect((await findAdminUserWithRoles(id))?.mustChangePassword).toBe(false);
    await deleteAdminUserRecord(id);
    expect(await findAdminUserWithRoles(id)).toBeNull();
    expect(await prisma.userRole.count({ where: { userId: id } })).toBe(0);
  });
});
```

```ts
// src/lib/roles-repository.db.test.ts
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from './prisma';
import {
  createRoleRecord,
  deleteRoleRecord,
  getRoleById,
  getRolesByIds,
  listRoles,
  roleKeyExists,
  updateRoleRecord,
} from './roles-repository';
import { createAdminUserRecord } from './admin-users-repository';

afterEach(async () => {
  await prisma.adminUser.deleteMany({
    where: { email: { startsWith: 'db-test-role-' } },
  });
  await prisma.role.deleteMany({ where: { key: { startsWith: 'db-test-' } } });
});

describe('roles-repository db', () => {
  it('lists the system role first, with user counts', async () => {
    const roles = await listRoles();
    expect(roles[0].key).toBe('super-admin');
    expect(roles.every((r) => typeof r.userCount === 'number')).toBe(true);
  });

  it('creates, updates and reads a role', async () => {
    const id = await createRoleRecord({
      key: 'db-test-editor',
      name: 'Editor',
      description: null,
      permissions: ['articles.edit'],
    });
    expect(await roleKeyExists('db-test-editor')).toBe(true);
    await updateRoleRecord(id, {
      name: 'Editor 2',
      description: 'desc',
      permissions: ['articles.edit', 'media.upload'],
    });
    const role = await getRoleById(id);
    expect(role?.name).toBe('Editor 2');
    expect(role?.permissions.sort()).toEqual(['articles.edit', 'media.upload']);
    expect((await getRolesByIds([id])).map((r) => r.id)).toEqual([id]);
  });

  it('deleting a role removes it from users', async () => {
    const id = await createRoleRecord({
      key: 'db-test-temp',
      name: 'Temp',
      description: null,
      permissions: [],
    });
    const userId = randomUUID();
    await createAdminUserRecord({
      id: userId,
      email: 'db-test-role-a@test.local',
      displayName: null,
      createdBy: 'x',
      roleIds: [id],
    });
    expect((await getRoleById(id))?.userCount).toBe(1);
    await deleteRoleRecord(id);
    expect(await prisma.userRole.count({ where: { userId } })).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run (local Postgres only, same env as Task 4 Step 6): `ADMIN_TEST_DB=1 yarn vitest run --project db src/lib/admin-users-repository.db.test.ts src/lib/roles-repository.db.test.ts`
Expected: FAIL — modules not found. Without a local Postgres, run `yarn type-check` after Step 3 instead and note it.

- [ ] **Step 3: Implement `src/lib/admin-users-repository.ts`**

```ts
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { SUPER_ADMIN_ROLE_KEY } from '@/lib/permissions';

const withRoles = {
  roles: { include: { role: { include: { permissions: true } } } },
} satisfies Prisma.AdminUserInclude;

export type AdminUserWithRoles = Prisma.AdminUserGetPayload<{
  include: typeof withRoles;
}>;

export function rolesOf(user: AdminUserWithRoles) {
  return user.roles.map(({ role }) => ({
    id: role.id,
    key: role.key,
    isSystem: role.isSystem,
    permissions: role.permissions.map((p) => p.permission),
  }));
}

export function isSuperAdminUser(user: AdminUserWithRoles): boolean {
  return user.roles.some(({ role }) => role.key === SUPER_ADMIN_ROLE_KEY);
}

export async function findAdminUserWithRoles(
  id: string
): Promise<AdminUserWithRoles | null> {
  return prisma.adminUser.findUnique({ where: { id }, include: withRoles });
}

/** Creates a role-less row for a Supabase user that has none; never overwrites. */
export async function provisionAdminUser(
  id: string,
  email: string
): Promise<AdminUserWithRoles> {
  return prisma.adminUser.upsert({
    where: { id },
    create: { id, email },
    update: {},
    include: withRoles,
  });
}

export async function listAdminUsers(): Promise<AdminUserWithRoles[]> {
  return prisma.adminUser.findMany({
    orderBy: { email: 'asc' },
    include: withRoles,
  });
}

export async function createAdminUserRecord(input: {
  id: string;
  email: string;
  displayName: string | null;
  createdBy: string;
  roleIds: string[];
}): Promise<void> {
  await prisma.adminUser.create({
    data: {
      id: input.id,
      email: input.email,
      displayName: input.displayName,
      createdBy: input.createdBy,
      mustChangePassword: true,
      roles: {
        create: input.roleIds.map((roleId) => ({
          roleId,
          assignedBy: input.createdBy,
        })),
      },
    },
  });
}

export async function setAdminUserRoles(
  userId: string,
  roleIds: string[],
  assignedBy: string
): Promise<void> {
  await prisma.$transaction([
    prisma.userRole.deleteMany({
      where: { userId, roleId: { notIn: roleIds } },
    }),
    prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId, assignedBy })),
      skipDuplicates: true,
    }),
  ]);
}

export async function setAdminUserDisabled(
  userId: string,
  disabled: boolean
): Promise<void> {
  await prisma.adminUser.update({ where: { id: userId }, data: { disabled } });
}

export async function setMustChangePassword(
  userId: string,
  value: boolean
): Promise<void> {
  await prisma.adminUser.update({
    where: { id: userId },
    data: { mustChangePassword: value },
  });
}

export async function deleteAdminUserRecord(userId: string): Promise<void> {
  await prisma.adminUser.delete({ where: { id: userId } });
}
```

- [ ] **Step 4: Implement `src/lib/roles-repository.ts`**

```ts
import { prisma } from '@/lib/prisma';

export type RoleRecord = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
};

const roleInclude = {
  permissions: true,
  _count: { select: { users: true } },
} as const;

type RoleRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: string }[];
  _count: { users: number };
};

function toRecord(row: RoleRow): RoleRecord {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    permissions: row.permissions.map((p) => p.permission),
    userCount: row._count.users,
  };
}

export async function listRoles(): Promise<RoleRecord[]> {
  const rows = await prisma.role.findMany({
    include: roleInclude,
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });
  return rows.map(toRecord);
}

export async function getRoleById(id: string): Promise<RoleRecord | null> {
  const row = await prisma.role.findUnique({
    where: { id },
    include: roleInclude,
  });
  return row ? toRecord(row) : null;
}

export async function getRolesByIds(ids: string[]): Promise<RoleRecord[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.role.findMany({
    where: { id: { in: ids } },
    include: roleInclude,
  });
  return rows.map(toRecord);
}

export async function roleKeyExists(key: string): Promise<boolean> {
  return (await prisma.role.count({ where: { key } })) > 0;
}

export async function createRoleRecord(input: {
  key: string;
  name: string;
  description: string | null;
  permissions: string[];
}): Promise<string> {
  const role = await prisma.role.create({
    data: {
      key: input.key,
      name: input.name,
      description: input.description,
      permissions: {
        create: input.permissions.map((permission) => ({ permission })),
      },
    },
    select: { id: true },
  });
  return role.id;
}

export async function updateRoleRecord(
  id: string,
  input: { name: string; description: string | null; permissions: string[] }
): Promise<void> {
  await prisma.$transaction([
    prisma.role.update({
      where: { id },
      data: { name: input.name, description: input.description },
    }),
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.rolePermission.createMany({
      data: input.permissions.map((permission) => ({ roleId: id, permission })),
    }),
  ]);
}

export async function deleteRoleRecord(id: string): Promise<void> {
  await prisma.role.delete({ where: { id } });
}
```

- [ ] **Step 5: Verify**

Run: `yarn type-check`, then (local Postgres only) `ADMIN_TEST_DB=1 yarn vitest run --project db src/lib/admin-users-repository.db.test.ts src/lib/roles-repository.db.test.ts`
Expected: type-check passes; db tests PASS (7 tests).

- [ ] **Step 6: Leave uncommitted.** Do not commit.

---

### Task 6: Authorization module and test helper

**Files:**

- Create: `src/lib/authz.ts`
- Create: `src/test/authz.ts`
- Test: `src/lib/authz.test.ts`

**Interfaces:**

- Consumes: `createServerSupabaseClient` (`@/lib/supabase/server`); `findAdminUserWithRoles`, `provisionAdminUser`, `rolesOf`, `AdminUserWithRoles` (Task 5); `resolvePermissions`, `Permission` (Task 1); `Actor` (Task 2).
- Produces (`src/lib/authz.ts`, `server-only`):
  - `UNAUTHORIZED_ERROR = 'Unauthorized'`, `FORBIDDEN_ERROR = 'Forbidden'`
  - `type CurrentAdmin =`
    `| { status: 'unauthenticated' }`
    `| { status: 'disabled'; supabase: SupabaseClient; user: User; admin: AdminUserWithRoles }`
    `| { status: 'must-change-password'; supabase: SupabaseClient; user: User; admin: AdminUserWithRoles }`
    `| { status: 'active'; supabase: SupabaseClient; user: User; admin: AdminUserWithRoles; actor: Actor }`
  - `type AuthzContext = Extract<CurrentAdmin, { status: 'active' }>`
  - `getCurrentAdmin(): Promise<CurrentAdmin>` (React `cache`)
  - `requirePermission(...perms: Permission[]): Promise<AuthzContext>` — all required
  - `requireAnyPermission(...perms: Permission[]): Promise<AuthzContext>` — at least one
  - `requireActiveSession(): Promise<Exclude<CurrentAdmin, { status: 'unauthenticated' | 'disabled' }>>`
  - `hasPermission(perm: Permission): Promise<boolean>`
- Produces (`src/test/authz.ts`):
  - `TEST_USER = { id: 'user-1', email: 'admin@test.local' }`
  - `authed(permissions?: readonly Permission[], opts?: { isSuperAdmin?: boolean }): AuthzContext-like object` — configures the mocked `requirePermission` / `requireAnyPermission` / `requireActiveSession` to enforce the given permissions (default: all) and returns the context so tests can reach `ctx.supabase`.
  - `unauth(): void` — all three reject with `Error('Unauthorized')`.
  - Test files must mock the module with an inline factory (vitest hoists `vi.mock`, so the factory cannot reference imports):
    ```ts
    vi.mock('@/lib/authz', () => ({
      requirePermission: vi.fn(),
      requireAnyPermission: vi.fn(),
      requireActiveSession: vi.fn(),
    }));
    ```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/authz.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/admin-users-repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/admin-users-repository')>();
  return {
    ...actual,
    findAdminUserWithRoles: vi.fn(),
    provisionAdminUser: vi.fn(),
  };
});

import {
  getCurrentAdmin,
  hasPermission,
  requireActiveSession,
  requireAnyPermission,
  requirePermission,
} from './authz';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  findAdminUserWithRoles,
  provisionAdminUser,
} from '@/lib/admin-users-repository';

function session(user: { id: string; email: string } | null) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  } as never);
}

function adminRow(
  overrides: Partial<{
    disabled: boolean;
    mustChangePassword: boolean;
    roles: { key: string; permissions: string[] }[];
  }> = {}
) {
  const roles = overrides.roles ?? [];
  return {
    id: 'u1',
    email: 'u1@test.local',
    displayName: null,
    disabled: overrides.disabled ?? false,
    mustChangePassword: overrides.mustChangePassword ?? false,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: roles.map((r, i) => ({
      userId: 'u1',
      roleId: `r${i}`,
      assignedBy: null,
      assignedAt: new Date(),
      role: {
        id: `r${i}`,
        key: r.key,
        name: r.key,
        description: null,
        isSystem: r.key === 'super-admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: r.permissions.map((permission) => ({
          roleId: `r${i}`,
          permission,
        })),
      },
    })),
  };
}

describe('getCurrentAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is unauthenticated without a session', async () => {
    session(null);
    expect((await getCurrentAdmin()).status).toBe('unauthenticated');
  });

  it('auto-provisions a missing row with no permissions', async () => {
    session({ id: 'u1', email: 'u1@test.local' });
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(null);
    vi.mocked(provisionAdminUser).mockResolvedValue(adminRow() as never);
    const result = await getCurrentAdmin();
    expect(provisionAdminUser).toHaveBeenCalledWith('u1', 'u1@test.local');
    expect(result.status).toBe('active');
    if (result.status === 'active') {
      expect(result.actor.permissions.size).toBe(0);
    }
  });

  it('reports disabled before must-change-password', async () => {
    session({ id: 'u1', email: 'u1@test.local' });
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      adminRow({ disabled: true, mustChangePassword: true }) as never
    );
    expect((await getCurrentAdmin()).status).toBe('disabled');
  });

  it('reports must-change-password', async () => {
    session({ id: 'u1', email: 'u1@test.local' });
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      adminRow({ mustChangePassword: true }) as never
    );
    expect((await getCurrentAdmin()).status).toBe('must-change-password');
  });
});

describe('requirePermission / requireAnyPermission / hasPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session({ id: 'u1', email: 'u1@test.local' });
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      adminRow({
        roles: [{ key: 'marketing', permissions: ['articles.edit'] }],
      }) as never
    );
  });

  it('allows a held permission', async () => {
    const ctx = await requirePermission('articles.edit');
    expect(ctx.user.id).toBe('u1');
  });

  it('throws Forbidden when any permission is missing', async () => {
    await expect(
      requirePermission('articles.edit', 'articles.publish')
    ).rejects.toThrow('Forbidden');
  });

  it('requireAnyPermission passes with one match', async () => {
    await expect(
      requireAnyPermission('media.upload', 'articles.edit')
    ).resolves.toBeTruthy();
    await expect(requireAnyPermission('media.upload')).rejects.toThrow(
      'Forbidden'
    );
  });

  it('throws Unauthorized without a session', async () => {
    session(null);
    await expect(requirePermission('articles.edit')).rejects.toThrow(
      'Unauthorized'
    );
  });

  it('throws Forbidden while a password change is pending', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      adminRow({
        mustChangePassword: true,
        roles: [{ key: 'marketing', permissions: ['articles.edit'] }],
      }) as never
    );
    await expect(requirePermission('articles.edit')).rejects.toThrow(
      'Forbidden'
    );
    await expect(requireActiveSession()).resolves.toMatchObject({
      status: 'must-change-password',
    });
  });

  it('requireActiveSession rejects disabled users', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      adminRow({ disabled: true }) as never
    );
    await expect(requireActiveSession()).rejects.toThrow('Forbidden');
  });

  it('hasPermission never throws', async () => {
    expect(await hasPermission('articles.edit')).toBe(true);
    expect(await hasPermission('users.delete')).toBe(false);
    session(null);
    expect(await hasPermission('articles.edit')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `yarn vitest run --project unit src/lib/authz.test.ts`
Expected: FAIL — `./authz` not found.

- [ ] **Step 3: Implement `src/lib/authz.ts`**

```ts
import 'server-only';

import { cache } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  findAdminUserWithRoles,
  provisionAdminUser,
  rolesOf,
  type AdminUserWithRoles,
} from '@/lib/admin-users-repository';
import { resolvePermissions, type Permission } from '@/lib/permissions';
import type { Actor } from '@/lib/authz-rules';

export const UNAUTHORIZED_ERROR = 'Unauthorized';
export const FORBIDDEN_ERROR = 'Forbidden';

type Session = {
  supabase: SupabaseClient;
  user: User;
  admin: AdminUserWithRoles;
};

export type CurrentAdmin =
  | { status: 'unauthenticated' }
  | ({ status: 'disabled' } & Session)
  | ({ status: 'must-change-password' } & Session)
  | ({ status: 'active'; actor: Actor } & Session);

export type AuthzContext = Extract<CurrentAdmin, { status: 'active' }>;

/**
 * The single authorization chokepoint. Verifies the session with the auth
 * server (`getUser`, not `getSession`), then loads the admin row + roles once
 * per request. A Supabase user without a row gets one with no roles.
 */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'unauthenticated' };

  const admin =
    (await findAdminUserWithRoles(user.id)) ??
    (await provisionAdminUser(user.id, user.email ?? `${user.id}@unknown`));

  if (admin.disabled) return { status: 'disabled', supabase, user, admin };
  if (admin.mustChangePassword) {
    return { status: 'must-change-password', supabase, user, admin };
  }

  const { permissions, isSuperAdmin } = resolvePermissions(rolesOf(admin));
  return {
    status: 'active',
    supabase,
    user,
    admin,
    actor: { userId: user.id, permissions, isSuperAdmin },
  };
});

async function requireActive(): Promise<AuthzContext> {
  const current = await getCurrentAdmin();
  if (current.status === 'unauthenticated') throw new Error(UNAUTHORIZED_ERROR);
  if (current.status !== 'active') throw new Error(FORBIDDEN_ERROR);
  return current;
}

/** Server actions: throws unless the user holds every listed permission. */
export async function requirePermission(
  ...perms: Permission[]
): Promise<AuthzContext> {
  const ctx = await requireActive();
  if (!perms.every((p) => ctx.actor.permissions.has(p))) {
    throw new Error(FORBIDDEN_ERROR);
  }
  return ctx;
}

/** Server actions: throws unless the user holds at least one listed permission. */
export async function requireAnyPermission(
  ...perms: Permission[]
): Promise<AuthzContext> {
  const ctx = await requireActive();
  if (!perms.some((p) => ctx.actor.permissions.has(p))) {
    throw new Error(FORBIDDEN_ERROR);
  }
  return ctx;
}

/** Signed in and not disabled; allowed while a password change is pending. */
export async function requireActiveSession(): Promise<
  Exclude<CurrentAdmin, { status: 'unauthenticated' | 'disabled' }>
> {
  const current = await getCurrentAdmin();
  if (current.status === 'unauthenticated') throw new Error(UNAUTHORIZED_ERROR);
  if (current.status === 'disabled') throw new Error(FORBIDDEN_ERROR);
  return current;
}

/** Pages: non-throwing check. */
export async function hasPermission(perm: Permission): Promise<boolean> {
  const current = await getCurrentAdmin();
  return current.status === 'active' && current.actor.permissions.has(perm);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run --project unit src/lib/authz.test.ts`
Expected: PASS (11 tests). React 19 exports `cache` from every build; outside a server render it does not memoize, which is what these tests want.

- [ ] **Step 5: Implement the test helper `src/test/authz.ts`**

```ts
import { vi } from 'vitest';
import {
  requireActiveSession,
  requireAnyPermission,
  requirePermission,
} from '@/lib/authz';
import { ALL_PERMISSIONS, type Permission } from '@/lib/permissions';

export const TEST_USER = { id: 'user-1', email: 'admin@test.local' };

/**
 * Configures the mocked authz module (see the inline `vi.mock('@/lib/authz')`
 * factory each test file declares) to enforce `permissions`.
 */
export function authed(
  permissions: readonly Permission[] = ALL_PERMISSIONS,
  { isSuperAdmin = false }: { isSuperAdmin?: boolean } = {}
) {
  const ctx = {
    status: 'active' as const,
    user: TEST_USER,
    admin: { id: TEST_USER.id, email: TEST_USER.email },
    supabase: {
      storage: { from: vi.fn() },
      auth: { updateUser: vi.fn() },
    },
    actor: {
      userId: TEST_USER.id,
      permissions: new Set<Permission>(permissions),
      isSuperAdmin,
    },
  };
  vi.mocked(requirePermission).mockImplementation(async (...perms) => {
    if (!perms.every((p) => ctx.actor.permissions.has(p))) {
      throw new Error('Forbidden');
    }
    return ctx as never;
  });
  vi.mocked(requireAnyPermission).mockImplementation(async (...perms) => {
    if (!perms.some((p) => ctx.actor.permissions.has(p))) {
      throw new Error('Forbidden');
    }
    return ctx as never;
  });
  if (vi.isMockFunction(requireActiveSession)) {
    vi.mocked(requireActiveSession).mockResolvedValue(ctx as never);
  }
  return ctx;
}

export function unauth() {
  const err = () => Promise.reject(new Error('Unauthorized'));
  vi.mocked(requirePermission).mockImplementation(err);
  vi.mocked(requireAnyPermission).mockImplementation(err);
  if (vi.isMockFunction(requireActiveSession)) {
    vi.mocked(requireActiveSession).mockImplementation(err);
  }
}
```

- [ ] **Step 6: Type-check**

Run: `yarn type-check`
Expected: PASS.

- [ ] **Step 7: Leave uncommitted.** Do not commit.

---

### Task 7: Move existing actions and the media API route onto permissions

**Files:**

- Modify: `src/actions/articles.ts`, `src/actions/block-translation.ts`, `src/actions/legacy-import.ts`, `src/actions/media.ts`, `src/actions/translations.ts`
- Modify: `src/lib/articles-repository.ts` (`getArticleSlugCategoryById` also returns `status`)
- Modify: `src/app/api/admin/media/route.ts`
- Modify tests: `src/actions/articles.test.ts`, `src/actions/block-translation.test.ts`, `src/actions/legacy-import.test.ts`, `src/actions/media.test.ts`, `src/actions/translations.test.ts`, `src/app/api/admin/media/route.test.ts`
- Delete: `src/lib/require-user.ts`, `src/test/require-user.ts`

**Interfaces:**

- Consumes: `requirePermission`, `requireAnyPermission` (Task 6); `authed`, `unauth` (Task 6 helper); `statusChangePermissions` (Task 3).
- Produces: `getArticleSlugCategoryById(id): Promise<{ slug: string; category: ContentCategory; status: ArticleStatus } | null>`.

Permission mapping (from the spec):

| Action(s)                                                                                                                                                                          | Call                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `getArticleByIdAction`                                                                                                                                                             | `requireAnyPermission('dashboard.view', 'articles.edit')`      |
| `listArticlesAdminAction`                                                                                                                                                          | `requirePermission('dashboard.view')`                          |
| `createArticleAction`, `updateArticleAction`                                                                                                                                       | `requirePermission('articles.edit')` + status transition check |
| `publishArticleAction`, `unpublishArticleAction`, `publishArticlesAction`, `unpublishArticlesAction`                                                                               | `requirePermission('articles.publish')`                        |
| `archiveArticleAction`, `archiveArticlesAction`, `restoreArticleAction`                                                                                                            | `requirePermission('articles.archive')`                        |
| `hardDeleteArticleAction`, `deleteArticlesAction`                                                                                                                                  | `requirePermission('articles.delete')`                         |
| `translateBlockEnAction`, `translateArticleMetaEnAction`, `translateArticleEnAction`                                                                                               | `requirePermission('articles.edit')`                           |
| `previewImportAction`, `checkImportSlugAction`, `commitImportAction`                                                                                                               | `requirePermission('import.run')`                              |
| `recordMediaAction`                                                                                                                                                                | `requirePermission('media.upload')`                            |
| `deleteMediaAction`                                                                                                                                                                | `requirePermission('media.delete')`                            |
| `listTranslationNamespaces`, `listTranslationRowsForNamespace`, `searchTranslationRows`, `saveTranslation`, `getTranslationHistory`, `translateKeyToEnglish`, `restoreTranslation` | `requirePermission('translations.edit')`                       |
| `deleteTranslationHistoryItem`                                                                                                                                                     | `requirePermission('translations.history.delete')`             |

- [ ] **Step 1: Switch every action test file to the new mock (tests fail first)**

In each of the five `src/actions/*.test.ts` files:

1. Replace `import { authedUser, unauth } from '@/test/require-user';` with `import { authed, unauth } from '@/test/authz';`
2. Replace the mock block
   ```ts
   vi.mock('@/lib/require-user', () => ({
     requireUser: vi.fn(),
   }));
   ```
   with
   ```ts
   vi.mock('@/lib/authz', () => ({
     requirePermission: vi.fn(),
     requireAnyPermission: vi.fn(),
     requireActiveSession: vi.fn(),
   }));
   ```
3. Replace every `authedUser()` call with `authed()`.

Mechanical helper (review the diff afterwards):

```bash
for f in src/actions/{articles,block-translation,legacy-import,media,translations}.test.ts; do
  perl -0pi -e "s#import \{ authedUser, unauth \} from '\@/test/require-user';#import { authed, unauth } from '\@/test/authz';#; s#vi\.mock\('\@/lib/require-user', \(\) => \(\{\n  requireUser: vi\.fn\(\),\n\}\)\);#vi.mock('\@/lib/authz', () => ({\n  requirePermission: vi.fn(),\n  requireAnyPermission: vi.fn(),\n  requireActiveSession: vi.fn(),\n}));#; s#\bauthedUser\(\)#authed()#g" "$f"
done
grep -n "require-user\|requireUser\|authedUser" src/actions/*.test.ts
```

The grep will still show `src/actions/articles.test.ts` lines using `requireUser` (the import on line ~55 and two `expect(requireUser)` assertions). Edit them:

- Replace `import { requireUser } from '@/lib/require-user';` with `import { requireAnyPermission, requirePermission } from '@/lib/authz';`
- In `getArticleByIdAction requires a user then loads the article`: replace `expect(requireUser).toHaveBeenCalled();` with
  ```ts
  expect(requireAnyPermission).toHaveBeenCalledWith(
    'dashboard.view',
    'articles.edit'
  );
  ```
- In `bulk publish calls the record helper when ids are present`: replace `expect(requireUser).toHaveBeenCalled();` with `expect(requirePermission).toHaveBeenCalledWith('articles.publish');`

- [ ] **Step 2: Add forbidden and status-transition tests to `src/actions/articles.test.ts`**

Append inside `describe('article actions', ...)`:

```ts
it('publish actions are Forbidden without articles.publish', async () => {
  authed(['dashboard.view', 'articles.edit']);
  await expect(publishArticleAction('id')).rejects.toThrow('Forbidden');
  await expect(publishArticlesAction(['a'])).rejects.toThrow('Forbidden');
  expect(articles.publishArticlesRecord).not.toHaveBeenCalled();
});

it('delete actions are Forbidden without articles.delete', async () => {
  authed(['dashboard.view', 'articles.archive']);
  await expect(deleteArticlesAction(['a'])).rejects.toThrow('Forbidden');
  await expect(
    hardDeleteArticleAction('id', 'slug', 'useful-info')
  ).rejects.toThrow('Forbidden');
});

it('createArticleAction with status published needs articles.publish', async () => {
  authed(['articles.edit']);
  await expect(
    createArticleAction(createPayload({ status: 'published' }))
  ).rejects.toThrow('Forbidden');
  expect(articles.createArticleRecord).not.toHaveBeenCalled();
});

it('createArticleAction as draft needs only articles.edit', async () => {
  authed(['articles.edit']);
  vi.mocked(articles.createArticleRecord).mockResolvedValue('new-id');
  const result = await createArticleAction(createPayload({ status: 'draft' }));
  expect(result).toMatchObject({ ok: true });
});

it('updateArticleAction changing draft -> published needs articles.publish', async () => {
  authed(['articles.edit']);
  vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
    slug: 'hello',
    category: 'useful-info',
    status: 'draft',
  });
  await expect(
    updateArticleAction('id', { status: 'published' })
  ).rejects.toThrow('Forbidden');
  expect(articles.updateArticleRecord).not.toHaveBeenCalled();
});

it('updateArticleAction keeping published status needs only articles.edit', async () => {
  authed(['articles.edit']);
  vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
    slug: 'hello',
    category: 'useful-info',
    status: 'published',
  });
  vi.mocked(articles.updateArticleRecord).mockResolvedValue(undefined as never);
  const result = await updateArticleAction('id', {
    status: 'published',
    title: 'Changed',
  });
  expect(result).toMatchObject({ ok: true });
});
```

Every existing `mockResolvedValue({ slug, category })` for `getArticleSlugCategoryById` in this file must gain `status: 'draft'` (type-check will flag them after Step 5). If `createPayload` from `src/test/fixtures/articles.ts` does not accept `status`, check its signature and pass the field the way other overrides are passed.

Append to `src/actions/media.test.ts`:

```ts
it('deleteMediaAction is Forbidden without media.delete', async () => {
  authed(['media.upload']);
  await expect(deleteMediaAction('m1')).rejects.toThrow('Forbidden');
  expect(mediaRepo.deleteMediaRecord).not.toHaveBeenCalled();
});
```

Append to `src/actions/legacy-import.test.ts` (inside its top-level `describe`):

```ts
it('import actions are Forbidden without import.run', async () => {
  authed(['articles.edit']);
  await expect(previewImportAction('https://example.com/a')).rejects.toThrow(
    'Forbidden'
  );
});
```

Append to `src/actions/block-translation.test.ts` (inside its top-level `describe`):

```ts
it('translation actions are Forbidden without articles.edit', async () => {
  authed(['dashboard.view']);
  await expect(
    translateArticleMetaEnAction({ title: 'タイトル' })
  ).rejects.toThrow('Forbidden');
});
```

Append to `src/actions/translations.test.ts` (inside its top-level `describe`; `deleteTranslationHistoryItem` catches errors and returns `{ ok: false }`):

```ts
it('deleteTranslationHistoryItem fails without translations.history.delete', async () => {
  authed(['translations.edit']);
  const res = await deleteTranslationHistoryItem({ historyId: 'h1' });
  expect(res.ok).toBe(false);
});
```

Add any missing imports (`previewImportAction`, `translateArticleMetaEnAction`, `deleteTranslationHistoryItem`) to those files' existing import lists from `./<action file>`.

- [ ] **Step 3: Run the action tests to verify they fail**

Run: `yarn vitest run --project unit src/actions`
Expected: FAIL — the actions still import `@/lib/require-user` (real module, so `requireUser` hits the unmocked Supabase client) and the new Forbidden cases don't throw.

- [ ] **Step 4: Return `status` from `getArticleSlugCategoryById`**

In `src/lib/articles-repository.ts` replace the function with:

```ts
export async function getArticleSlugCategoryById(id: string): Promise<{
  slug: string;
  category: ContentCategory;
  status: ArticleStatus;
} | null> {
  const row = await prisma.article.findUnique({
    where: { id },
    select: { slug: true, category: true, status: true },
  });
  if (!row) return null;
  return {
    slug: row.slug,
    category: row.category as ContentCategory,
    status: row.status as ArticleStatus,
  };
}
```

Add `ArticleStatus` to the file's existing `@/types` import if it isn't imported yet.

- [ ] **Step 5: Update `src/actions/articles.ts`**

1. Replace `import { requireUser } from '@/lib/require-user';` with:
   ```ts
   import { requireAnyPermission, requirePermission } from '@/lib/authz';
   import { statusChangePermissions } from '@/lib/article-status-permissions';
   ```
2. Replace each `await requireUser();` according to the mapping table above.
3. Replace `createArticleAction` and `updateArticleAction` with:

```ts
export async function createArticleAction(
  data: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>,
  options: CreateArticleOptions = {}
): Promise<ArticleMutationResult> {
  await requirePermission('articles.edit');
  const parsed = createArticleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Invalid article data: ${zodErrorDetails(parsed.error).join('; ')}`,
    };
  }
  // A new article counts as coming from draft (publishing needs articles.publish).
  const extra = statusChangePermissions('draft', parsed.data.status);
  if (extra.length > 0) await requirePermission(...extra);
  // Persist the validated + normalized payload (unknown keys stripped, fields
  // trimmed) rather than the raw client object — defense in depth.
  const payload = toCreateArticlePayload(parsed.data);
  try {
    const slug = options.autoSuffixSlug
      ? await allocateUniqueSlug(payload.slug)
      : payload.slug;
    const id = await createArticleRecord({ ...payload, slug });
    revalidateArticlePaths(slug, payload.category);
    return { ok: true, id, slug };
  } catch (error) {
    if (isSlugUniqueConflict(error)) {
      return { ok: false, error: SLUG_CONFLICT_ERROR };
    }
    console.error('[createArticleAction]', error);
    return { ok: false, error: SAVE_FAILED_ERROR };
  }
}

export async function updateArticleAction(
  id: string,
  data: Partial<Omit<Article, 'id' | 'createdAt'>>
): Promise<ArticleMutationResult> {
  await requirePermission('articles.edit');
  const parsed = updateArticleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Invalid article data: ${zodErrorDetails(parsed.error).join('; ')}`,
    };
  }
  let previous: Awaited<ReturnType<typeof getArticleSlugCategoryById>>;
  try {
    previous = await getArticleSlugCategoryById(id);
  } catch (error) {
    console.error('[updateArticleAction]', error);
    return { ok: false, error: SAVE_FAILED_ERROR };
  }
  if (!previous) {
    return { ok: false, error: SAVE_FAILED_ERROR };
  }
  // Status transitions need their own permissions on top of articles.edit.
  const extra = statusChangePermissions(
    previous.status,
    parsed.data.status ?? previous.status
  );
  if (extra.length > 0) await requirePermission(...extra);
  try {
    await updateArticleRecord(id, toUpdateArticlePayload(parsed.data));
    const nextSlug = parsed.data.slug ?? previous.slug;
    const nextCategory = parsed.data.category ?? previous.category;
    if (parsed.data.category && parsed.data.category !== previous.category) {
      revalidateArticlePaths(previous.slug, previous.category);
      revalidateArticlePaths(nextSlug, nextCategory);
    } else {
      revalidateArticlePaths(
        [...new Set([nextSlug, previous.slug])],
        nextCategory
      );
    }
    return { ok: true, id, slug: nextSlug };
  } catch (error) {
    if (isSlugUniqueConflict(error)) {
      return { ok: false, error: SLUG_CONFLICT_ERROR };
    }
    console.error('[updateArticleAction]', error);
    return { ok: false, error: SAVE_FAILED_ERROR };
  }
}
```

If an existing test expected `SAVE_FAILED` when `getArticleSlugCategoryById` rejects, it still passes (the catch is preserved).

- [ ] **Step 6: Update the other action files**

- `src/actions/block-translation.ts`: import `{ requirePermission } from '@/lib/authz'`; each `await requireUser();` → `await requirePermission('articles.edit');`
- `src/actions/legacy-import.ts`: import `{ requirePermission } from '@/lib/authz'`; `await requireUser();` → `await requirePermission('import.run');`; `const { supabase } = await requireUser();` → `const { supabase } = await requirePermission('import.run');`
- `src/actions/media.ts`: import `{ requirePermission } from '@/lib/authz'`; `recordMediaAction` → `await requirePermission('media.upload');`; `deleteMediaAction` → `const { supabase } = await requirePermission('media.delete');`
- `src/actions/translations.ts`: import `{ requirePermission } from '@/lib/authz'`; `deleteTranslationHistoryItem` → `await requirePermission('translations.history.delete');`; every other `await requireUser();` → `await requirePermission('translations.edit');`; `const { user } = await requireUser();` in `saveTranslation` → `const { user } = await requirePermission('translations.edit');`

Then delete the old helper files:

```bash
rm src/lib/require-user.ts src/test/require-user.ts
grep -rn "require-user\|requireUser" src && echo "LEFTOVER REFERENCES" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 7: Update the media API route and its test**

Replace the auth block at the top of `GET` in `src/app/api/admin/media/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { countMedia, listMedia } from '@/lib/media-repository';
import { requireAnyPermission, UNAUTHORIZED_ERROR } from '@/lib/authz';

export async function GET(request: Request) {
  try {
    // Media page (media.upload) and the editor's gallery picker (articles.edit).
    await requireAnyPermission('media.upload', 'articles.edit');
  } catch (error) {
    const unauthorized =
      error instanceof Error && error.message === UNAUTHORIZED_ERROR;
    return NextResponse.json(
      { error: unauthorized ? 'Unauthorized' : 'Forbidden' },
      { status: unauthorized ? 401 : 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  // ...rest of the existing function body unchanged
```

Replace the top of `src/app/api/admin/media/route.test.ts` (mocks and the two auth-dependent tests):

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listMedia, countMedia } from '@/lib/media-repository';
import { authed, unauth } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
  UNAUTHORIZED_ERROR: 'Unauthorized',
}));

vi.mock('@/lib/media-repository', () => ({
  listMedia: vi.fn(),
  countMedia: vi.fn(),
}));

import { GET } from './route';

describe('GET /api/admin/media', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  it('returns 401 when logged out', async () => {
    unauth();
    const res = await GET(new Request('http://localhost/api/admin/media'));
    expect(res.status).toBe(401);
  });

  it('returns 403 without media.upload or articles.edit', async () => {
    authed(['dashboard.view']);
    const res = await GET(new Request('http://localhost/api/admin/media'));
    expect(res.status).toBe(403);
  });

  it('clamps pageSize and page', async () => {
    vi.mocked(listMedia).mockResolvedValue([]);
    vi.mocked(countMedia).mockResolvedValue(0);
    await GET(
      new Request('http://localhost/api/admin/media?page=0&pageSize=999')
    );
    expect(listMedia).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 100 })
    );
```

Remove any remaining `createServerSupabaseClient` mocking from the rest of that test file (later tests rely on `authed()` from `beforeEach`).

- [ ] **Step 8: Verify**

Run: `yarn vitest run --project unit src/actions src/app/api && yarn type-check`
Expected: PASS. Fix any `getArticleSlugCategoryById` mock missing `status`.

- [ ] **Step 9: Leave uncommitted.** Do not commit.

---

### Task 8: Shared access types, admin copy, permissions context, "Permission needed" screen

**Files:**

- Create: `src/lib/access-types.ts`
- Modify: `messages/admin-en.json`, `messages/admin-ja.json`
- Create: `src/components/admin/PermissionsContext.tsx`
- Create: `src/components/admin/PermissionNeeded.tsx`
- Modify: `src/test/render-admin.tsx`
- Test: `src/lib/access-messages.test.ts`, `src/components/admin/PermissionNeeded.test.tsx`

**Interfaces:**

- Consumes: `Permission`, `ALL_PERMISSIONS`, `PERMISSION_GROUPS`, `permissionMessageKey` (Task 1); `Actor` (Task 2).
- Produces (`src/lib/access-types.ts`, importable from client and server):
  - `ACCESS_ERROR_CODES = ['FORBIDDEN', 'INVALID_INPUT', 'EMAIL_EXISTS', 'WEAK_PASSWORD', 'SAME_PASSWORD', 'NOT_FOUND', 'MUST_DISABLE_FIRST', 'KEY_EXISTS', 'BAN_FAILED', 'FAILED'] as const`; `type AccessErrorCode`
  - `type AccessResult<T = undefined> = { ok: true; data: T } | { ok: false; error: AccessErrorCode }`
  - `type ActorDTO = { userId: string; permissions: Permission[]; isSuperAdmin: boolean }`
  - `actorToDTO(actor: Actor): ActorDTO`, `actorFromDTO(dto: ActorDTO): Actor`
  - `type AdminUserRow = { id: string; email: string; displayName: string | null; disabled: boolean; mustChangePassword: boolean; isSuperAdmin: boolean; roleIds: string[]; createdAt: string; lastSignInAt: string | null }`
  - `type RoleRow = { id: string; key: string; name: string; description: string | null; isSystem: boolean; permissions: string[]; userCount: number }`
- Produces (components):
  - `PermissionsProvider({ permissions: readonly Permission[]; children })`, `usePermissions(): { can(p: Permission): boolean }` — default context is an empty set.
  - `PermissionNeeded({ permission: Permission })` — client component.
  - `renderAdmin(ui, { locale?, permissions? })` — `permissions` defaults to `ALL_PERMISSIONS`.
- Message namespaces added (under `admin.`): `sidebar.accessSection|users|roles`, `login.disabled`, `access.*`, `users.*`, `roles.*`, `changePassword.*` — exact keys below; later tasks use them.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/access-messages.test.ts
import { describe, expect, it } from 'vitest';
import adminEn from '../../messages/admin-en.json';
import adminJa from '../../messages/admin-ja.json';
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  permissionMessageKey,
} from './permissions';
import { ACCESS_ERROR_CODES } from './access-types';

type Tree = Record<string, unknown>;

function at(tree: Tree, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((node, key) => (node as Tree | undefined)?.[key], tree);
}

describe.each([
  ['en', adminEn],
  ['ja', adminJa],
])('admin-%s access copy', (_locale, messages) => {
  it.each(ALL_PERMISSIONS)('has label and description for %s', (p) => {
    const key = permissionMessageKey(p);
    expect(typeof at(messages, `access.permissions.${key}.label`)).toBe(
      'string'
    );
    expect(typeof at(messages, `access.permissions.${key}.description`)).toBe(
      'string'
    );
  });

  it('has every group and error code', () => {
    for (const g of PERMISSION_GROUPS) {
      expect(typeof at(messages, `access.groups.${g}`)).toBe('string');
    }
    for (const code of ACCESS_ERROR_CODES) {
      expect(typeof at(messages, `access.errors.${code}`)).toBe('string');
    }
  });
});
```

```tsx
// src/components/admin/PermissionNeeded.test.tsx
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAdmin } from '@/test/render-admin';
import PermissionNeeded from './PermissionNeeded';
import { usePermissions } from './PermissionsContext';

function Probe() {
  const { can } = usePermissions();
  return <span>{can('users.delete') ? 'yes' : 'no'}</span>;
}

describe('PermissionNeeded', () => {
  it('names the missing permission', () => {
    renderAdmin(<PermissionNeeded permission="media.upload" />);
    expect(
      screen.getByRole('heading', { name: 'Permission needed' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Upload media/)).toBeInTheDocument();
  });

  it('renders Japanese copy', () => {
    renderAdmin(<PermissionNeeded permission="media.upload" />, {
      locale: 'ja',
    });
    expect(
      screen.getByRole('heading', { name: '権限が必要です' })
    ).toBeInTheDocument();
  });
});

describe('usePermissions', () => {
  it('reflects the provided permissions', () => {
    renderAdmin(<Probe />, { permissions: ['users.view'] });
    expect(screen.getByText('no')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `yarn vitest run --project unit src/lib/access-messages.test.ts; yarn vitest run --project component src/components/admin/PermissionNeeded.test.tsx`
Expected: FAIL — modules/keys missing.

- [ ] **Step 3: Implement `src/lib/access-types.ts`**

```ts
import type { Actor } from '@/lib/authz-rules';
import type { Permission } from '@/lib/permissions';

/** Error codes returned by user/role/account actions; translated via admin.access.errors. */
export const ACCESS_ERROR_CODES = [
  'FORBIDDEN',
  'INVALID_INPUT',
  'EMAIL_EXISTS',
  'WEAK_PASSWORD',
  'SAME_PASSWORD',
  'NOT_FOUND',
  'MUST_DISABLE_FIRST',
  'KEY_EXISTS',
  'BAN_FAILED',
  'FAILED',
] as const;

export type AccessErrorCode = (typeof ACCESS_ERROR_CODES)[number];

export type AccessResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: AccessErrorCode };

/** Serializable actor for client components (Sets don't cross the RSC boundary). */
export type ActorDTO = {
  userId: string;
  permissions: Permission[];
  isSuperAdmin: boolean;
};

export function actorToDTO(actor: Actor): ActorDTO {
  return {
    userId: actor.userId,
    permissions: [...actor.permissions],
    isSuperAdmin: actor.isSuperAdmin,
  };
}

export function actorFromDTO(dto: ActorDTO): Actor {
  return {
    userId: dto.userId,
    permissions: new Set(dto.permissions),
    isSuperAdmin: dto.isSuperAdmin,
  };
}

export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string | null;
  disabled: boolean;
  mustChangePassword: boolean;
  isSuperAdmin: boolean;
  roleIds: string[];
  createdAt: string;
  lastSignInAt: string | null;
};

export type RoleRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
};
```

- [ ] **Step 4: Add the admin copy**

Save this as `$TMPDIR/admin-access-messages.mjs` and run `node "$TMPDIR/admin-access-messages.mjs"`. It deep-merges new keys into both files without touching existing ones, then run `yarn prettier --write messages/admin-en.json messages/admin-ja.json`.

```js
import { readFileSync, writeFileSync } from 'node:fs';

const permissions = {
  dashboard_view: [
    ['View dashboard', 'See the article list and view counts.'],
    ['ダッシュボードの閲覧', '記事一覧と閲覧数を表示します。'],
  ],
  articles_edit: [
    ['Edit articles', 'Create and edit drafts, including AI translation.'],
    ['記事の編集', '下書きの作成・編集（AI翻訳を含む）。'],
  ],
  articles_publish: [
    ['Publish articles', 'Publish and unpublish articles.'],
    ['記事の公開', '記事の公開・非公開を切り替えます。'],
  ],
  articles_archive: [
    ['Archive articles', 'Archive and restore articles.'],
    ['記事のアーカイブ', '記事のアーカイブと復元。'],
  ],
  articles_delete: [
    ['Delete articles', 'Permanently delete articles.'],
    ['記事の削除', '記事を完全に削除します。'],
  ],
  import_run: [
    ['Import articles', 'Preview and import legacy articles.'],
    ['記事のインポート', '旧サイトの記事をプレビュー・インポートします。'],
  ],
  media_upload: [
    ['Upload media', 'View the media library and upload images.'],
    [
      'メディアのアップロード',
      'メディアライブラリの閲覧と画像のアップロード。',
    ],
  ],
  media_delete: [
    ['Delete media', 'Delete images from the media library.'],
    ['メディアの削除', 'メディアライブラリから画像を削除します。'],
  ],
  translations_edit: [
    ['Edit translations', 'Edit, restore and AI-translate UI strings.'],
    ['翻訳の編集', 'UI文言の編集・復元・AI翻訳。'],
  ],
  translations_history_delete: [
    ['Delete translation history', 'Remove entries from translation history.'],
    ['翻訳履歴の削除', '翻訳履歴のエントリを削除します。'],
  ],
  users_view: [
    ['View users', 'See the list of admin users.'],
    ['ユーザーの閲覧', '管理ユーザーの一覧を表示します。'],
  ],
  users_create: [
    ['Create users', 'Create users and set temporary passwords.'],
    ['ユーザーの作成', 'ユーザーを作成し、仮パスワードを設定します。'],
  ],
  'users_assign-roles': [
    [
      'Assign roles',
      "Change a user's roles (only roles within your own permissions).",
    ],
    [
      'ロールの割り当て',
      'ユーザーのロールを変更します（自分の権限の範囲内のみ）。',
    ],
  ],
  users_disable: [
    ['Disable users', 'Disable and re-enable user access.'],
    ['ユーザーの無効化', 'ユーザーのアクセスを無効化・再有効化します。'],
  ],
  users_delete: [
    ['Delete users', 'Permanently delete disabled users.'],
    ['ユーザーの削除', '無効化されたユーザーを完全に削除します。'],
  ],
  roles_manage: [
    ['Manage roles', 'Create, edit and delete roles.'],
    ['ロールの管理', 'ロールの作成・編集・削除。'],
  ],
};

function perms(i) {
  return Object.fromEntries(
    Object.entries(permissions).map(([k, v]) => [
      k,
      { label: v[i][0], description: v[i][1] },
    ])
  );
}

const en = {
  sidebar: { accessSection: 'Access', users: 'Users', roles: 'Roles' },
  login: {
    disabled: 'Your access has been disabled. Contact an administrator.',
  },
  access: {
    permissionNeeded: {
      title: 'Permission needed',
      body: 'You don’t have access to this page. Ask a super-admin or admin to grant you “{permission}”.',
    },
    groups: {
      content: 'Content',
      media: 'Media',
      translations: 'Translations',
      access: 'Users & roles',
    },
    permissions: perms(0),
    errors: {
      FORBIDDEN: 'You don’t have permission to do that.',
      INVALID_INPUT: 'Some fields are invalid. Check the form and try again.',
      EMAIL_EXISTS: 'A user with this email already exists.',
      WEAK_PASSWORD: 'The password is too weak. Use at least 12 characters.',
      SAME_PASSWORD: 'Choose a password different from your current one.',
      NOT_FOUND: 'This item no longer exists. Refresh the page.',
      MUST_DISABLE_FIRST: 'Disable the user before deleting them.',
      KEY_EXISTS: 'A role with this key already exists.',
      BAN_FAILED:
        'Access was disabled here, but blocking sign-in in Supabase failed. Try again.',
      FAILED: 'Something went wrong. Try again.',
    },
  },
  users: {
    pageTitle: 'Users',
    pageSubtitle:
      'Manage who can sign in to the admin portal and what they can do.',
    addUser: 'Add user',
    you: 'You',
    never: 'Never',
    noRoles: 'No roles',
    columns: {
      user: 'User',
      roles: 'Roles',
      status: 'Status',
      lastSignIn: 'Last sign-in',
      created: 'Created',
      actions: 'Actions',
    },
    status: {
      active: 'Active',
      disabled: 'Disabled',
      mustChangePassword: 'Must change password',
    },
    actions: {
      editRoles: 'Edit roles',
      resetPassword: 'Reset password',
      disable: 'Disable',
      enable: 'Enable',
      delete: 'Delete',
    },
    dialog: {
      addTitle: 'Add user',
      email: 'Email',
      displayName: 'Display name (optional)',
      tempPassword: 'Temporary password',
      generate: 'Generate',
      copy: 'Copy',
      copied: 'Copied',
      roles: 'Roles',
      roleNotAssignable:
        'You can only assign roles within your own permissions.',
      cancel: 'Cancel',
      create: 'Create user',
      save: 'Save',
      saving: 'Saving…',
      credentialsTitle: 'Share these credentials',
      credentialsHint:
        'This password is shown only once. The user must change it when they first sign in.',
      done: 'Done',
      editRolesTitle: 'Edit roles for {email}',
      resetTitle: 'Reset password for {email}',
      reset: 'Set temporary password',
      disableConfirm: 'Disable {email}? They lose access immediately.',
      deleteTitle: 'Permanently delete {email}',
      deleteHint:
        'This deletes the account and cannot be undone. Type the email to confirm.',
      deleteCta: 'Delete permanently',
    },
  },
  roles: {
    pageTitle: 'Roles',
    pageSubtitle:
      'Roles are bundles of permissions. Users get every permission from all of their roles.',
    newRole: 'New role',
    allPermissions: 'All permissions',
    locked: 'Locked',
    usersCount: '{count, plural, one {# user} other {# users}}',
    permissionsCount:
      '{count, plural, one {# permission} other {# permissions}}',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirm:
      'Delete the role “{name}”? It will be removed from {count, plural, one {# user} other {# users}}.',
    editor: {
      createTitle: 'New role',
      editTitle: 'Edit role',
      name: 'Name',
      key: 'Key',
      keyHint:
        'Lowercase letters, numbers and hyphens. Cannot be changed later.',
      description: 'Description (optional)',
      permissions: 'Permissions',
      notHeld: 'You can only grant permissions you have.',
      cancel: 'Cancel',
      save: 'Save role',
      saving: 'Saving…',
    },
  },
  changePassword: {
    title: 'Set a new password',
    subtitle:
      'You signed in with a temporary password. Choose your own to continue.',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    mismatch: 'Passwords don’t match.',
    tooShort: 'Use at least 12 characters.',
    submit: 'Save password',
    submitting: 'Saving…',
  },
};

const ja = {
  sidebar: {
    accessSection: 'アクセス管理',
    users: 'ユーザー',
    roles: 'ロール',
  },
  login: {
    disabled: 'アクセスが無効化されています。管理者にお問い合わせください。',
  },
  access: {
    permissionNeeded: {
      title: '権限が必要です',
      body: 'このページにアクセスする権限がありません。スーパー管理者または管理者に「{permission}」の付与を依頼してください。',
    },
    groups: {
      content: 'コンテンツ',
      media: 'メディア',
      translations: '翻訳',
      access: 'ユーザーとロール',
    },
    permissions: perms(1),
    errors: {
      FORBIDDEN: 'この操作を行う権限がありません。',
      INVALID_INPUT:
        '入力内容に誤りがあります。確認してもう一度お試しください。',
      EMAIL_EXISTS: 'このメールアドレスのユーザーは既に存在します。',
      WEAK_PASSWORD: 'パスワードが弱すぎます。12文字以上にしてください。',
      SAME_PASSWORD: '現在のパスワードとは別のパスワードを設定してください。',
      NOT_FOUND: '対象が見つかりません。ページを再読み込みしてください。',
      MUST_DISABLE_FIRST: '削除する前にユーザーを無効化してください。',
      KEY_EXISTS: 'このキーのロールは既に存在します。',
      BAN_FAILED:
        'アクセスは無効化されましたが、Supabaseでのサインイン停止に失敗しました。もう一度お試しください。',
      FAILED: '問題が発生しました。もう一度お試しください。',
    },
  },
  users: {
    pageTitle: 'ユーザー',
    pageSubtitle:
      '管理画面にサインインできるユーザーと、その権限を管理します。',
    addUser: 'ユーザーを追加',
    you: 'あなた',
    never: 'なし',
    noRoles: 'ロールなし',
    columns: {
      user: 'ユーザー',
      roles: 'ロール',
      status: 'ステータス',
      lastSignIn: '最終サインイン',
      created: '作成日',
      actions: '操作',
    },
    status: {
      active: '有効',
      disabled: '無効',
      mustChangePassword: 'パスワード変更待ち',
    },
    actions: {
      editRoles: 'ロールを編集',
      resetPassword: 'パスワードをリセット',
      disable: '無効化',
      enable: '有効化',
      delete: '削除',
    },
    dialog: {
      addTitle: 'ユーザーを追加',
      email: 'メールアドレス',
      displayName: '表示名（任意）',
      tempPassword: '仮パスワード',
      generate: '生成',
      copy: 'コピー',
      copied: 'コピーしました',
      roles: 'ロール',
      roleNotAssignable: '自分の権限の範囲内のロールのみ割り当てられます。',
      cancel: 'キャンセル',
      create: 'ユーザーを作成',
      save: '保存',
      saving: '保存中…',
      credentialsTitle: 'このログイン情報を共有してください',
      credentialsHint:
        'このパスワードは一度だけ表示されます。ユーザーは初回サインイン時に変更が必要です。',
      done: '完了',
      editRolesTitle: '{email} のロールを編集',
      resetTitle: '{email} のパスワードをリセット',
      reset: '仮パスワードを設定',
      disableConfirm:
        '{email} を無効化しますか？すぐにアクセスできなくなります。',
      deleteTitle: '{email} を完全に削除',
      deleteHint:
        'アカウントを削除します。元に戻せません。確認のためメールアドレスを入力してください。',
      deleteCta: '完全に削除',
    },
  },
  roles: {
    pageTitle: 'ロール',
    pageSubtitle:
      'ロールは権限のまとまりです。ユーザーはすべてのロールの権限を合わせて持ちます。',
    newRole: '新しいロール',
    allPermissions: 'すべての権限',
    locked: 'ロック中',
    usersCount: '{count}人',
    permissionsCount: '{count}件の権限',
    edit: '編集',
    delete: '削除',
    deleteConfirm:
      'ロール「{name}」を削除しますか？{count}人のユーザーから外されます。',
    editor: {
      createTitle: '新しいロール',
      editTitle: 'ロールを編集',
      name: '名前',
      key: 'キー',
      keyHint: '英小文字・数字・ハイフンのみ。後から変更できません。',
      description: '説明（任意）',
      permissions: '権限',
      notHeld: '自分が持っている権限のみ付与できます。',
      cancel: 'キャンセル',
      save: 'ロールを保存',
      saving: '保存中…',
    },
  },
  changePassword: {
    title: '新しいパスワードを設定',
    subtitle:
      '仮パスワードでサインインしました。続行するには自分のパスワードを設定してください。',
    newPassword: '新しいパスワード',
    confirmPassword: '新しいパスワード（確認）',
    mismatch: 'パスワードが一致しません。',
    tooShort: '12文字以上にしてください。',
    submit: 'パスワードを保存',
    submitting: '保存中…',
  },
};

function merge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] ??= {};
      merge(target[k], v);
    } else if (target[k] === undefined) {
      target[k] = v;
    }
  }
  return target;
}

for (const [file, add] of [
  ['messages/admin-en.json', en],
  ['messages/admin-ja.json', ja],
]) {
  const json = JSON.parse(readFileSync(file, 'utf8'));
  writeFileSync(file, JSON.stringify(merge(json, add), null, 2) + '\n');
}
console.log('merged');
```

Expected output: `merged`. Check `git diff --stat messages/` shows only additions.

- [ ] **Step 5: Implement `src/components/admin/PermissionsContext.tsx`**

```tsx
'use client';

import { createContext, useContext, useMemo } from 'react';
import type { Permission } from '@/lib/permissions';

const PermissionsContext = createContext<ReadonlySet<Permission>>(new Set());

/**
 * Lets admin client components hide controls the user can't use. UX only:
 * server actions re-check every permission.
 */
export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: readonly Permission[];
  children: React.ReactNode;
}) {
  const value = useMemo(() => new Set(permissions), [permissions]);
  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const permissions = useContext(PermissionsContext);
  return { can: (p: Permission) => permissions.has(p) };
}
```

- [ ] **Step 6: Implement `src/components/admin/PermissionNeeded.tsx`**

```tsx
'use client';

import { ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { permissionMessageKey, type Permission } from '@/lib/permissions';

export default function PermissionNeeded({
  permission,
}: {
  permission: Permission;
}) {
  const t = useTranslations('admin.access');
  const label = t(`permissions.${permissionMessageKey(permission)}.label`);
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {t('permissionNeeded.title')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {t('permissionNeeded.body', { permission: label })}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Extend `src/test/render-admin.tsx`**

```tsx
import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import adminEn from '../../messages/admin-en.json';
import adminJa from '../../messages/admin-ja.json';
import type { ReactElement } from 'react';
import { PermissionsProvider } from '@/components/admin/PermissionsContext';
import { ALL_PERMISSIONS, type Permission } from '@/lib/permissions';

type RenderAdminOptions = RenderOptions & {
  locale?: 'en' | 'ja';
  /** Defaults to every permission so existing component tests see all controls. */
  permissions?: readonly Permission[];
};

/** Matches `src/app/admin/layout.tsx`: messages.admin = admin-{locale}.json. */
export function renderAdmin(
  ui: ReactElement,
  {
    locale = 'en',
    permissions = ALL_PERMISSIONS,
    ...options
  }: RenderAdminOptions = {}
) {
  const admin = locale === 'ja' ? adminJa : adminEn;
  return render(
    <NextIntlClientProvider locale={locale} messages={{ admin }}>
      <PermissionsProvider permissions={permissions}>{ui}</PermissionsProvider>
    </NextIntlClientProvider>,
    options
  );
}
```

- [ ] **Step 8: Verify**

Run: `yarn test && yarn type-check`
Expected: PASS (all existing tests still pass; new tests pass).

- [ ] **Step 9: Leave uncommitted.** Do not commit.

---

### Task 9: Protected layout, permission-aware sidebar, login "disabled" message

**Files:**

- Modify: `src/app/admin/(protected)/layout.tsx`
- Modify: `src/app/admin/(protected)/AdminProtectedShell.tsx`
- Modify: `src/lib/auth.ts` (`signIn` also returns the Supabase error code)
- Modify: `src/app/admin/page.tsx`
- Test: `src/app/admin/(protected)/layout.test.ts` (rewrite), `src/app/admin/(protected)/AdminProtectedShell.test.tsx` (extend), `src/app/admin/page.test.tsx` (new)

**Interfaces:**

- Consumes: `getCurrentAdmin` (Task 6); `PermissionsProvider`, `usePermissions` (Task 8); `Permission`, `ALL_PERMISSIONS` (Task 1).
- Produces:
  - `AdminProtectedShell({ children, userEmail, permissions: Permission[] })`
  - `signIn(supabase, email, password): Promise<{ error: Error | null; code: string | null }>`

- [ ] **Step 1: Rewrite the layout test**

```ts
// src/app/admin/(protected)/layout.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/authz', () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('./AdminProtectedShell', () => ({
  default: (props: { children: unknown; permissions: string[] }) => props,
}));

import AdminProtectedLayout from './layout';
import { getCurrentAdmin } from '@/lib/authz';
import { redirect } from 'next/navigation';

const user = { id: 'u', email: 'u@test.local' };

describe('AdminProtectedLayout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to /admin when unauthenticated', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({
      status: 'unauthenticated',
    });
    await expect(AdminProtectedLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(redirect).toHaveBeenCalledWith('/admin');
  });

  it('redirects disabled users to the login page with an error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({
      status: 'disabled',
      user,
    } as never);
    await expect(AdminProtectedLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(redirect).toHaveBeenCalledWith('/admin?error=disabled');
  });

  it('redirects to change-password when required', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({
      status: 'must-change-password',
      user,
    } as never);
    await expect(AdminProtectedLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(redirect).toHaveBeenCalledWith('/admin/change-password');
  });

  it('renders the shell with the permission list when active', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({
      status: 'active',
      user,
      actor: {
        userId: 'u',
        permissions: new Set(['dashboard.view']),
        isSuperAdmin: false,
      },
    } as never);
    const el = (await AdminProtectedLayout({ children: 'ok' })) as {
      props: { permissions: string[]; userEmail: string };
    };
    expect(redirect).not.toHaveBeenCalled();
    expect(el.props.permissions).toEqual(['dashboard.view']);
    expect(el.props.userEmail).toBe('u@test.local');
  });
});
```

- [ ] **Step 2: Extend the shell test**

In `src/app/admin/(protected)/AdminProtectedShell.test.tsx`:

1. Add `import { ALL_PERMISSIONS } from '@/lib/permissions';`
2. Add `permissions={ALL_PERMISSIONS}` to every existing `<AdminProtectedShell userEmail="a@b.c">` render.
3. In `renders sidebar links`, also assert the new links:
   ```ts
   expect(
     screen.getAllByRole('link', { name: 'Users' }).length
   ).toBeGreaterThan(0);
   expect(
     screen.getAllByRole('link', { name: 'Roles' }).length
   ).toBeGreaterThan(0);
   ```
4. Add:
   ```ts
   it('hides nav items the user has no permission for', () => {
     renderAdmin(
       <AdminProtectedShell userEmail="a@b.c" permissions={['media.upload']}>
         child
       </AdminProtectedShell>
     );
     expect(
       screen.getAllByRole('link', { name: 'Media' }).length
     ).toBeGreaterThan(0);
     expect(screen.queryByRole('link', { name: 'All Posts' })).toBeNull();
     expect(screen.queryByRole('link', { name: 'Users' })).toBeNull();
     expect(screen.queryByText('Access')).toBeNull();
     // View Site and Sign Out are always available
     expect(
       screen.getAllByRole('button', { name: 'Sign Out' }).length
     ).toBeGreaterThan(0);
   });
   ```

- [ ] **Step 3: Write the login page test**

```tsx
// src/app/admin/page.test.tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
}));

const signIn = vi.fn();
const signOut = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/auth', () => ({
  signIn: (...a: unknown[]) => signIn(...a),
  signOut: (...a: unknown[]) => signOut(...a),
}));

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({}),
}));

import AdminLoginPage from './page';

describe('AdminLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/admin');
  });

  it('shows the disabled message and signs out for ?error=disabled', async () => {
    window.history.replaceState(null, '', '/admin?error=disabled');
    renderAdmin(<AdminLoginPage />);
    expect(
      await screen.findByText(
        'Your access has been disabled. Contact an administrator.'
      )
    ).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
  });

  it('maps the banned sign-in error to the disabled message', async () => {
    signIn.mockResolvedValue({
      error: new Error('User is banned'),
      code: 'user_banned',
    });
    const user = userEvent.setup();
    renderAdmin(<AdminLoginPage />);
    await user.type(screen.getByLabelText('Email'), 'a@b.c');
    await user.type(screen.getByLabelText('Password'), 'secret-password');
    await user.click(screen.getByRole('button', { name: 'Sign in →' }));
    await waitFor(() =>
      expect(
        screen.getByText(
          'Your access has been disabled. Contact an administrator.'
        )
      ).toBeInTheDocument()
    );
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run to verify they fail**

Run: `yarn vitest run --project unit "src/app/admin/(protected)/layout.test.ts"; yarn vitest run --project component src/app/admin`
Expected: FAIL.

- [ ] **Step 5: Implement the layout**

```tsx
// src/app/admin/(protected)/layout.tsx
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/authz';
import AdminProtectedShell from './AdminProtectedShell';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentAdmin();
  if (current.status === 'unauthenticated') {
    redirect('/admin');
  }
  if (current.status === 'disabled') {
    // Server components can't clear auth cookies; the login page signs out.
    redirect('/admin?error=disabled');
  }
  if (current.status === 'must-change-password') {
    redirect('/admin/change-password');
  }

  return (
    <AdminProtectedShell
      userEmail={current.user.email ?? null}
      permissions={[...current.actor.permissions]}
    >
      {children}
    </AdminProtectedShell>
  );
}
```

- [ ] **Step 6: Implement the shell changes**

In `src/app/admin/(protected)/AdminProtectedShell.tsx`:

1. Imports: change `import { Languages } from 'lucide-react';` to `import { Languages, ShieldCheck, Users } from 'lucide-react';` and add:
   ```ts
   import {
     PermissionsProvider,
     usePermissions,
   } from '@/components/admin/PermissionsContext';
   import type { Permission } from '@/lib/permissions';
   ```
2. In `Sidebar`, after `const t = useTranslations('admin.sidebar');` add `const { can } = usePermissions();`
3. Wrap each existing content `NavItem` in a permission check:
   - All Posts (`/admin/dashboard`): `{can('dashboard.view') && ( <NavItem .../> )}`
   - New Post (`/admin/posts/new`): `can('articles.edit')`
   - Import: `can('import.run')`
   - Media: `can('media.upload')`
   - Translations: `can('translations.edit')`
4. Hide the "Content" section label when none of those five are allowed. Replace the `<div className="px-3 mb-1">…contentSection…</div>` block with:
   ```tsx
   {
     (
       [
         'dashboard.view',
         'articles.edit',
         'import.run',
         'media.upload',
         'translations.edit',
       ] as const
     ).some(can) && (
       <div className="px-3 mb-1">
         <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">
           {t('contentSection')}
         </p>
       </div>
     );
   }
   ```
5. Inside `<div className="flex-1 px-3 space-y-0.5">`, after the Translations item, append the Access section:
   ```tsx
   {
     (can('users.view') || can('roles.manage')) && (
       <>
         <p className="px-2 pt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">
           {t('accessSection')}
         </p>
         {can('users.view') && (
           <NavItem
             href="/admin/users"
             active={pathname === '/admin/users'}
             label={t('users')}
             icon={
               <Users className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
             }
           />
         )}
         {can('roles.manage') && (
           <NavItem
             href="/admin/roles"
             active={pathname === '/admin/roles'}
             label={t('roles')}
             icon={
               <ShieldCheck
                 className="w-4 h-4 flex-shrink-0"
                 strokeWidth={1.75}
               />
             }
           />
         )}
       </>
     );
   }
   ```
6. `AdminProtectedShell` props: add `permissions: Permission[]` to the props type and destructuring, and wrap the returned tree:
   ```tsx
   return (
     <PermissionsProvider permissions={permissions}>
       <AdminViewArticleProvider>
         {/* ...existing markup unchanged... */}
       </AdminViewArticleProvider>
     </PermissionsProvider>
   );
   ```

- [ ] **Step 7: Return the error code from `signIn`**

In `src/lib/auth.ts` replace `signIn` with:

```ts
export async function signIn(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ error: Error | null; code: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return {
    error: error ? new Error(error.message) : null,
    code: error?.code ?? null,
  };
}
```

- [ ] **Step 8: Update the login page**

In `src/app/admin/page.tsx`:

1. Change `import { useMemo, useState } from 'react';` to `import { useEffect, useMemo, useState } from 'react';` and `import { signIn } from '@/lib/auth';` to `import { signIn, signOut } from '@/lib/auth';`
2. After the `useState` declarations add:
   ```tsx
   // The protected layout redirects disabled users here; it can't clear cookies
   // from a server component, so end the browser session now. Read the query
   // string directly to avoid a Suspense boundary for useSearchParams.
   useEffect(() => {
     if (
       new URLSearchParams(window.location.search).get('error') === 'disabled'
     ) {
       setError(t('disabled'));
       void signOut(supabase);
     }
   }, [supabase, t]);
   ```
3. In `handleSubmit`, replace
   ```tsx
   const { error: err } = await signIn(supabase, email, password);
   setLoading(false);
   if (err) {
     setError(err.message);
     return;
   }
   ```
   with
   ```tsx
   const { error: err, code } = await signIn(supabase, email, password);
   setLoading(false);
   if (err) {
     setError(code === 'user_banned' ? t('disabled') : err.message);
     return;
   }
   ```

- [ ] **Step 9: Verify**

Run: `yarn vitest run --project unit "src/app/admin/(protected)/layout.test.ts" && yarn vitest run --project component src/app/admin && yarn type-check`
Expected: PASS.

- [ ] **Step 10: Leave uncommitted.** Do not commit.

---

### Task 10: Page guards and permission-aware controls

**Files:**

- Modify: `src/app/admin/(protected)/dashboard/page.tsx`, `posts/new/page.tsx`, `posts/[id]/page.tsx`, `import/page.tsx`, `translations/page.tsx`
- Move: `src/app/admin/(protected)/media/page.tsx` → `media/MediaClient.tsx`; `media/page.test.tsx` → `media/MediaClient.test.tsx`
- Create: new `src/app/admin/(protected)/media/page.tsx`
- Modify: `src/app/admin/(protected)/dashboard/DashboardClient.tsx`, `src/components/admin/PostEditor.tsx`, `src/components/admin/translations/HistoryDrawer.tsx`
- Test: `src/app/admin/(protected)/dashboard/page.test.ts` (new), extend `DashboardClient.test.tsx`, `MediaClient.test.tsx`, `PostEditor.test.tsx`

**Interfaces:**

- Consumes: `hasPermission` (Task 6); `PermissionNeeded`, `usePermissions` (Task 8).
- Produces: `MediaClient` default export (the former media page component, unchanged API: no props).

Route → permission: dashboard `dashboard.view`; posts/new and posts/[id] `articles.edit`; import `import.run`; media `media.upload`; translations `translations.edit`.

- [ ] **Step 1: Write the page guard test**

```tsx
// src/app/admin/(protected)/dashboard/page.test.ts  (no JSX, so it runs in the unit project)
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/authz', () => ({ hasPermission: vi.fn() }));
vi.mock('@/lib/articles-repository', () => ({ getArticles: vi.fn() }));
vi.mock('./DashboardClient', () => ({ default: () => null }));
vi.mock('@/components/admin/PermissionNeeded', () => ({
  default: () => null,
}));

import AdminDashboardPage from './page';
import { hasPermission } from '@/lib/authz';
import { getArticles } from '@/lib/articles-repository';
import PermissionNeeded from '@/components/admin/PermissionNeeded';

describe('AdminDashboardPage guard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders PermissionNeeded and loads nothing without dashboard.view', async () => {
    vi.mocked(hasPermission).mockResolvedValue(false);
    const el = (await AdminDashboardPage()) as {
      type: unknown;
      props: { permission: string };
    };
    expect(el.type).toBe(PermissionNeeded);
    expect(el.props.permission).toBe('dashboard.view');
    expect(getArticles).not.toHaveBeenCalled();
  });

  it('loads articles with dashboard.view', async () => {
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(getArticles).mockResolvedValue([]);
    await AdminDashboardPage();
    expect(getArticles).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Add control-visibility tests**

Append to `DashboardClient.test.tsx` (inside the top-level `describe`; `draft` and `published` fixtures already exist in that file):

```tsx
it('hides publish/archive controls without those permissions', () => {
  renderAdmin(<DashboardClient items={[draft, published]} />, {
    permissions: ['dashboard.view', 'articles.edit'],
  });
  expect(screen.queryByTitle('Publish')).toBeNull();
  expect(screen.queryByTitle('Unpublish')).toBeNull();
  expect(screen.queryByTitle('Archive')).toBeNull();
  expect(screen.getAllByTitle('Edit').length).toBeGreaterThan(0);
});
```

Append to `MediaClient.test.tsx` (after renaming in Step 4; the fetch stub in `beforeEach` returns one item `pic.png`):

```tsx
it('hides delete without media.delete', async () => {
  renderAdmin(<AdminMediaPage />, { permissions: ['media.upload'] });
  await screen.findByText('pic.png');
  expect(screen.queryByTitle('Delete')).toBeNull();
});
```

Append to `PostEditor.test.tsx` (inside the top-level `describe`):

```tsx
it('hides the Publish button without articles.publish', () => {
  renderAdmin(<PostEditor />, { permissions: ['articles.edit'] });
  expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `yarn vitest run --project unit "src/app/admin/(protected)/dashboard/page.test.ts"; yarn vitest run --project component "src/app/admin/(protected)/dashboard" src/components/admin/PostEditor.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Split the media page**

```bash
mv "src/app/admin/(protected)/media/page.tsx" "src/app/admin/(protected)/media/MediaClient.tsx"
mv "src/app/admin/(protected)/media/page.test.tsx" "src/app/admin/(protected)/media/MediaClient.test.tsx"
```

In `MediaClient.test.tsx` change `import AdminMediaPage from './page';` to `import AdminMediaPage from './MediaClient';`. In `MediaClient.tsx` rename `export default function AdminMediaPage()` to `export default function MediaClient()`.

Create the new server page:

```tsx
// src/app/admin/(protected)/media/page.tsx
import PermissionNeeded from '@/components/admin/PermissionNeeded';
import { hasPermission } from '@/lib/authz';
import MediaClient from './MediaClient';

export default async function AdminMediaPage() {
  if (!(await hasPermission('media.upload'))) {
    return <PermissionNeeded permission="media.upload" />;
  }
  return <MediaClient />;
}
```

- [ ] **Step 5: Guard the other pages**

```tsx
// src/app/admin/(protected)/dashboard/page.tsx
import PermissionNeeded from '@/components/admin/PermissionNeeded';
import { hasPermission } from '@/lib/authz';
import { getArticles } from '@/lib/articles-repository';
import DashboardClient from './DashboardClient';

// All admin posts are loaded once and the table (sort/filter/paginate/select)
// runs entirely client-side. Fine for a marketing CMS (hundreds of posts).
export default async function AdminDashboardPage() {
  if (!(await hasPermission('dashboard.view'))) {
    return <PermissionNeeded permission="dashboard.view" />;
  }
  const items = await getArticles({}, true);
  return <DashboardClient items={items} />;
}
```

```tsx
// src/app/admin/(protected)/posts/new/page.tsx
import PermissionNeeded from '@/components/admin/PermissionNeeded';
import PostEditor from '@/components/admin/PostEditor';
import { hasPermission } from '@/lib/authz';

export default async function NewPostPage() {
  if (!(await hasPermission('articles.edit'))) {
    return <PermissionNeeded permission="articles.edit" />;
  }
  return <PostEditor />;
}
```

```tsx
// src/app/admin/(protected)/posts/[id]/page.tsx
import { redirect } from 'next/navigation';
import PermissionNeeded from '@/components/admin/PermissionNeeded';
import PostEditor from '@/components/admin/PostEditor';
import { hasPermission } from '@/lib/authz';
import { getArticleByIdAdmin } from '@/lib/articles';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await hasPermission('articles.edit'))) {
    return <PermissionNeeded permission="articles.edit" />;
  }
  const { id } = await params;
  const article = await getArticleByIdAdmin(id);
  if (!article) {
    redirect('/admin/dashboard');
  }
  return <PostEditor initialArticle={article} />;
}
```

```tsx
// src/app/admin/(protected)/import/page.tsx
import PermissionNeeded from '@/components/admin/PermissionNeeded';
import { hasPermission } from '@/lib/authz';
import { getRecentlyImported } from '@/lib/articles-repository';
import BulkImportClient from './BulkImportClient';

export default async function AdminImportPage() {
  if (!(await hasPermission('import.run'))) {
    return <PermissionNeeded permission="import.run" />;
  }
  const recentImports = await getRecentlyImported(10);
  return <BulkImportClient recentImports={recentImports} />;
}
```

In `src/app/admin/(protected)/translations/page.tsx`, add the imports `PermissionNeeded` and `hasPermission` (same paths as above) and make these the first lines of `AdminTranslationsPage`:

```tsx
if (!(await hasPermission('translations.edit'))) {
  return <PermissionNeeded permission="translations.edit" />;
}
```

- [ ] **Step 6: Hide controls in client components**

`DashboardClient.tsx`:

1. Add `import { usePermissions } from '@/components/admin/PermissionsContext';` and, after `const t = useTranslations('admin.dashboard');`, `const { can } = usePermissions();`
2. In the row actions cell: wrap the published/unpublished ternary (`{a.status === 'published' ? (…unpublish…) : (…publish…)}`) in `{can('articles.publish') && ( … )}`; wrap the archived ternary (`{a.status === 'archived' ? (…restore…) : (…archive…)}`) in `{can('articles.archive') && ( … )}`.
3. Add `can` to the `columns` `useMemo` dependency array: `[t, pendingRowId, runRowAction, dateLocale, can]`.
4. In the bulk bar: wrap the Publish and Unpublish buttons in `{can('articles.publish') && (<>…</>)}`, the Archive button in `{can('articles.archive') && …}`, and the Delete button in `{can('articles.delete') && …}`.

`MediaClient.tsx`:

1. Add `import { usePermissions } from '@/components/admin/PermissionsContext';` and `const { can } = usePermissions();` after the `t` declaration.
2. Wrap the delete `<button … title={t('delete')}>` in `{can('media.delete') && ( … )}`.

`PostEditor.tsx`:

1. Add `import { usePermissions } from '@/components/admin/PermissionsContext';` and `const { can } = usePermissions();` after `const t = useTranslations('admin.editor');`
2. Wrap the primary button that calls `save(true)` (label `isPublished ? t('update') : t('publish')`) in `{(isPublished || can('articles.publish')) && ( … )}`. Updating an already-published article keeps its status, which only needs `articles.edit`.

`HistoryDrawer.tsx` (`EntryCard`):

1. Add `import { usePermissions } from '@/components/admin/PermissionsContext';` and `const { can } = usePermissions();` after `const t = useTranslations('admin.translationsEditor');` in `EntryCard`.
2. Wrap the button whose `onClick={() => setConfirmDelete(true)}` in `{can('translations.history.delete') && ( … )}`.

- [ ] **Step 7: Verify**

Run: `yarn test && yarn type-check && yarn lint`
Expected: PASS.

- [ ] **Step 8: Leave uncommitted.** Do not commit.

---

### Task 11: Supabase service-role wrapper, input validation, temporary passwords

**Files:**

- Create: `src/lib/supabase/admin-core.ts`, `src/lib/supabase/admin.ts`
- Create: `src/lib/validation/access.ts`
- Create: `src/lib/temp-password.ts`
- Modify: `.env.example`
- Test: `src/lib/supabase/admin-core.test.ts`, `src/lib/validation/access.test.ts`, `src/lib/temp-password.test.ts`

**Interfaces:**

- Consumes: `isPermission` (Task 1).
- Produces (`admin-core.ts`; `admin.ts` re-exports everything with `import 'server-only'`):
  - `getSupabaseAdminClient(): SupabaseClient`
  - `type AuthUserSummary = { id: string; email: string | null; lastSignInAt: string | null; banned: boolean }`
  - `listAuthUsers(): Promise<AuthUserSummary[]>` (pages 1000 at a time; throws on API error)
  - `createAuthUser(email: string, password: string): Promise<{ ok: true; id: string } | { ok: false; error: 'EMAIL_EXISTS' | 'WEAK_PASSWORD' | 'FAILED' }>`
  - `setAuthUserPassword(id: string, password: string): Promise<{ ok: true } | { ok: false; error: 'WEAK_PASSWORD' | 'FAILED' }>`
  - `setAuthUserBanned(id: string, banned: boolean): Promise<boolean>`
  - `deleteAuthUser(id: string): Promise<boolean>` (a missing user counts as deleted)
- Produces (`validation/access.ts`):
  - `PASSWORD_MIN_LENGTH = 12`
  - `createUserSchema` → `{ email: string; displayName: string | null; password: string; roleIds: string[] }`
  - `resetPasswordSchema` → `{ userId: string; password: string }`
  - `setUserRolesSchema` → `{ userId: string; roleIds: string[] }`
  - `userIdSchema` → `{ userId: string }`
  - `changePasswordSchema` → `{ password: string }`
  - `createRoleSchema` → `{ key: string; name: string; description: string | null; permissions: Permission[] }`
  - `updateRoleSchema` → `{ roleId: string; name: string; description: string | null; permissions: Permission[] }`
  - `roleIdSchema` → `{ roleId: string }`
- Produces (`temp-password.ts`): `generateTempPassword(length?: number): string` (default 16, no ambiguous characters; works in browser and Node).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/supabase/admin-core.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const admin = {
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUserById: vi.fn(),
  deleteUser: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: { admin } })),
}));

import {
  createAuthUser,
  deleteAuthUser,
  listAuthUsers,
  setAuthUserBanned,
  setAuthUserPassword,
} from './admin-core';

describe('supabase admin-core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test');
  });

  it('pages through listUsers and marks banned users', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const page1 = Array.from({ length: 1000 }, (_, i) => ({
      id: `u${i}`,
      email: `u${i}@x.test`,
      last_sign_in_at: null,
      banned_until: i === 0 ? future : null,
    }));
    admin.listUsers
      .mockResolvedValueOnce({ data: { users: page1 }, error: null })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: 'last',
              email: 'l@x.test',
              last_sign_in_at: '2026-01-01T00:00:00Z',
              banned_until: null,
            },
          ],
        },
        error: null,
      });
    const users = await listAuthUsers();
    expect(users).toHaveLength(1001);
    expect(users[0].banned).toBe(true);
    expect(users[1].banned).toBe(false);
    expect(users[1000].lastSignInAt).toBe('2026-01-01T00:00:00Z');
    expect(admin.listUsers).toHaveBeenCalledWith({ page: 2, perPage: 1000 });
  });

  it('createAuthUser confirms the email and maps error codes', async () => {
    admin.createUser.mockResolvedValueOnce({
      data: { user: { id: 'new' } },
      error: null,
    });
    expect(await createAuthUser('a@x.test', 'long-password-1')).toEqual({
      ok: true,
      id: 'new',
    });
    expect(admin.createUser).toHaveBeenCalledWith({
      email: 'a@x.test',
      password: 'long-password-1',
      email_confirm: true,
    });

    admin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'email_exists', message: 'exists' },
    });
    expect(await createAuthUser('a@x.test', 'x')).toEqual({
      ok: false,
      error: 'EMAIL_EXISTS',
    });

    admin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'weak_password', message: 'weak' },
    });
    expect(await createAuthUser('a@x.test', 'x')).toEqual({
      ok: false,
      error: 'WEAK_PASSWORD',
    });
  });

  it('setAuthUserPassword maps weak passwords', async () => {
    admin.updateUserById.mockResolvedValueOnce({
      data: {},
      error: { code: 'weak_password', message: 'weak' },
    });
    expect(await setAuthUserPassword('u', 'x')).toEqual({
      ok: false,
      error: 'WEAK_PASSWORD',
    });
  });

  it('setAuthUserBanned uses the ban durations', async () => {
    admin.updateUserById.mockResolvedValue({ data: {}, error: null });
    expect(await setAuthUserBanned('u', true)).toBe(true);
    expect(admin.updateUserById).toHaveBeenLastCalledWith('u', {
      ban_duration: '876000h',
    });
    await setAuthUserBanned('u', false);
    expect(admin.updateUserById).toHaveBeenLastCalledWith('u', {
      ban_duration: 'none',
    });
  });

  it('deleteAuthUser treats a missing user as deleted', async () => {
    admin.deleteUser.mockResolvedValueOnce({
      data: {},
      error: { code: 'user_not_found', message: 'missing' },
    });
    expect(await deleteAuthUser('u')).toBe(true);
    admin.deleteUser.mockResolvedValueOnce({
      data: {},
      error: { code: 'unexpected_failure', message: 'boom' },
    });
    expect(await deleteAuthUser('u')).toBe(false);
  });
});
```

```ts
// src/lib/validation/access.test.ts
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createRoleSchema, createUserSchema, updateRoleSchema } from './access';

describe('access validation', () => {
  it('normalizes a new user', () => {
    const roleId = randomUUID();
    const parsed = createUserSchema.parse({
      email: '  New.User@CosBE.inc ',
      displayName: '  ',
      password: 'a-long-password',
      roleIds: [roleId, roleId],
    });
    expect(parsed).toEqual({
      email: 'new.user@cosbe.inc',
      displayName: null,
      password: 'a-long-password',
      roleIds: [roleId],
    });
  });

  it('rejects short passwords and bad emails', () => {
    expect(
      createUserSchema.safeParse({
        email: 'nope',
        password: 'short',
        roleIds: [],
      }).success
    ).toBe(false);
  });

  it('role keys are kebab-case and cannot be super-admin', () => {
    const base = { name: 'X', permissions: [] };
    expect(
      createRoleSchema.safeParse({ ...base, key: 'content-editor' }).success
    ).toBe(true);
    expect(
      createRoleSchema.safeParse({ ...base, key: 'Content Editor' }).success
    ).toBe(false);
    expect(
      createRoleSchema.safeParse({ ...base, key: 'super-admin' }).success
    ).toBe(false);
  });

  it('rejects unknown permissions and dedupes known ones', () => {
    const roleId = randomUUID();
    expect(
      updateRoleSchema.safeParse({
        roleId,
        name: 'X',
        permissions: ['articles.fly'],
      }).success
    ).toBe(false);
    expect(
      updateRoleSchema.parse({
        roleId,
        name: ' X ',
        permissions: ['media.upload', 'media.upload'],
      })
    ).toEqual({
      roleId,
      name: 'X',
      description: null,
      permissions: ['media.upload'],
    });
  });
});
```

```ts
// src/lib/temp-password.test.ts
import { describe, expect, it } from 'vitest';
import { generateTempPassword } from './temp-password';

describe('generateTempPassword', () => {
  it('is 16 characters without ambiguous characters', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateTempPassword();
      expect(pw).toHaveLength(16);
      expect(pw).not.toMatch(/[0O1lI]/);
    }
  });

  it('is not repeated', () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `yarn vitest run --project unit src/lib/supabase/admin-core.test.ts src/lib/validation/access.test.ts src/lib/temp-password.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/lib/supabase/admin-core.ts`**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for Auth admin operations. Bypasses all access
 * controls — app code must import `@/lib/supabase/admin` (server-only) instead
 * of this file. No `server-only` import here so `tsx` scripts can use it.
 */
let client: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

const PER_PAGE = 1000;
const BAN_FOREVER = '876000h';

export type AuthUserSummary = {
  id: string;
  email: string | null;
  lastSignInAt: string | null;
  banned: boolean;
};

export async function listAuthUsers(): Promise<AuthUserSummary[]> {
  const admin = getSupabaseAdminClient().auth.admin;
  const users: AuthUserSummary[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    for (const u of data.users) {
      users.push({
        id: u.id,
        email: u.email ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        banned:
          !!u.banned_until && new Date(u.banned_until).getTime() > Date.now(),
      });
    }
    if (data.users.length < PER_PAGE) return users;
  }
}

export async function createAuthUser(
  email: string,
  password: string
): Promise<
  | { ok: true; id: string }
  | { ok: false; error: 'EMAIL_EXISTS' | 'WEAK_PASSWORD' | 'FAILED' }
> {
  const { data, error } = await getSupabaseAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    if (
      error?.code === 'email_exists' ||
      error?.code === 'user_already_exists'
    ) {
      return { ok: false, error: 'EMAIL_EXISTS' };
    }
    if (error?.code === 'weak_password') {
      return { ok: false, error: 'WEAK_PASSWORD' };
    }
    console.error('[createAuthUser]', error);
    return { ok: false, error: 'FAILED' };
  }
  return { ok: true, id: data.user.id };
}

export async function setAuthUserPassword(
  id: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: 'WEAK_PASSWORD' | 'FAILED' }> {
  const { error } = await getSupabaseAdminClient().auth.admin.updateUserById(
    id,
    { password }
  );
  if (!error) return { ok: true };
  if (error.code === 'weak_password')
    return { ok: false, error: 'WEAK_PASSWORD' };
  console.error('[setAuthUserPassword]', error);
  return { ok: false, error: 'FAILED' };
}

export async function setAuthUserBanned(
  id: string,
  banned: boolean
): Promise<boolean> {
  const { error } = await getSupabaseAdminClient().auth.admin.updateUserById(
    id,
    { ban_duration: banned ? BAN_FOREVER : 'none' }
  );
  if (error) console.error('[setAuthUserBanned]', error);
  return !error;
}

export async function deleteAuthUser(id: string): Promise<boolean> {
  const { error } = await getSupabaseAdminClient().auth.admin.deleteUser(id);
  if (!error || error.code === 'user_not_found') return true;
  console.error('[deleteAuthUser]', error);
  return false;
}
```

```ts
// src/lib/supabase/admin.ts
import 'server-only';

export * from './admin-core';
```

- [ ] **Step 4: Implement `src/lib/validation/access.ts`**

```ts
import { z } from 'zod';
import {
  SUPER_ADMIN_ROLE_KEY,
  isPermission,
  type Permission,
} from '@/lib/permissions';

export const PASSWORD_MIN_LENGTH = 12;

// Supabase hashes with bcrypt, which ignores bytes past 72.
const password = z.string().min(PASSWORD_MIN_LENGTH).max(72);
const email = z.string().trim().toLowerCase().pipe(z.email());
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));
const idList = z
  .array(z.uuid())
  .max(50)
  .transform((ids) => [...new Set(ids)]);
const permissionList = z
  .array(z.string().refine(isPermission, 'Unknown permission'))
  .max(100)
  .transform((ps) => [...new Set(ps)] as Permission[]);
const roleName = z.string().trim().min(1).max(60);

export const createUserSchema = z.object({
  email,
  displayName: optionalText(100),
  password,
  roleIds: idList,
});

export const resetPasswordSchema = z.object({
  userId: z.uuid(),
  password,
});

export const setUserRolesSchema = z.object({
  userId: z.uuid(),
  roleIds: idList,
});

export const userIdSchema = z.object({ userId: z.uuid() });

export const changePasswordSchema = z.object({ password });

export const createRoleSchema = z.object({
  key: z
    .string()
    .trim()
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .refine((k) => k !== SUPER_ADMIN_ROLE_KEY),
  name: roleName,
  description: optionalText(300),
  permissions: permissionList,
});

export const updateRoleSchema = z.object({
  roleId: z.uuid(),
  name: roleName,
  description: optionalText(300),
  permissions: permissionList,
});

export const roleIdSchema = z.object({ roleId: z.uuid() });
```

- [ ] **Step 5: Implement `src/lib/temp-password.ts`**

```ts
// No 0/O, 1/l/I so passwords survive being read aloud or retyped.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generateTempPassword(length = 16): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
```

- [ ] **Step 6: Document the env var**

Append to `.env.example` directly below `NEXT_PUBLIC_SUPABASE_ANON_KEY=`:

```bash
# Server-only. Used to create/disable/delete admin users (src/lib/supabase/admin.ts)
# and by `yarn db:bootstrap-admins`. Never prefix with NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 7: Verify**

Run: `yarn vitest run --project unit src/lib/supabase/admin-core.test.ts src/lib/validation/access.test.ts src/lib/temp-password.test.ts && yarn type-check`
Expected: PASS. If `z.uuid()` rejects the test UUIDs, confirm they come from `randomUUID()` (RFC 4122 v4).

- [ ] **Step 8: Leave uncommitted.** Do not commit.

---

### Task 12: User management actions

**Files:**

- Create: `src/actions/users.ts`
- Test: `src/actions/users.test.ts`

**Interfaces:**

- Consumes: `requirePermission`, `AuthzContext` (Task 6); `canAssignRole`, `canModifyUser` (Task 2); `findAdminUserWithRoles`, `isSuperAdminUser`, `listAdminUsers`, `createAdminUserRecord`, `setAdminUserRoles`, `setAdminUserDisabled`, `setMustChangePassword`, `deleteAdminUserRecord`, `AdminUserWithRoles` (Task 5); `getRolesByIds` (Task 5); `listAuthUsers`, `createAuthUser`, `setAuthUserPassword`, `setAuthUserBanned`, `deleteAuthUser` (Task 11, via `@/lib/supabase/admin`); schemas (Task 11); `AccessResult`, `AdminUserRow` (Task 8).
- Produces (all `'use server'`; permission failures **throw** `Forbidden`/`Unauthorized`, guardrail and business failures **return** `{ ok: false, error }`):
  - `listUsersAction(): Promise<AdminUserRow[]>` — `users.view`
  - `createUserAction(input: { email: string; displayName?: string | null; password: string; roleIds: string[] }): Promise<AccessResult<{ id: string; email: string }>>` — `users.create`
  - `resetPasswordAction(input: { userId: string; password: string }): Promise<AccessResult>` — `users.create`
  - `setUserRolesAction(input: { userId: string; roleIds: string[] }): Promise<AccessResult>` — `users.assign-roles`
  - `disableUserAction(input: { userId: string }): Promise<AccessResult>` — `users.disable`
  - `enableUserAction(input: { userId: string }): Promise<AccessResult>` — `users.disable`
  - `deleteUserAction(input: { userId: string }): Promise<AccessResult>` — `users.delete`

- [ ] **Step 1: Write the failing test**

```ts
// src/actions/users.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, TEST_USER } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/admin-users-repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/admin-users-repository')>();
  return {
    ...actual,
    findAdminUserWithRoles: vi.fn(),
    listAdminUsers: vi.fn(),
    createAdminUserRecord: vi.fn(),
    setAdminUserRoles: vi.fn(),
    setAdminUserDisabled: vi.fn(),
    setMustChangePassword: vi.fn(),
    deleteAdminUserRecord: vi.fn(),
  };
});

vi.mock('@/lib/roles-repository', () => ({ getRolesByIds: vi.fn() }));

vi.mock('@/lib/supabase/admin', () => ({
  listAuthUsers: vi.fn(),
  createAuthUser: vi.fn(),
  setAuthUserPassword: vi.fn(),
  setAuthUserBanned: vi.fn(),
  deleteAuthUser: vi.fn(),
}));

import {
  createUserAction,
  deleteUserAction,
  disableUserAction,
  enableUserAction,
  listUsersAction,
  resetPasswordAction,
  setUserRolesAction,
} from './users';
import * as usersRepo from '@/lib/admin-users-repository';
import { getRolesByIds } from '@/lib/roles-repository';
import * as authAdmin from '@/lib/supabase/admin';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';

const TARGET_ID = '3f0b7a52-8a8e-4c1e-9f5e-1f2d3c4b5a69';
const ADMIN_ROLE = '6d2c1e4a-3b5f-4a7e-8c9d-0e1f2a3b4c5d';
const SUPER_ROLE = '7e3d2f5b-4c6a-4b8f-9d0e-1f2a3b4c5d6e';
const POWER_ROLE = '8f4e3a6c-5d7b-4c9a-8e1f-2a3b4c5d6e7f';

const roles = {
  [ADMIN_ROLE]: {
    id: ADMIN_ROLE,
    key: 'admin',
    name: 'Admin',
    description: null,
    isSystem: false,
    permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    userCount: 0,
  },
  [SUPER_ROLE]: {
    id: SUPER_ROLE,
    key: 'super-admin',
    name: 'Super-admin',
    description: null,
    isSystem: true,
    permissions: [],
    userCount: 1,
  },
  [POWER_ROLE]: {
    id: POWER_ROLE,
    key: 'power',
    name: 'Power',
    description: null,
    isSystem: false,
    permissions: ['users.delete'],
    userCount: 0,
  },
};

function target({
  id = TARGET_ID,
  roleIds = [] as string[],
  disabled = false,
} = {}) {
  return {
    id,
    email: 'target@test.local',
    displayName: null,
    disabled,
    mustChangePassword: false,
    createdBy: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    roles: roleIds.map((roleId) => {
      const r = roles[roleId as keyof typeof roles];
      return {
        userId: id,
        roleId,
        assignedBy: null,
        assignedAt: new Date(),
        role: {
          id: r.id,
          key: r.key,
          name: r.name,
          description: null,
          isSystem: r.isSystem,
          createdAt: new Date(),
          updatedAt: new Date(),
          permissions: r.permissions.map((permission) => ({
            roleId,
            permission,
          })),
        },
      };
    }),
  };
}

const ADMIN_PERMS = DEFAULT_ROLE_PERMISSIONS.admin;

beforeEach(() => {
  vi.clearAllMocks();
  authed(ADMIN_PERMS);
  vi.mocked(getRolesByIds).mockImplementation(async (ids) =>
    ids.map((id) => roles[id as keyof typeof roles]).filter(Boolean)
  );
});

describe('listUsersAction', () => {
  it('maps rows and last sign-in', async () => {
    vi.mocked(usersRepo.listAdminUsers).mockResolvedValue([
      target({ roleIds: [SUPER_ROLE] }),
    ] as never);
    vi.mocked(authAdmin.listAuthUsers).mockResolvedValue([
      {
        id: TARGET_ID,
        email: 'target@test.local',
        lastSignInAt: '2026-02-01T00:00:00Z',
        banned: false,
      },
    ]);
    const rows = await listUsersAction();
    expect(rows).toEqual([
      {
        id: TARGET_ID,
        email: 'target@test.local',
        displayName: null,
        disabled: false,
        mustChangePassword: false,
        isSuperAdmin: true,
        roleIds: [SUPER_ROLE],
        createdAt: '2026-01-01T00:00:00.000Z',
        lastSignInAt: '2026-02-01T00:00:00Z',
      },
    ]);
  });

  it('still lists users when the auth API fails', async () => {
    vi.mocked(usersRepo.listAdminUsers).mockResolvedValue([target()] as never);
    vi.mocked(authAdmin.listAuthUsers).mockRejectedValue(new Error('no key'));
    const rows = await listUsersAction();
    expect(rows[0].lastSignInAt).toBeNull();
  });

  it('throws without users.view', async () => {
    authed(['dashboard.view']);
    await expect(listUsersAction()).rejects.toThrow('Forbidden');
  });
});

describe('createUserAction', () => {
  const input = {
    email: 'New@Test.local',
    displayName: 'New',
    password: 'temporary-pass-123',
    roleIds: [ADMIN_ROLE],
  };

  it('creates the auth user then the admin row', async () => {
    vi.mocked(authAdmin.createAuthUser).mockResolvedValue({
      ok: true,
      id: TARGET_ID,
    });
    const res = await createUserAction(input);
    expect(res).toEqual({
      ok: true,
      data: { id: TARGET_ID, email: 'new@test.local' },
    });
    expect(authAdmin.createAuthUser).toHaveBeenCalledWith(
      'new@test.local',
      'temporary-pass-123'
    );
    expect(usersRepo.createAdminUserRecord).toHaveBeenCalledWith({
      id: TARGET_ID,
      email: 'new@test.local',
      displayName: 'New',
      createdBy: TEST_USER.email,
      roleIds: [ADMIN_ROLE],
    });
  });

  it('deletes the auth user when the DB write fails', async () => {
    vi.mocked(authAdmin.createAuthUser).mockResolvedValue({
      ok: true,
      id: TARGET_ID,
    });
    vi.mocked(usersRepo.createAdminUserRecord).mockRejectedValue(
      new Error('db')
    );
    vi.mocked(authAdmin.deleteAuthUser).mockResolvedValue(true);
    expect(await createUserAction(input)).toEqual({
      ok: false,
      error: 'FAILED',
    });
    expect(authAdmin.deleteAuthUser).toHaveBeenCalledWith(TARGET_ID);
  });

  it('passes through EMAIL_EXISTS', async () => {
    vi.mocked(authAdmin.createAuthUser).mockResolvedValue({
      ok: false,
      error: 'EMAIL_EXISTS',
    });
    expect(await createUserAction(input)).toEqual({
      ok: false,
      error: 'EMAIL_EXISTS',
    });
  });

  it('refuses roles the actor cannot assign, before touching Supabase', async () => {
    expect(await createUserAction({ ...input, roleIds: [SUPER_ROLE] })).toEqual(
      {
        ok: false,
        error: 'FORBIDDEN',
      }
    );
    expect(await createUserAction({ ...input, roleIds: [POWER_ROLE] })).toEqual(
      {
        ok: false,
        error: 'FORBIDDEN',
      }
    );
    expect(authAdmin.createAuthUser).not.toHaveBeenCalled();
  });

  it('rejects invalid input', async () => {
    expect(await createUserAction({ ...input, password: 'short' })).toEqual({
      ok: false,
      error: 'INVALID_INPUT',
    });
  });

  it('throws without users.create', async () => {
    authed(['users.view']);
    await expect(createUserAction(input)).rejects.toThrow('Forbidden');
  });
});

describe('guardrails on existing users', () => {
  it('nobody can modify their own account', async () => {
    // Inputs are validated as UUIDs, so point the actor at the target's UUID.
    const ctx = authed(ADMIN_PERMS);
    ctx.actor.userId = TARGET_ID;
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
    expect(await disableUserAction({ userId: TARGET_ID })).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect(usersRepo.setAdminUserDisabled).not.toHaveBeenCalled();
  });

  it('admins cannot modify a super-admin', async () => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target({ roleIds: [SUPER_ROLE] }) as never
    );
    expect(
      await resetPasswordAction({
        userId: TARGET_ID,
        password: 'another-long-pass',
      })
    ).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
  });

  it('returns NOT_FOUND for a missing user', async () => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(null);
    expect(await enableUserAction({ userId: TARGET_ID })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
  });
});

describe('setUserRolesAction', () => {
  it('replaces roles within the actor permissions', async () => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
    expect(
      await setUserRolesAction({ userId: TARGET_ID, roleIds: [ADMIN_ROLE] })
    ).toEqual({
      ok: true,
      data: undefined,
    });
    expect(usersRepo.setAdminUserRoles).toHaveBeenCalledWith(
      TARGET_ID,
      [ADMIN_ROLE],
      TEST_USER.email
    );
  });

  it('cannot remove a role the actor could not assign', async () => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target({ roleIds: [POWER_ROLE] }) as never
    );
    expect(
      await setUserRolesAction({ userId: TARGET_ID, roleIds: [] })
    ).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect(usersRepo.setAdminUserRoles).not.toHaveBeenCalled();
  });

  it('super-admin can grant super-admin', async () => {
    authed(ADMIN_PERMS, { isSuperAdmin: true });
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
    expect(
      (await setUserRolesAction({ userId: TARGET_ID, roleIds: [SUPER_ROLE] }))
        .ok
    ).toBe(true);
  });
});

describe('resetPasswordAction', () => {
  it('sets the password and requires a change on next sign-in', async () => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
    vi.mocked(authAdmin.setAuthUserPassword).mockResolvedValue({ ok: true });
    expect(
      (
        await resetPasswordAction({
          userId: TARGET_ID,
          password: 'another-long-pass',
        })
      ).ok
    ).toBe(true);
    expect(authAdmin.setAuthUserPassword).toHaveBeenCalledWith(
      TARGET_ID,
      'another-long-pass'
    );
    expect(usersRepo.setMustChangePassword).toHaveBeenCalledWith(
      TARGET_ID,
      true
    );
  });
});

describe('disable / enable', () => {
  beforeEach(() => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
  });

  it('disables in the DB even when the ban fails', async () => {
    vi.mocked(authAdmin.setAuthUserBanned).mockResolvedValue(false);
    expect(await disableUserAction({ userId: TARGET_ID })).toEqual({
      ok: false,
      error: 'BAN_FAILED',
    });
    expect(usersRepo.setAdminUserDisabled).toHaveBeenCalledWith(
      TARGET_ID,
      true
    );
  });

  it('enable lifts the ban before clearing the flag', async () => {
    vi.mocked(authAdmin.setAuthUserBanned).mockResolvedValue(false);
    expect(await enableUserAction({ userId: TARGET_ID })).toEqual({
      ok: false,
      error: 'FAILED',
    });
    expect(usersRepo.setAdminUserDisabled).not.toHaveBeenCalled();

    vi.mocked(authAdmin.setAuthUserBanned).mockResolvedValue(true);
    expect((await enableUserAction({ userId: TARGET_ID })).ok).toBe(true);
    expect(usersRepo.setAdminUserDisabled).toHaveBeenCalledWith(
      TARGET_ID,
      false
    );
  });
});

describe('deleteUserAction', () => {
  it('throws without users.delete (admins)', async () => {
    await expect(deleteUserAction({ userId: TARGET_ID })).rejects.toThrow(
      'Forbidden'
    );
  });

  it('requires the user to be disabled first', async () => {
    authed(ADMIN_PERMS.concat('users.delete'), { isSuperAdmin: true });
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
    expect(await deleteUserAction({ userId: TARGET_ID })).toEqual({
      ok: false,
      error: 'MUST_DISABLE_FIRST',
    });
    expect(authAdmin.deleteAuthUser).not.toHaveBeenCalled();
  });

  it('deletes the auth user, then the row', async () => {
    authed(ADMIN_PERMS.concat('users.delete'), { isSuperAdmin: true });
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target({ disabled: true }) as never
    );
    vi.mocked(authAdmin.deleteAuthUser).mockResolvedValue(true);
    expect((await deleteUserAction({ userId: TARGET_ID })).ok).toBe(true);
    expect(usersRepo.deleteAdminUserRecord).toHaveBeenCalledWith(TARGET_ID);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `yarn vitest run --project unit src/actions/users.test.ts`
Expected: FAIL — `./users` not found.

- [ ] **Step 3: Implement `src/actions/users.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission, type AuthzContext } from '@/lib/authz';
import { canAssignRole, canModifyUser } from '@/lib/authz-rules';
import {
  createAdminUserRecord,
  deleteAdminUserRecord,
  findAdminUserWithRoles,
  isSuperAdminUser,
  listAdminUsers,
  setAdminUserDisabled,
  setAdminUserRoles,
  setMustChangePassword,
  type AdminUserWithRoles,
} from '@/lib/admin-users-repository';
import { getRolesByIds } from '@/lib/roles-repository';
import {
  createAuthUser,
  deleteAuthUser,
  listAuthUsers,
  setAuthUserBanned,
  setAuthUserPassword,
} from '@/lib/supabase/admin';
import {
  createUserSchema,
  resetPasswordSchema,
  setUserRolesSchema,
  userIdSchema,
} from '@/lib/validation/access';
import type { AccessResult, AdminUserRow } from '@/lib/access-types';

const USERS_PATH = '/admin/users';

function actorEmail(ctx: AuthzContext): string {
  return ctx.user.email ?? ctx.user.id;
}

/** Loads a user the actor is allowed to modify (rules 2 + 4). */
async function loadModifiableUser(
  ctx: AuthzContext,
  userId: string
): Promise<AccessResult<AdminUserWithRoles>> {
  const user = await findAdminUserWithRoles(userId);
  if (!user) return { ok: false, error: 'NOT_FOUND' };
  if (
    !canModifyUser(ctx.actor, {
      id: user.id,
      isSuperAdmin: isSuperAdminUser(user),
    })
  ) {
    return { ok: false, error: 'FORBIDDEN' };
  }
  return { ok: true, data: user };
}

/** Rule 3: every role being added or removed must be assignable by the actor. */
async function checkAssignable(
  ctx: AuthzContext,
  roleIds: string[]
): Promise<AccessResult> {
  if (roleIds.length === 0) return { ok: true, data: undefined };
  const roles = await getRolesByIds(roleIds);
  if (roles.length !== roleIds.length) {
    return { ok: false, error: 'INVALID_INPUT' };
  }
  if (!roles.every((role) => canAssignRole(ctx.actor, role))) {
    return { ok: false, error: 'FORBIDDEN' };
  }
  return { ok: true, data: undefined };
}

export async function listUsersAction(): Promise<AdminUserRow[]> {
  await requirePermission('users.view');
  const [users, authUsers] = await Promise.all([
    listAdminUsers(),
    // Last sign-in is nice to have; don't break the page if the auth API fails.
    listAuthUsers().catch((error: unknown) => {
      console.error('[listUsersAction] listAuthUsers', error);
      return [];
    }),
  ]);
  const lastSignIn = new Map(authUsers.map((u) => [u.id, u.lastSignInAt]));
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    disabled: u.disabled,
    mustChangePassword: u.mustChangePassword,
    isSuperAdmin: isSuperAdminUser(u),
    roleIds: u.roles.map((r) => r.roleId),
    createdAt: u.createdAt.toISOString(),
    lastSignInAt: lastSignIn.get(u.id) ?? null,
  }));
}

export async function createUserAction(input: {
  email: string;
  displayName?: string | null;
  password: string;
  roleIds: string[];
}): Promise<AccessResult<{ id: string; email: string }>> {
  const ctx = await requirePermission('users.create');
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const { email, displayName, password, roleIds } = parsed.data;

  const assignable = await checkAssignable(ctx, roleIds);
  if (!assignable.ok) return assignable;

  const created = await createAuthUser(email, password);
  if (!created.ok) return created;

  try {
    await createAdminUserRecord({
      id: created.id,
      email,
      displayName,
      createdBy: actorEmail(ctx),
      roleIds,
    });
  } catch (error) {
    console.error('[createUserAction]', error);
    // Don't leave a Supabase account behind without an admin row.
    await deleteAuthUser(created.id);
    return { ok: false, error: 'FAILED' };
  }
  revalidatePath(USERS_PATH);
  return { ok: true, data: { id: created.id, email } };
}

export async function resetPasswordAction(input: {
  userId: string;
  password: string;
}): Promise<AccessResult> {
  const ctx = await requirePermission('users.create');
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const target = await loadModifiableUser(ctx, parsed.data.userId);
  if (!target.ok) return target;

  const updated = await setAuthUserPassword(
    target.data.id,
    parsed.data.password
  );
  if (!updated.ok) return updated;
  await setMustChangePassword(target.data.id, true);
  revalidatePath(USERS_PATH);
  return { ok: true, data: undefined };
}

export async function setUserRolesAction(input: {
  userId: string;
  roleIds: string[];
}): Promise<AccessResult> {
  const ctx = await requirePermission('users.assign-roles');
  const parsed = setUserRolesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const target = await loadModifiableUser(ctx, parsed.data.userId);
  if (!target.ok) return target;

  const current = new Set(target.data.roles.map((r) => r.roleId));
  const next = new Set(parsed.data.roleIds);
  const changed = [
    ...parsed.data.roleIds.filter((id) => !current.has(id)),
    ...[...current].filter((id) => !next.has(id)),
  ];
  const assignable = await checkAssignable(ctx, changed);
  if (!assignable.ok) return assignable;

  await setAdminUserRoles(target.data.id, parsed.data.roleIds, actorEmail(ctx));
  revalidatePath(USERS_PATH);
  return { ok: true, data: undefined };
}

export async function disableUserAction(input: {
  userId: string;
}): Promise<AccessResult> {
  const ctx = await requirePermission('users.disable');
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const target = await loadModifiableUser(ctx, parsed.data.userId);
  if (!target.ok) return target;

  // DB flag first: it blocks access on the next request even if the ban fails.
  await setAdminUserDisabled(target.data.id, true);
  const banned = await setAuthUserBanned(target.data.id, true);
  revalidatePath(USERS_PATH);
  return banned
    ? { ok: true, data: undefined }
    : { ok: false, error: 'BAN_FAILED' };
}

export async function enableUserAction(input: {
  userId: string;
}): Promise<AccessResult> {
  const ctx = await requirePermission('users.disable');
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const target = await loadModifiableUser(ctx, parsed.data.userId);
  if (!target.ok) return target;

  // Lift the ban first so a re-enabled user can actually sign in.
  if (!(await setAuthUserBanned(target.data.id, false))) {
    return { ok: false, error: 'FAILED' };
  }
  await setAdminUserDisabled(target.data.id, false);
  revalidatePath(USERS_PATH);
  return { ok: true, data: undefined };
}

export async function deleteUserAction(input: {
  userId: string;
}): Promise<AccessResult> {
  const ctx = await requirePermission('users.delete');
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const target = await loadModifiableUser(ctx, parsed.data.userId);
  if (!target.ok) return target;
  if (!target.data.disabled) return { ok: false, error: 'MUST_DISABLE_FIRST' };

  if (!(await deleteAuthUser(target.data.id))) {
    return { ok: false, error: 'FAILED' };
  }
  await deleteAdminUserRecord(target.data.id);
  revalidatePath(USERS_PATH);
  return { ok: true, data: undefined };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run --project unit src/actions/users.test.ts && yarn type-check`
Expected: PASS.

- [ ] **Step 5: Leave uncommitted.** Do not commit.

---

### Task 13: Role management actions

**Files:**

- Create: `src/actions/roles.ts`
- Test: `src/actions/roles.test.ts`

**Interfaces:**

- Consumes: `requirePermission`, `requireAnyPermission` (Task 6); `canEditRole`, `canDeleteRole` (Task 2); `listRoles`, `getRoleById`, `roleKeyExists`, `createRoleRecord`, `updateRoleRecord`, `deleteRoleRecord` (Task 5); `createRoleSchema`, `updateRoleSchema`, `roleIdSchema` (Task 11); `AccessResult`, `RoleRow` (Task 8).
- Produces (`'use server'`):
  - `listRolesAction(): Promise<RoleRow[]>` — `users.view` or `roles.manage`
  - `createRoleAction(input: { key: string; name: string; description?: string | null; permissions: string[] }): Promise<AccessResult<{ id: string }>>` — `roles.manage`
  - `updateRoleAction(input: { roleId: string; name: string; description?: string | null; permissions: string[] }): Promise<AccessResult>` — `roles.manage`
  - `deleteRoleAction(input: { roleId: string }): Promise<AccessResult>` — `roles.manage`

- [ ] **Step 1: Write the failing test**

```ts
// src/actions/roles.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/roles-repository', () => ({
  listRoles: vi.fn(),
  getRoleById: vi.fn(),
  roleKeyExists: vi.fn(),
  createRoleRecord: vi.fn(),
  updateRoleRecord: vi.fn(),
  deleteRoleRecord: vi.fn(),
}));

import {
  createRoleAction,
  deleteRoleAction,
  listRolesAction,
  updateRoleAction,
} from './roles';
import * as rolesRepo from '@/lib/roles-repository';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';

const ROLE_ID = '6d2c1e4a-3b5f-4a7e-8c9d-0e1f2a3b4c5d';
const ADMIN_PERMS = DEFAULT_ROLE_PERMISSIONS.admin;

function role(
  overrides: Partial<Awaited<ReturnType<typeof rolesRepo.getRoleById>>> = {}
) {
  return {
    id: ROLE_ID,
    key: 'editor',
    name: 'Editor',
    description: null,
    isSystem: false,
    permissions: ['articles.edit'],
    userCount: 2,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authed(ADMIN_PERMS);
});

describe('listRolesAction', () => {
  it('is allowed with users.view', async () => {
    authed(['users.view']);
    vi.mocked(rolesRepo.listRoles).mockResolvedValue([role()]);
    expect(await listRolesAction()).toEqual([role()]);
  });

  it('throws without users.view or roles.manage', async () => {
    authed(['dashboard.view']);
    await expect(listRolesAction()).rejects.toThrow('Forbidden');
  });
});

describe('createRoleAction', () => {
  it('creates a role within the actor permissions', async () => {
    vi.mocked(rolesRepo.roleKeyExists).mockResolvedValue(false);
    vi.mocked(rolesRepo.createRoleRecord).mockResolvedValue(ROLE_ID);
    expect(
      await createRoleAction({
        key: 'content-editor',
        name: 'Content editor',
        permissions: ['articles.edit', 'media.upload'],
      })
    ).toEqual({ ok: true, data: { id: ROLE_ID } });
    expect(rolesRepo.createRoleRecord).toHaveBeenCalledWith({
      key: 'content-editor',
      name: 'Content editor',
      description: null,
      permissions: ['articles.edit', 'media.upload'],
    });
  });

  it('refuses permissions the actor lacks', async () => {
    expect(
      await createRoleAction({
        key: 'x',
        name: 'X',
        permissions: ['users.delete'],
      })
    ).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect(rolesRepo.createRoleRecord).not.toHaveBeenCalled();
  });

  it('reports duplicate keys', async () => {
    vi.mocked(rolesRepo.roleKeyExists).mockResolvedValue(true);
    expect(
      await createRoleAction({ key: 'editor', name: 'X', permissions: [] })
    ).toEqual({ ok: false, error: 'KEY_EXISTS' });
  });

  it('throws without roles.manage', async () => {
    authed(['users.view']);
    await expect(
      createRoleAction({ key: 'x', name: 'X', permissions: [] })
    ).rejects.toThrow('Forbidden');
  });
});

describe('updateRoleAction', () => {
  it('updates a role', async () => {
    vi.mocked(rolesRepo.getRoleById).mockResolvedValue(role());
    expect(
      (
        await updateRoleAction({
          roleId: ROLE_ID,
          name: 'Editor',
          permissions: ['articles.edit', 'articles.publish'],
        })
      ).ok
    ).toBe(true);
    expect(rolesRepo.updateRoleRecord).toHaveBeenCalledWith(ROLE_ID, {
      name: 'Editor',
      description: null,
      permissions: ['articles.edit', 'articles.publish'],
    });
  });

  it('refuses the system role even for super-admins', async () => {
    authed(ADMIN_PERMS, { isSuperAdmin: true });
    vi.mocked(rolesRepo.getRoleById).mockResolvedValue(
      role({ key: 'super-admin', isSystem: true, permissions: [] })
    );
    expect(
      await updateRoleAction({ roleId: ROLE_ID, name: 'X', permissions: [] })
    ).toEqual({ ok: false, error: 'FORBIDDEN' });
  });

  it('refuses stripping a role more powerful than the actor', async () => {
    vi.mocked(rolesRepo.getRoleById).mockResolvedValue(
      role({ permissions: ['users.delete'] })
    );
    expect(
      await updateRoleAction({ roleId: ROLE_ID, name: 'X', permissions: [] })
    ).toEqual({ ok: false, error: 'FORBIDDEN' });
  });

  it('returns NOT_FOUND', async () => {
    vi.mocked(rolesRepo.getRoleById).mockResolvedValue(null);
    expect(
      await updateRoleAction({ roleId: ROLE_ID, name: 'X', permissions: [] })
    ).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});

describe('deleteRoleAction', () => {
  it('deletes a role the actor fully holds', async () => {
    vi.mocked(rolesRepo.getRoleById).mockResolvedValue(role());
    expect((await deleteRoleAction({ roleId: ROLE_ID })).ok).toBe(true);
    expect(rolesRepo.deleteRoleRecord).toHaveBeenCalledWith(ROLE_ID);
  });

  it('refuses the system role', async () => {
    vi.mocked(rolesRepo.getRoleById).mockResolvedValue(
      role({ key: 'super-admin', isSystem: true, permissions: [] })
    );
    expect(await deleteRoleAction({ roleId: ROLE_ID })).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `yarn vitest run --project unit src/actions/roles.test.ts`
Expected: FAIL — `./roles` not found.

- [ ] **Step 3: Implement `src/actions/roles.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyPermission, requirePermission } from '@/lib/authz';
import { canDeleteRole, canEditRole } from '@/lib/authz-rules';
import {
  createRoleRecord,
  deleteRoleRecord,
  getRoleById,
  listRoles,
  roleKeyExists,
  updateRoleRecord,
} from '@/lib/roles-repository';
import {
  createRoleSchema,
  roleIdSchema,
  updateRoleSchema,
} from '@/lib/validation/access';
import type { AccessResult, RoleRow } from '@/lib/access-types';

function revalidateAccessPages() {
  revalidatePath('/admin/roles');
  revalidatePath('/admin/users');
}

/** The users page needs role names too, so users.view is enough to list. */
export async function listRolesAction(): Promise<RoleRow[]> {
  await requireAnyPermission('users.view', 'roles.manage');
  return listRoles();
}

export async function createRoleAction(input: {
  key: string;
  name: string;
  description?: string | null;
  permissions: string[];
}): Promise<AccessResult<{ id: string }>> {
  const ctx = await requirePermission('roles.manage');
  const parsed = createRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  if (!canEditRole(ctx.actor, null, parsed.data.permissions)) {
    return { ok: false, error: 'FORBIDDEN' };
  }
  if (await roleKeyExists(parsed.data.key)) {
    return { ok: false, error: 'KEY_EXISTS' };
  }
  const id = await createRoleRecord(parsed.data);
  revalidateAccessPages();
  return { ok: true, data: { id } };
}

export async function updateRoleAction(input: {
  roleId: string;
  name: string;
  description?: string | null;
  permissions: string[];
}): Promise<AccessResult> {
  const ctx = await requirePermission('roles.manage');
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const role = await getRoleById(parsed.data.roleId);
  if (!role) return { ok: false, error: 'NOT_FOUND' };
  if (!canEditRole(ctx.actor, role, parsed.data.permissions)) {
    return { ok: false, error: 'FORBIDDEN' };
  }
  await updateRoleRecord(role.id, {
    name: parsed.data.name,
    description: parsed.data.description,
    permissions: parsed.data.permissions,
  });
  revalidateAccessPages();
  return { ok: true, data: undefined };
}

export async function deleteRoleAction(input: {
  roleId: string;
}): Promise<AccessResult> {
  const ctx = await requirePermission('roles.manage');
  const parsed = roleIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const role = await getRoleById(parsed.data.roleId);
  if (!role) return { ok: false, error: 'NOT_FOUND' };
  if (!canDeleteRole(ctx.actor, role)) return { ok: false, error: 'FORBIDDEN' };
  await deleteRoleRecord(role.id);
  revalidateAccessPages();
  return { ok: true, data: undefined };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run --project unit src/actions/roles.test.ts && yarn type-check`
Expected: PASS.

- [ ] **Step 5: Leave uncommitted.** Do not commit.

---

### Task 14: Forced password change (action + page)

**Files:**

- Create: `src/actions/account.ts`
- Create: `src/app/admin/change-password/page.tsx`
- Create: `src/app/admin/change-password/ChangePasswordForm.tsx`
- Test: `src/actions/account.test.ts`, `src/app/admin/change-password/ChangePasswordForm.test.tsx`, `src/app/admin/change-password/page.test.ts`

**Interfaces:**

- Consumes: `requireActiveSession`, `getCurrentAdmin` (Task 6); `setMustChangePassword` (Task 5); `changePasswordSchema`, `PASSWORD_MIN_LENGTH` (Task 11); `AccessResult` (Task 8); messages `admin.changePassword.*`, `admin.access.errors.*` (Task 8).
- Produces:
  - `changeOwnPasswordAction(input: { password: string }): Promise<AccessResult>`
  - `ChangePasswordForm({ email: string })` client component
  - Route `/admin/change-password`

- [ ] **Step 1: Write the failing tests**

```ts
// src/actions/account.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, TEST_USER, unauth } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));

vi.mock('@/lib/admin-users-repository', () => ({
  setMustChangePassword: vi.fn(),
}));

import { changeOwnPasswordAction } from './account';
import { setMustChangePassword } from '@/lib/admin-users-repository';

describe('changeOwnPasswordAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the password with the user session and clears the flag', async () => {
    const ctx = authed([]);
    ctx.supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });
    expect(
      await changeOwnPasswordAction({ password: 'my-own-password' })
    ).toEqual({
      ok: true,
      data: undefined,
    });
    expect(ctx.supabase.auth.updateUser).toHaveBeenCalledWith({
      password: 'my-own-password',
    });
    expect(setMustChangePassword).toHaveBeenCalledWith(TEST_USER.id, false);
  });

  it('maps same_password and weak_password', async () => {
    const ctx = authed([]);
    ctx.supabase.auth.updateUser.mockResolvedValueOnce({
      data: {},
      error: { code: 'same_password' },
    });
    expect(
      await changeOwnPasswordAction({ password: 'my-own-password' })
    ).toEqual({
      ok: false,
      error: 'SAME_PASSWORD',
    });
    ctx.supabase.auth.updateUser.mockResolvedValueOnce({
      data: {},
      error: { code: 'weak_password' },
    });
    expect(
      await changeOwnPasswordAction({ password: 'my-own-password' })
    ).toEqual({
      ok: false,
      error: 'WEAK_PASSWORD',
    });
    expect(setMustChangePassword).not.toHaveBeenCalled();
  });

  it('rejects short passwords without calling Supabase', async () => {
    const ctx = authed([]);
    expect(await changeOwnPasswordAction({ password: 'short' })).toEqual({
      ok: false,
      error: 'INVALID_INPUT',
    });
    expect(ctx.supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('throws when signed out', async () => {
    unauth();
    await expect(
      changeOwnPasswordAction({ password: 'my-own-password' })
    ).rejects.toThrow('Unauthorized');
  });
});
```

```ts
// src/app/admin/change-password/page.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/authz', () => ({ getCurrentAdmin: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('./ChangePasswordForm', () => ({ default: () => null }));

import ChangePasswordPage from './page';
import { getCurrentAdmin } from '@/lib/authz';
import { redirect } from 'next/navigation';

const user = { id: 'u', email: 'u@test.local' };

describe('ChangePasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [{ status: 'unauthenticated' }, '/admin'],
    [{ status: 'disabled', user }, '/admin?error=disabled'],
    [{ status: 'active', user }, '/admin/dashboard'],
  ])('redirects %o to %s', async (current, to) => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(current as never);
    await expect(ChangePasswordPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith(to);
  });

  it('renders the form while a change is required', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({
      status: 'must-change-password',
      user,
    } as never);
    const el = (await ChangePasswordPage()) as { props: { email: string } };
    expect(el.props.email).toBe('u@test.local');
  });
});
```

```tsx
// src/app/admin/change-password/ChangePasswordForm.test.tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn() }),
}));

const changeOwnPasswordAction = vi.fn();
vi.mock('@/actions/account', () => ({
  changeOwnPasswordAction: (...a: unknown[]) => changeOwnPasswordAction(...a),
}));

import ChangePasswordForm from './ChangePasswordForm';

async function fill(pw: string, confirm: string) {
  const user = userEvent.setup();
  renderAdmin(<ChangePasswordForm email="u@test.local" />);
  await user.type(screen.getByLabelText('New password'), pw);
  await user.type(screen.getByLabelText('Confirm new password'), confirm);
  await user.click(screen.getByRole('button', { name: 'Save password' }));
}

describe('ChangePasswordForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates length and match before calling the action', async () => {
    await fill('short', 'short');
    expect(screen.getByText('Use at least 12 characters.')).toBeInTheDocument();
    expect(changeOwnPasswordAction).not.toHaveBeenCalled();
  });

  it('shows a mismatch error', async () => {
    await fill('a-long-password-1', 'a-long-password-2');
    expect(screen.getByText('Passwords don’t match.')).toBeInTheDocument();
  });

  it('goes to the dashboard on success', async () => {
    changeOwnPasswordAction.mockResolvedValue({ ok: true, data: undefined });
    await fill('a-long-password-1', 'a-long-password-1');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/dashboard'));
    expect(changeOwnPasswordAction).toHaveBeenCalledWith({
      password: 'a-long-password-1',
    });
  });

  it('shows translated action errors', async () => {
    changeOwnPasswordAction.mockResolvedValue({
      ok: false,
      error: 'SAME_PASSWORD',
    });
    await fill('a-long-password-1', 'a-long-password-1');
    expect(
      await screen.findByText(
        'Choose a password different from your current one.'
      )
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `yarn vitest run --project unit src/actions/account.test.ts src/app/admin/change-password; yarn vitest run --project component src/app/admin/change-password`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/actions/account.ts`**

```ts
'use server';

import { requireActiveSession } from '@/lib/authz';
import { setMustChangePassword } from '@/lib/admin-users-repository';
import { changePasswordSchema } from '@/lib/validation/access';
import type { AccessResult } from '@/lib/access-types';

/**
 * Changes the signed-in user's own password. The only action allowed while
 * `mustChangePassword` is set (requirePermission rejects those users).
 */
export async function changeOwnPasswordAction(input: {
  password: string;
}): Promise<AccessResult> {
  const { supabase, user } = await requireActiveSession();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === 'same_password')
      return { ok: false, error: 'SAME_PASSWORD' };
    if (error.code === 'weak_password')
      return { ok: false, error: 'WEAK_PASSWORD' };
    console.error('[changeOwnPasswordAction]', error);
    return { ok: false, error: 'FAILED' };
  }
  await setMustChangePassword(user.id, false);
  return { ok: true, data: undefined };
}
```

- [ ] **Step 4: Implement the page**

```tsx
// src/app/admin/change-password/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/authz';
import ChangePasswordForm from './ChangePasswordForm';

export default async function ChangePasswordPage() {
  const current = await getCurrentAdmin();
  if (current.status === 'unauthenticated') redirect('/admin');
  if (current.status === 'disabled') redirect('/admin?error=disabled');
  if (current.status === 'active') redirect('/admin/dashboard');
  return <ChangePasswordForm email={current.user.email ?? ''} />;
}
```

- [ ] **Step 5: Implement the form**

```tsx
// src/app/admin/change-password/ChangePasswordForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { changeOwnPasswordAction } from '@/actions/account';
import { PASSWORD_MIN_LENGTH } from '@/lib/validation/access';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-primaryColor focus:outline-none focus:ring-3 focus:ring-primaryColor/15 transition-all';

export default function ChangePasswordForm({ email }: { email: string }) {
  const t = useTranslations('admin.changePassword');
  const tErrors = useTranslations('admin.access.errors');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(t('tooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('mismatch'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await changeOwnPasswordAction({ password });
      if (!res.ok) {
        setError(tErrors(res.error));
        return;
      }
      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError(tErrors('FAILED'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mb-8 text-sm text-slate-500">{t('subtitle')}</p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Lets password managers associate the new password with the account. */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            hidden
          />
          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {t('newPassword')}
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {t('confirmPassword')}
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="mt-2 w-full rounded-xl bg-primaryColor py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primaryHover disabled:opacity-60"
          >
            {saving ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
```

Note: the inputs use `required`, and `user.click` on submit in jsdom respects constraint validation only when both fields are non-empty — every test types into both fields, so the handler runs.

- [ ] **Step 6: Verify**

Run: `yarn vitest run --project unit src/actions/account.test.ts src/app/admin/change-password && yarn vitest run --project component src/app/admin/change-password && yarn type-check`
Expected: PASS.

- [ ] **Step 7: Leave uncommitted.** Do not commit.

---

### Task 15: Users page

**Files:**

- Create: `src/components/admin/access/AdminDialog.tsx`
- Create: `src/components/admin/access/RoleCheckboxes.tsx`
- Create: `src/components/admin/access/TempPasswordField.tsx`
- Create: `src/app/admin/(protected)/users/UsersClient.tsx`
- Create: `src/app/admin/(protected)/users/page.tsx`
- Test: `src/app/admin/(protected)/users/UsersClient.test.tsx`, `src/app/admin/(protected)/users/page.test.ts`

**Interfaces:**

- Consumes: user actions (Task 12); `listRolesAction` (Task 13); `getCurrentAdmin` (Task 6); `canAssignRole`, `canModifyUser` (Task 2); `actorToDTO`, `actorFromDTO`, `ActorDTO`, `AdminUserRow`, `RoleRow`, `AccessResult`, `AccessErrorCode` (Task 8); `generateTempPassword` (Task 11); `PermissionNeeded` (Task 8); messages `admin.users.*`, `admin.access.errors.*`.
- Produces:
  - `AdminDialog({ title: string; onClose(): void; children: React.ReactNode })` — renders nothing special beyond a modal; caller mounts/unmounts it.
  - `RoleCheckboxes({ roles: RoleRow[]; selected: string[]; onChange(ids: string[]): void; actor: Actor })` — a role the actor can't assign is disabled (can't be added or removed).
  - `TempPasswordField({ value: string; onChange(v: string): void })` — input + Generate + Copy.
  - `UsersClient({ users: AdminUserRow[]; roles: RoleRow[]; actor: ActorDTO })`

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/admin/(protected)/users/page.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/authz', () => ({ getCurrentAdmin: vi.fn() }));
vi.mock('@/actions/users', () => ({ listUsersAction: vi.fn() }));
vi.mock('@/actions/roles', () => ({ listRolesAction: vi.fn() }));
vi.mock('./UsersClient', () => ({ default: () => null }));
vi.mock('@/components/admin/PermissionNeeded', () => ({ default: () => null }));

import UsersPage from './page';
import { getCurrentAdmin } from '@/lib/authz';
import { listUsersAction } from '@/actions/users';
import { listRolesAction } from '@/actions/roles';
import PermissionNeeded from '@/components/admin/PermissionNeeded';

function active(perms: string[]) {
  vi.mocked(getCurrentAdmin).mockResolvedValue({
    status: 'active',
    user: { id: 'u' },
    actor: { userId: 'u', permissions: new Set(perms), isSuperAdmin: false },
  } as never);
}

describe('UsersPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows PermissionNeeded without users.view', async () => {
    active(['dashboard.view']);
    const el = (await UsersPage()) as { type: unknown };
    expect(el.type).toBe(PermissionNeeded);
    expect(listUsersAction).not.toHaveBeenCalled();
  });

  it('loads users and roles and passes a serializable actor', async () => {
    active(['users.view']);
    vi.mocked(listUsersAction).mockResolvedValue([]);
    vi.mocked(listRolesAction).mockResolvedValue([]);
    const el = (await UsersPage()) as {
      props: { actor: { permissions: string[] } };
    };
    expect(el.props.actor.permissions).toEqual(['users.view']);
  });
});
```

```tsx
// src/app/admin/(protected)/users/UsersClient.test.tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';
import type { ActorDTO, AdminUserRow, RoleRow } from '@/lib/access-types';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}));

const actions = {
  createUserAction: vi.fn(),
  resetPasswordAction: vi.fn(),
  setUserRolesAction: vi.fn(),
  disableUserAction: vi.fn(),
  enableUserAction: vi.fn(),
  deleteUserAction: vi.fn(),
};
vi.mock('@/actions/users', () => ({
  createUserAction: (...a: unknown[]) => actions.createUserAction(...a),
  resetPasswordAction: (...a: unknown[]) => actions.resetPasswordAction(...a),
  setUserRolesAction: (...a: unknown[]) => actions.setUserRolesAction(...a),
  disableUserAction: (...a: unknown[]) => actions.disableUserAction(...a),
  enableUserAction: (...a: unknown[]) => actions.enableUserAction(...a),
  deleteUserAction: (...a: unknown[]) => actions.deleteUserAction(...a),
}));

import UsersClient from './UsersClient';

const roles: RoleRow[] = [
  {
    id: 'r-super',
    key: 'super-admin',
    name: 'Super-admin',
    description: null,
    isSystem: true,
    permissions: [],
    userCount: 1,
  },
  {
    id: 'r-admin',
    key: 'admin',
    name: 'Admin',
    description: null,
    isSystem: false,
    permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    userCount: 1,
  },
  {
    id: 'r-marketing',
    key: 'marketing',
    name: 'Marketing',
    description: null,
    isSystem: false,
    permissions: DEFAULT_ROLE_PERMISSIONS.marketing,
    userCount: 0,
  },
];

function row(overrides: Partial<AdminUserRow>): AdminUserRow {
  return {
    id: 'x',
    email: 'x@test.local',
    displayName: null,
    disabled: false,
    mustChangePassword: false,
    isSuperAdmin: false,
    roleIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    lastSignInAt: null,
    ...overrides,
  };
}

const me = row({
  id: 'me',
  email: 'me@test.local',
  isSuperAdmin: true,
  roleIds: ['r-super'],
});
const boss = row({
  id: 'boss',
  email: 'boss@test.local',
  isSuperAdmin: true,
  roleIds: ['r-super'],
});
const writer = row({
  id: 'writer',
  email: 'writer@test.local',
  roleIds: ['r-marketing'],
});
const gone = row({ id: 'gone', email: 'gone@test.local', disabled: true });

const superActor: ActorDTO = {
  userId: 'me',
  permissions: ALL_PERMISSIONS,
  isSuperAdmin: true,
};
const adminActor: ActorDTO = {
  userId: 'me',
  permissions: DEFAULT_ROLE_PERMISSIONS.admin,
  isSuperAdmin: false,
};

function rowFor(email: string) {
  return screen.getByText(email).closest('tr') as HTMLElement;
}

describe('UsersClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows no actions on your own row', () => {
    renderAdmin(
      <UsersClient users={[me, writer]} roles={roles} actor={superActor} />
    );
    const mine = rowFor('me@test.local');
    expect(within(mine).getByText('You')).toBeInTheDocument();
    expect(within(mine).queryAllByRole('button')).toHaveLength(0);
    expect(
      within(rowFor('writer@test.local')).getByRole('button', {
        name: 'Disable',
      })
    ).toBeInTheDocument();
  });

  it('admins get no actions on super-admin rows and no Delete at all', () => {
    renderAdmin(
      <UsersClient users={[me, boss, gone]} roles={roles} actor={adminActor} />
    );
    expect(
      within(rowFor('boss@test.local')).queryAllByRole('button')
    ).toHaveLength(0);
    const goneRow = rowFor('gone@test.local');
    expect(
      within(goneRow).getByRole('button', { name: 'Enable' })
    ).toBeInTheDocument();
    expect(
      within(goneRow).queryByRole('button', { name: 'Delete' })
    ).toBeNull();
  });

  it('super-admins can delete disabled users only', () => {
    renderAdmin(
      <UsersClient
        users={[me, writer, gone]}
        roles={roles}
        actor={superActor}
      />
    );
    expect(
      within(rowFor('writer@test.local')).queryByRole('button', {
        name: 'Delete',
      })
    ).toBeNull();
    expect(
      within(rowFor('gone@test.local')).getByRole('button', { name: 'Delete' })
    ).toBeInTheDocument();
  });

  it('creates a user and shows the credentials once', async () => {
    actions.createUserAction.mockResolvedValue({
      ok: true,
      data: { id: 'new', email: 'new@test.local' },
    });
    const user = userEvent.setup();
    renderAdmin(<UsersClient users={[me]} roles={roles} actor={adminActor} />);
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Super-admin')).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Email'), 'new@test.local');
    await user.click(within(dialog).getByLabelText('Marketing'));
    const password = (
      within(dialog).getByLabelText('Temporary password') as HTMLInputElement
    ).value;
    expect(password).toHaveLength(16);
    await user.click(
      within(dialog).getByRole('button', { name: 'Create user' })
    );
    await waitFor(() =>
      expect(actions.createUserAction).toHaveBeenCalledWith({
        email: 'new@test.local',
        displayName: '',
        password,
        roleIds: ['r-marketing'],
      })
    );
    expect(
      await screen.findByText('Share these credentials')
    ).toBeInTheDocument();
    expect(screen.getByText(password)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it('shows translated errors from actions', async () => {
    actions.disableUserAction.mockResolvedValue({
      ok: false,
      error: 'BAN_FAILED',
    });
    const user = userEvent.setup();
    renderAdmin(
      <UsersClient users={[me, writer]} roles={roles} actor={superActor} />
    );
    await user.click(
      within(rowFor('writer@test.local')).getByRole('button', {
        name: 'Disable',
      })
    );
    expect(
      await screen.findByText(
        'Access was disabled here, but blocking sign-in in Supabase failed. Try again.'
      )
    ).toBeInTheDocument();
  });

  it('delete requires typing the email', async () => {
    actions.deleteUserAction.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    renderAdmin(
      <UsersClient users={[me, gone]} roles={roles} actor={superActor} />
    );
    await user.click(
      within(rowFor('gone@test.local')).getByRole('button', { name: 'Delete' })
    );
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', {
      name: 'Delete permanently',
    });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox'), 'gone@test.local');
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() =>
      expect(actions.deleteUserAction).toHaveBeenCalledWith({ userId: 'gone' })
    );
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `yarn vitest run --project unit "src/app/admin/(protected)/users"; yarn vitest run --project component "src/app/admin/(protected)/users"`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/components/admin/access/AdminDialog.tsx`**

```tsx
'use client';

import { useEffect, useId } from 'react';
import { X } from 'lucide-react';

export default function AdminDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `src/components/admin/access/RoleCheckboxes.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { canAssignRole, type Actor } from '@/lib/authz-rules';
import type { RoleRow } from '@/lib/access-types';

export default function RoleCheckboxes({
  roles,
  selected,
  onChange,
  actor,
}: {
  roles: RoleRow[];
  selected: string[];
  onChange: (ids: string[]) => void;
  actor: Actor;
}) {
  const t = useTranslations('admin.users.dialog');
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('roles')}
      </legend>
      {roles.map((role) => {
        // Adding and removing both need canAssignRole (no escalation).
        const assignable = canAssignRole(actor, role);
        const checked = selected.includes(role.id);
        return (
          <label
            key={role.id}
            title={assignable ? undefined : t('roleNotAssignable')}
            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${
              assignable
                ? 'cursor-pointer border-slate-200 hover:bg-slate-50'
                : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={checked}
              disabled={!assignable}
              onChange={() =>
                onChange(
                  checked
                    ? selected.filter((id) => id !== role.id)
                    : [...selected, role.id]
                )
              }
            />
            <span>
              <span className="block font-medium">{role.name}</span>
              {role.description && (
                <span className="block text-xs text-slate-500">
                  {role.description}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
```

Note: the checkbox's accessible name comes from the whole label, which includes the description. The seeded test roles have `description: null`, so `getByLabelText('Marketing')` matches exactly.

- [ ] **Step 5: Implement `src/components/admin/access/TempPasswordField.tsx`**

```tsx
'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { generateTempPassword } from '@/lib/temp-password';

export default function TempPasswordField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('admin.users.dialog');
  const id = useId();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        {t('tempPassword')}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setCopied(false);
          }}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15"
        />
        <button
          type="button"
          onClick={() => {
            onChange(generateTempPassword());
            setCopied(false);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {t('generate')}
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement `src/app/admin/(protected)/users/UsersClient.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { UserPlus } from 'lucide-react';
import AdminDialog from '@/components/admin/access/AdminDialog';
import RoleCheckboxes from '@/components/admin/access/RoleCheckboxes';
import TempPasswordField from '@/components/admin/access/TempPasswordField';
import {
  createUserAction,
  deleteUserAction,
  disableUserAction,
  enableUserAction,
  resetPasswordAction,
  setUserRolesAction,
} from '@/actions/users';
import { canModifyUser } from '@/lib/authz-rules';
import {
  actorFromDTO,
  type AccessErrorCode,
  type AccessResult,
  type ActorDTO,
  type AdminUserRow,
  type RoleRow,
} from '@/lib/access-types';
import { generateTempPassword } from '@/lib/temp-password';

type Dialog =
  | { kind: 'add' }
  | { kind: 'roles'; user: AdminUserRow }
  | { kind: 'reset'; user: AdminUserRow }
  | { kind: 'delete'; user: AdminUserRow }
  | { kind: 'credentials'; email: string; password: string }
  | null;

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15';
const primaryButton =
  'rounded-lg bg-primaryColor px-3.5 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-50';
const secondaryButton =
  'rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50';
const rowButton =
  'rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50';

export default function UsersClient({
  users,
  roles,
  actor: actorDTO,
}: {
  users: AdminUserRow[];
  roles: RoleRow[];
  actor: ActorDTO;
}) {
  const t = useTranslations('admin.users');
  const tErrors = useTranslations('admin.access.errors');
  const locale = useLocale();
  const router = useRouter();
  const actor = useMemo(() => actorFromDTO(actorDTO), [actorDTO]);
  const can = (p: Parameters<typeof actor.permissions.has>[0]) =>
    actor.permissions.has(p);
  const roleNames = useMemo(
    () => new Map(roles.map((r) => [r.id, r.name])),
    [roles]
  );

  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<AccessErrorCode | null>(null);
  const [busy, setBusy] = useState(false);

  // Form state for dialogs (reset whenever a dialog opens).
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState('');

  function open(next: Exclude<Dialog, null>) {
    setError(null);
    setEmail('');
    setDisplayName('');
    setPassword(generateTempPassword());
    setRoleIds(next.kind === 'roles' ? next.user.roleIds : []);
    setConfirmText('');
    setDialog(next);
  }

  async function run<T>(
    action: () => Promise<AccessResult<T>>,
    onOk: (data: T) => void = () => setDialog(null)
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await action();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onOk(res.data);
      router.refresh();
    } catch {
      // requirePermission throws when permissions changed since page load.
      setError('FORBIDDEN');
    } finally {
      setBusy(false);
    }
  }

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale) : t('never');

  const errorBox = error && (
    <p
      role="alert"
      className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {tErrors(error)}
    </p>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {t('pageTitle')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t('pageSubtitle')}</p>
        </div>
        {can('users.create') && (
          <button
            type="button"
            onClick={() => open({ kind: 'add' })}
            className={`${primaryButton} inline-flex items-center gap-2`}
          >
            <UserPlus className="h-4 w-4" />
            {t('addUser')}
          </button>
        )}
      </div>

      {dialog === null && errorBox}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">{t('columns.user')}</th>
              <th className="px-4 py-3 font-semibold">{t('columns.roles')}</th>
              <th className="px-4 py-3 font-semibold">{t('columns.status')}</th>
              <th className="px-4 py-3 font-semibold">
                {t('columns.lastSignIn')}
              </th>
              <th className="px-4 py-3 font-semibold">
                {t('columns.created')}
              </th>
              <th className="px-4 py-3 text-right font-semibold">
                {t('columns.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const isMe = u.id === actor.userId;
              const modifiable = canModifyUser(actor, {
                id: u.id,
                isSuperAdmin: u.isSuperAdmin,
              });
              return (
                <tr key={u.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {u.email}
                      </span>
                      {isMe && (
                        <span className="rounded-full bg-primaryColor/10 px-2 py-0.5 text-[10px] font-semibold text-primaryColor">
                          {t('you')}
                        </span>
                      )}
                    </div>
                    {u.displayName && (
                      <div className="text-xs text-slate-500">
                        {u.displayName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.roleIds.length === 0 ? (
                      <span className="text-xs text-slate-400">
                        {t('noRoles')}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.roleIds.map((id) => (
                          <span
                            key={id}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                          >
                            {roleNames.get(id) ?? id}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.disabled
                          ? 'bg-red-50 text-red-700'
                          : u.mustChangePassword
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {u.disabled
                        ? t('status.disabled')
                        : u.mustChangePassword
                          ? t('status.mustChangePassword')
                          : t('status.active')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(u.lastSignInAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {modifiable && (
                      <div className="flex flex-wrap justify-end gap-1">
                        {can('users.assign-roles') && (
                          <button
                            type="button"
                            className={rowButton}
                            onClick={() => open({ kind: 'roles', user: u })}
                          >
                            {t('actions.editRoles')}
                          </button>
                        )}
                        {can('users.create') && (
                          <button
                            type="button"
                            className={rowButton}
                            onClick={() => open({ kind: 'reset', user: u })}
                          >
                            {t('actions.resetPassword')}
                          </button>
                        )}
                        {can('users.disable') &&
                          (u.disabled ? (
                            <button
                              type="button"
                              className={rowButton}
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  enableUserAction({ userId: u.id })
                                )
                              }
                            >
                              {t('actions.enable')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`${rowButton} text-amber-700`}
                              disabled={busy}
                              onClick={() => {
                                if (
                                  !confirm(
                                    t('dialog.disableConfirm', {
                                      email: u.email,
                                    })
                                  )
                                )
                                  return;
                                void run(() =>
                                  disableUserAction({ userId: u.id })
                                );
                              }}
                            >
                              {t('actions.disable')}
                            </button>
                          ))}
                        {can('users.delete') && u.disabled && (
                          <button
                            type="button"
                            className={`${rowButton} text-red-600`}
                            onClick={() => open({ kind: 'delete', user: u })}
                          >
                            {t('actions.delete')}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dialog?.kind === 'add' && (
        <AdminDialog
          title={t('dialog.addTitle')}
          onClose={() => setDialog(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const submitted = password;
              void run(
                () =>
                  createUserAction({
                    email,
                    displayName,
                    password: submitted,
                    roleIds,
                  }),
                (data) =>
                  setDialog({
                    kind: 'credentials',
                    email: data.email,
                    password: submitted,
                  })
              );
            }}
          >
            {errorBox}
            <div>
              <label htmlFor="new-user-email" className={labelClass}>
                {t('dialog.email')}
              </label>
              <input
                id="new-user-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="new-user-name" className={labelClass}>
                {t('dialog.displayName')}
              </label>
              <input
                id="new-user-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
              />
            </div>
            <TempPasswordField value={password} onChange={setPassword} />
            <RoleCheckboxes
              roles={roles}
              selected={roleIds}
              onChange={setRoleIds}
              actor={actor}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={secondaryButton}
                onClick={() => setDialog(null)}
              >
                {t('dialog.cancel')}
              </button>
              <button type="submit" className={primaryButton} disabled={busy}>
                {busy ? t('dialog.saving') : t('dialog.create')}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}

      {dialog?.kind === 'roles' && (
        <AdminDialog
          title={t('dialog.editRolesTitle', { email: dialog.user.email })}
          onClose={() => setDialog(null)}
        >
          {errorBox}
          <RoleCheckboxes
            roles={roles}
            selected={roleIds}
            onChange={setRoleIds}
            actor={actor}
          />
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => setDialog(null)}
            >
              {t('dialog.cancel')}
            </button>
            <button
              type="button"
              className={primaryButton}
              disabled={busy}
              onClick={() =>
                void run(() =>
                  setUserRolesAction({ userId: dialog.user.id, roleIds })
                )
              }
            >
              {busy ? t('dialog.saving') : t('dialog.save')}
            </button>
          </div>
        </AdminDialog>
      )}

      {dialog?.kind === 'reset' && (
        <AdminDialog
          title={t('dialog.resetTitle', { email: dialog.user.email })}
          onClose={() => setDialog(null)}
        >
          {errorBox}
          <TempPasswordField value={password} onChange={setPassword} />
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => setDialog(null)}
            >
              {t('dialog.cancel')}
            </button>
            <button
              type="button"
              className={primaryButton}
              disabled={busy}
              onClick={() => {
                const submitted = password;
                const target = dialog.user;
                void run(
                  () =>
                    resetPasswordAction({
                      userId: target.id,
                      password: submitted,
                    }),
                  () =>
                    setDialog({
                      kind: 'credentials',
                      email: target.email,
                      password: submitted,
                    })
                );
              }}
            >
              {busy ? t('dialog.saving') : t('dialog.reset')}
            </button>
          </div>
        </AdminDialog>
      )}

      {dialog?.kind === 'delete' && (
        <AdminDialog
          title={t('dialog.deleteTitle', { email: dialog.user.email })}
          onClose={() => setDialog(null)}
        >
          {errorBox}
          <p className="mb-3 text-sm text-slate-600">
            {t('dialog.deleteHint')}
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={dialog.user.email}
            className={inputClass}
          />
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => setDialog(null)}
            >
              {t('dialog.cancel')}
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              disabled={busy || confirmText.trim() !== dialog.user.email}
              onClick={() =>
                void run(() => deleteUserAction({ userId: dialog.user.id }))
              }
            >
              {t('dialog.deleteCta')}
            </button>
          </div>
        </AdminDialog>
      )}

      {dialog?.kind === 'credentials' && (
        <AdminDialog
          title={t('dialog.credentialsTitle')}
          onClose={() => setDialog(null)}
        >
          <p className="mb-4 text-sm text-slate-600">
            {t('dialog.credentialsHint')}
          </p>
          <dl className="space-y-2 rounded-lg bg-slate-50 p-3 font-mono text-sm">
            <div>
              <dt className="text-xs text-slate-500">{t('dialog.email')}</dt>
              <dd>{dialog.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">
                {t('dialog.tempPassword')}
              </dt>
              <dd>{dialog.password}</dd>
            </div>
          </dl>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              className={secondaryButton}
              onClick={() =>
                void navigator.clipboard?.writeText(
                  `${dialog.email}\n${dialog.password}`
                )
              }
            >
              {t('dialog.copy')}
            </button>
            <button
              type="button"
              className={primaryButton}
              onClick={() => setDialog(null)}
            >
              {t('dialog.done')}
            </button>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Implement the page**

```tsx
// src/app/admin/(protected)/users/page.tsx
import PermissionNeeded from '@/components/admin/PermissionNeeded';
import { listRolesAction } from '@/actions/roles';
import { listUsersAction } from '@/actions/users';
import { actorToDTO } from '@/lib/access-types';
import { getCurrentAdmin } from '@/lib/authz';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const current = await getCurrentAdmin();
  if (
    current.status !== 'active' ||
    !current.actor.permissions.has('users.view')
  ) {
    return <PermissionNeeded permission="users.view" />;
  }
  const [users, roles] = await Promise.all([
    listUsersAction(),
    listRolesAction(),
  ]);
  return (
    <UsersClient
      users={users}
      roles={roles}
      actor={actorToDTO(current.actor)}
    />
  );
}
```

- [ ] **Step 8: Verify**

Run: `yarn vitest run --project unit "src/app/admin/(protected)/users" && yarn vitest run --project component "src/app/admin/(protected)/users" && yarn type-check && yarn lint`
Expected: PASS. Run `yarn format` on the new files (the code above is compacted in places; Prettier will reflow it).

- [ ] **Step 9: Leave uncommitted.** Do not commit.

---

### Task 16: Roles page

**Files:**

- Create: `src/app/admin/(protected)/roles/RolesClient.tsx`
- Create: `src/app/admin/(protected)/roles/page.tsx`
- Test: `src/app/admin/(protected)/roles/RolesClient.test.tsx`, `src/app/admin/(protected)/roles/page.test.ts`

**Interfaces:**

- Consumes: role actions (Task 13); `getCurrentAdmin` (Task 6); `canEditRole`, `canDeleteRole`, `holdsAll` (Task 2); `ALL_PERMISSIONS`, `PERMISSIONS`, `PERMISSION_GROUPS`, `permissionMessageKey`, `Permission` (Task 1); `actorToDTO`, `actorFromDTO`, `ActorDTO`, `RoleRow`, `AccessErrorCode`, `AccessResult` (Task 8); `AdminDialog` (Task 15); `PermissionNeeded` (Task 8); messages `admin.roles.*`, `admin.access.*`.
- Produces: `RolesClient({ roles: RoleRow[]; actor: ActorDTO })`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/admin/(protected)/roles/page.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/authz', () => ({ getCurrentAdmin: vi.fn() }));
vi.mock('@/actions/roles', () => ({ listRolesAction: vi.fn() }));
vi.mock('./RolesClient', () => ({ default: () => null }));
vi.mock('@/components/admin/PermissionNeeded', () => ({ default: () => null }));

import RolesPage from './page';
import { getCurrentAdmin } from '@/lib/authz';
import { listRolesAction } from '@/actions/roles';
import PermissionNeeded from '@/components/admin/PermissionNeeded';

function active(perms: string[]) {
  vi.mocked(getCurrentAdmin).mockResolvedValue({
    status: 'active',
    user: { id: 'u' },
    actor: { userId: 'u', permissions: new Set(perms), isSuperAdmin: false },
  } as never);
}

describe('RolesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows PermissionNeeded without roles.manage', async () => {
    active(['users.view']);
    const el = (await RolesPage()) as { type: unknown };
    expect(el.type).toBe(PermissionNeeded);
    expect(listRolesAction).not.toHaveBeenCalled();
  });

  it('loads roles with roles.manage', async () => {
    active(['roles.manage']);
    vi.mocked(listRolesAction).mockResolvedValue([]);
    await RolesPage();
    expect(listRolesAction).toHaveBeenCalled();
  });
});
```

```tsx
// src/app/admin/(protected)/roles/RolesClient.test.tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';
import type { ActorDTO, RoleRow } from '@/lib/access-types';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}));

const createRoleAction = vi.fn();
const updateRoleAction = vi.fn();
const deleteRoleAction = vi.fn();
vi.mock('@/actions/roles', () => ({
  createRoleAction: (...a: unknown[]) => createRoleAction(...a),
  updateRoleAction: (...a: unknown[]) => updateRoleAction(...a),
  deleteRoleAction: (...a: unknown[]) => deleteRoleAction(...a),
}));

import RolesClient from './RolesClient';

const roles: RoleRow[] = [
  {
    id: 'r-super',
    key: 'super-admin',
    name: 'Super-admin',
    description: 'Everything',
    isSystem: true,
    permissions: [],
    userCount: 1,
  },
  {
    id: 'r-marketing',
    key: 'marketing',
    name: 'Marketing',
    description: null,
    isSystem: false,
    permissions: DEFAULT_ROLE_PERMISSIONS.marketing,
    userCount: 3,
  },
];

const adminActor: ActorDTO = {
  userId: 'me',
  permissions: DEFAULT_ROLE_PERMISSIONS.admin,
  isSuperAdmin: false,
};

function card(name: string) {
  return screen.getByRole('heading', { name }).closest('li') as HTMLElement;
}

describe('RolesClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows super-admin as locked with no edit or delete', () => {
    renderAdmin(<RolesClient roles={roles} actor={adminActor} />);
    const superCard = card('Super-admin');
    expect(within(superCard).getByText('Locked')).toBeInTheDocument();
    expect(within(superCard).getByText('All permissions')).toBeInTheDocument();
    expect(within(superCard).queryByRole('button')).toBeNull();
    expect(within(card('Marketing')).getByText('3 users')).toBeInTheDocument();
  });

  it('creates a role; permissions the actor lacks are disabled', async () => {
    createRoleAction.mockResolvedValue({ ok: true, data: { id: 'new' } });
    const user = userEvent.setup();
    renderAdmin(<RolesClient roles={roles} actor={adminActor} />);
    await user.click(screen.getByRole('button', { name: 'New role' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('checkbox', { name: /Delete users/ })
    ).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Name'), 'Editor');
    await user.type(within(dialog).getByLabelText('Key'), 'editor');
    await user.click(
      within(dialog).getByRole('checkbox', { name: /Edit articles/ })
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save role' }));
    await waitFor(() =>
      expect(createRoleAction).toHaveBeenCalledWith({
        key: 'editor',
        name: 'Editor',
        description: '',
        permissions: ['articles.edit'],
      })
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('edits a role without a key field', async () => {
    updateRoleAction.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    renderAdmin(<RolesClient roles={roles} actor={adminActor} />);
    await user.click(
      within(card('Marketing')).getByRole('button', { name: 'Edit' })
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText('Key')).toBeNull();
    expect(
      within(dialog).getByRole('checkbox', { name: /Publish articles/ })
    ).toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: 'Save role' }));
    await waitFor(() =>
      expect(updateRoleAction).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: 'r-marketing', name: 'Marketing' })
      )
    );
  });

  it('confirms before deleting and shows translated errors', async () => {
    deleteRoleAction.mockResolvedValue({ ok: false, error: 'FORBIDDEN' });
    const user = userEvent.setup();
    renderAdmin(<RolesClient roles={roles} actor={adminActor} />);
    await user.click(
      within(card('Marketing')).getByRole('button', { name: 'Delete' })
    );
    expect(window.confirm).toHaveBeenCalledWith(
      'Delete the role “Marketing”? It will be removed from 3 users.'
    );
    expect(
      await screen.findByText('You don’t have permission to do that.')
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `yarn vitest run --project unit "src/app/admin/(protected)/roles"; yarn vitest run --project component "src/app/admin/(protected)/roles"`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/app/admin/(protected)/roles/RolesClient.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock, Plus } from 'lucide-react';
import AdminDialog from '@/components/admin/access/AdminDialog';
import {
  createRoleAction,
  deleteRoleAction,
  updateRoleAction,
} from '@/actions/roles';
import { canDeleteRole, canEditRole, holdsAll } from '@/lib/authz-rules';
import {
  actorFromDTO,
  type AccessErrorCode,
  type AccessResult,
  type ActorDTO,
  type RoleRow,
} from '@/lib/access-types';
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_GROUPS,
  isPermission,
  permissionMessageKey,
  type Permission,
} from '@/lib/permissions';

type Editor = { mode: 'create' } | { mode: 'edit'; role: RoleRow } | null;

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15';

export default function RolesClient({
  roles,
  actor: actorDTO,
}: {
  roles: RoleRow[];
  actor: ActorDTO;
}) {
  const t = useTranslations('admin.roles');
  const tAccess = useTranslations('admin.access');
  const router = useRouter();
  const actor = useMemo(() => actorFromDTO(actorDTO), [actorDTO]);

  const [editor, setEditor] = useState<Editor>(null);
  const [error, setError] = useState<AccessErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);

  function openEditor(next: Exclude<Editor, null>) {
    setError(null);
    setName(next.mode === 'edit' ? next.role.name : '');
    setKey('');
    setDescription(next.mode === 'edit' ? (next.role.description ?? '') : '');
    setPermissions(
      next.mode === 'edit' ? next.role.permissions.filter(isPermission) : []
    );
    setEditor(next);
  }

  async function run(
    action: () => Promise<AccessResult<unknown>>,
    onOk: () => void
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await action();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onOk();
      router.refresh();
    } catch {
      setError('FORBIDDEN');
    } finally {
      setBusy(false);
    }
  }

  const label = (p: Permission) =>
    tAccess(`permissions.${permissionMessageKey(p)}.label`);

  const errorBox = error && (
    <p
      role="alert"
      className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {tAccess(`errors.${error}`)}
    </p>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {t('pageTitle')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t('pageSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => openEditor({ mode: 'create' })}
          className="inline-flex items-center gap-2 rounded-lg bg-primaryColor px-3.5 py-2 text-sm font-semibold text-white hover:bg-primaryHover"
        >
          <Plus className="h-4 w-4" />
          {t('newRole')}
        </button>
      </div>

      {editor === null && errorBox}

      <ul className="grid gap-3 md:grid-cols-2">
        {roles.map((role) => {
          const editable = canEditRole(actor, role, role.permissions);
          const deletable = canDeleteRole(actor, role);
          return (
            <li
              key={role.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900">{role.name}</h2>
                  <p className="font-mono text-xs text-slate-400">{role.key}</p>
                </div>
                {role.isSystem ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    <Lock className="h-3 w-3" />
                    {t('locked')}
                  </span>
                ) : (
                  <div className="flex gap-1">
                    {editable && (
                      <button
                        type="button"
                        onClick={() => openEditor({ mode: 'edit', role })}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        {t('edit')}
                      </button>
                    )}
                    {deletable && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            !confirm(
                              t('deleteConfirm', {
                                name: role.name,
                                count: role.userCount,
                              })
                            )
                          )
                            return;
                          void run(
                            () => deleteRoleAction({ roleId: role.id }),
                            () => {}
                          );
                        }}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {t('delete')}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {role.description && (
                <p className="mt-2 text-sm text-slate-600">
                  {role.description}
                </p>
              )}
              <p className="mt-3 text-xs text-slate-500">
                <span>
                  {role.isSystem
                    ? t('allPermissions')
                    : t('permissionsCount', {
                        count: role.permissions.filter(isPermission).length,
                      })}
                </span>
                {' · '}
                <span>{t('usersCount', { count: role.userCount })}</span>
              </p>
            </li>
          );
        })}
      </ul>

      {editor && (
        <AdminDialog
          title={
            editor.mode === 'create'
              ? t('editor.createTitle')
              : t('editor.editTitle')
          }
          onClose={() => setEditor(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  editor.mode === 'create'
                    ? createRoleAction({ key, name, description, permissions })
                    : updateRoleAction({
                        roleId: editor.role.id,
                        name,
                        description,
                        permissions,
                      }),
                () => setEditor(null)
              );
            }}
          >
            {errorBox}
            <div>
              <label htmlFor="role-name" className={labelClass}>
                {t('editor.name')}
              </label>
              <input
                id="role-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            {editor.mode === 'create' && (
              <div>
                <label htmlFor="role-key" className={labelClass}>
                  {t('editor.key')}
                </label>
                <input
                  id="role-key"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
                <p className="mt-1 text-xs text-slate-400">
                  {t('editor.keyHint')}
                </p>
              </div>
            )}
            <div>
              <label htmlFor="role-description" className={labelClass}>
                {t('editor.description')}
              </label>
              <input
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
            <fieldset>
              <legend className={labelClass}>{t('editor.permissions')}</legend>
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group}>
                    <p className="mb-1.5 text-sm font-semibold text-slate-800">
                      {tAccess(`groups.${group}`)}
                    </p>
                    <div className="space-y-1.5">
                      {ALL_PERMISSIONS.filter(
                        (p) => PERMISSIONS[p].group === group
                      ).map((p) => {
                        const held = holdsAll(actor, [p]);
                        const checked = permissions.includes(p);
                        return (
                          <label
                            key={p}
                            title={held ? undefined : t('editor.notHeld')}
                            className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                              held
                                ? 'cursor-pointer hover:bg-slate-50'
                                : 'cursor-not-allowed text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={checked}
                              disabled={!held}
                              onChange={() =>
                                setPermissions(
                                  checked
                                    ? permissions.filter((x) => x !== p)
                                    : [...permissions, p]
                                )
                              }
                            />
                            <span>
                              <span className="block font-medium">
                                {label(p)}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {tAccess(
                                  `permissions.${permissionMessageKey(p)}.description`
                                )}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                {t('editor.cancel')}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primaryColor px-3.5 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-50"
              >
                {busy ? t('editor.saving') : t('editor.save')}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}
    </div>
  );
}
```

The "Edit" button is hidden for roles the actor can't fully hold (`canEditRole` with the role's current permissions), matching rule 3. Permission checkbox names include the description, which is why the tests match them with regexes.

- [ ] **Step 4: Implement the page**

```tsx
// src/app/admin/(protected)/roles/page.tsx
import PermissionNeeded from '@/components/admin/PermissionNeeded';
import { listRolesAction } from '@/actions/roles';
import { actorToDTO } from '@/lib/access-types';
import { getCurrentAdmin } from '@/lib/authz';
import RolesClient from './RolesClient';

export default async function RolesPage() {
  const current = await getCurrentAdmin();
  if (
    current.status !== 'active' ||
    !current.actor.permissions.has('roles.manage')
  ) {
    return <PermissionNeeded permission="roles.manage" />;
  }
  const roles = await listRolesAction();
  return <RolesClient roles={roles} actor={actorToDTO(current.actor)} />;
}
```

- [ ] **Step 5: Verify**

Run: `yarn vitest run --project unit "src/app/admin/(protected)/roles" && yarn vitest run --project component "src/app/admin/(protected)/roles" && yarn type-check && yarn lint && yarn format`
Expected: PASS.

- [ ] **Step 6: Leave uncommitted.** Do not commit.

---

### Task 17: Bootstrap existing Supabase users

**Files:**

- Create: `src/lib/admin-bootstrap-plan.ts`
- Create: `scripts/bootstrap-admin-users.ts`
- Modify: `package.json` (add `db:bootstrap-admins` script)
- Test: `src/lib/admin-bootstrap-plan.test.ts`

**Interfaces:**

- Consumes: `AuthUserSummary`, `listAuthUsers` (Task 11, `admin-core` — not the `server-only` re-export); `SUPER_ADMIN_ROLE_KEY` (Task 1); Prisma models (Task 4).
- Produces:
  - `BOOTSTRAP_SUPER_ADMIN_EMAIL = 'bivav.r.s@cosbe.inc'`
  - `class BootstrapError extends Error`
  - `type BootstrapPlan = { newRows: { id: string; email: string; disabled: boolean }[]; superAdminUserId: string; adminRoleUserIds: string[]; skippedWithoutEmail: string[] }`
  - `planBootstrap(input: { authUsers: AuthUserSummary[]; existingUserIds: ReadonlySet<string>; userIdsWithRoles: ReadonlySet<string>; superAdminEmail: string }): BootstrapPlan` — throws `BootstrapError` if the super-admin email is not among the auth users.
  - CLI: `yarn db:bootstrap-admins [--dry-run] [--force] [--super-admin <email>]`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/admin-bootstrap-plan.test.ts
import { describe, expect, it } from 'vitest';
import { BootstrapError, planBootstrap } from './admin-bootstrap-plan';

const auth = (id: string, email: string | null, banned = false) => ({
  id,
  email,
  lastSignInAt: null,
  banned,
});

describe('planBootstrap', () => {
  const authUsers = [
    auth('me', 'Bivav.R.S@cosbe.inc'),
    auth('a', 'a@cosbe.inc'),
    auth('b', 'b@cosbe.inc', true),
    auth('c', 'c@cosbe.inc'),
    auth('phone', null),
  ];

  it('creates missing rows, mirrors bans, and assigns roles', () => {
    const plan = planBootstrap({
      authUsers,
      existingUserIds: new Set(['c']),
      userIdsWithRoles: new Set(['c']),
      superAdminEmail: 'bivav.r.s@cosbe.inc',
    });
    expect(plan.newRows).toEqual([
      { id: 'me', email: 'bivav.r.s@cosbe.inc', disabled: false },
      { id: 'a', email: 'a@cosbe.inc', disabled: false },
      { id: 'b', email: 'b@cosbe.inc', disabled: true },
    ]);
    expect(plan.superAdminUserId).toBe('me');
    // c already has roles; the super-admin is not also made Admin.
    expect(plan.adminRoleUserIds).toEqual(['a', 'b']);
    expect(plan.skippedWithoutEmail).toEqual(['phone']);
  });

  it('gives Admin to existing rows that have no roles (auto-provisioned)', () => {
    const plan = planBootstrap({
      authUsers,
      existingUserIds: new Set(['a']),
      userIdsWithRoles: new Set(),
      superAdminEmail: 'bivav.r.s@cosbe.inc',
    });
    expect(plan.newRows.map((r) => r.id)).not.toContain('a');
    expect(plan.adminRoleUserIds).toContain('a');
  });

  it('aborts when the super-admin email is missing', () => {
    expect(() =>
      planBootstrap({
        authUsers: [auth('a', 'a@cosbe.inc')],
        existingUserIds: new Set(),
        userIdsWithRoles: new Set(),
        superAdminEmail: 'bivav.r.s@cosbe.inc',
      })
    ).toThrow(BootstrapError);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `yarn vitest run --project unit src/lib/admin-bootstrap-plan.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/admin-bootstrap-plan.ts`**

```ts
import type { AuthUserSummary } from '@/lib/supabase/admin-core';

export const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'bivav.r.s@cosbe.inc';

export class BootstrapError extends Error {}

export type BootstrapPlan = {
  newRows: { id: string; email: string; disabled: boolean }[];
  superAdminUserId: string;
  adminRoleUserIds: string[];
  skippedWithoutEmail: string[];
};

/**
 * Pure planning step for `yarn db:bootstrap-admins`: existing Supabase users
 * were all admins before roles existed, so they get the Admin role; the
 * configured email gets Super-admin. Existing rows and roles are never changed.
 */
export function planBootstrap(input: {
  authUsers: AuthUserSummary[];
  existingUserIds: ReadonlySet<string>;
  userIdsWithRoles: ReadonlySet<string>;
  superAdminEmail: string;
}): BootstrapPlan {
  const target = input.superAdminEmail.trim().toLowerCase();
  const withEmail = input.authUsers.filter((u) => u.email);
  const skippedWithoutEmail = input.authUsers
    .filter((u) => !u.email)
    .map((u) => u.id);

  const superAdmin = withEmail.find((u) => u.email!.toLowerCase() === target);
  if (!superAdmin) {
    throw new BootstrapError(
      `No Supabase Auth user with email ${target}. Nothing was written.`
    );
  }

  return {
    newRows: withEmail
      .filter((u) => !input.existingUserIds.has(u.id))
      .map((u) => ({
        id: u.id,
        email: u.email!.toLowerCase(),
        disabled: u.banned,
      })),
    superAdminUserId: superAdmin.id,
    adminRoleUserIds: withEmail
      .filter(
        (u) => u.id !== superAdmin.id && !input.userIdsWithRoles.has(u.id)
      )
      .map((u) => u.id),
    skippedWithoutEmail,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run --project unit src/lib/admin-bootstrap-plan.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `scripts/bootstrap-admin-users.ts`**

```ts
/**
 * Bootstrap admin_users / user_roles from existing Supabase Auth users.
 *
 * - Every Supabase user without a row gets one (banned users are imported as disabled).
 * - BOOTSTRAP_SUPER_ADMIN_EMAIL (or --super-admin <email>) gets Super-admin.
 * - Every other user with no roles gets Admin (they were all admins before roles existed).
 * - Refuses to run once a super-admin exists, unless --force.
 *
 * Usage (from repo root; DATABASE_URL + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set):
 *   yarn db:bootstrap-admins --dry-run
 *   yarn db:bootstrap-admins
 */

import { loadEnvConfig } from '@next/env';
import { prisma } from '../src/lib/prisma';
import { listAuthUsers } from '../src/lib/supabase/admin-core';
import {
  BOOTSTRAP_SUPER_ADMIN_EMAIL,
  BootstrapError,
  planBootstrap,
} from '../src/lib/admin-bootstrap-plan';
import { SUPER_ADMIN_ROLE_KEY } from '../src/lib/permissions';

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  loadEnvConfig(process.cwd());
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');
  const superAdminEmail =
    argValue('--super-admin') ?? BOOTSTRAP_SUPER_ADMIN_EMAIL;

  const [superRole, adminRole] = await Promise.all([
    prisma.role.findUnique({ where: { key: SUPER_ADMIN_ROLE_KEY } }),
    prisma.role.findUnique({ where: { key: 'admin' } }),
  ]);
  if (!superRole || !adminRole) {
    throw new BootstrapError(
      'Default roles are missing. Run `yarn db:deploy` first.'
    );
  }

  const existingSuperAdmins = await prisma.userRole.count({
    where: { roleId: superRole.id },
  });
  if (existingSuperAdmins > 0 && !force) {
    throw new BootstrapError(
      'A super-admin already exists, so bootstrap has already run. Re-running would give Admin to users who are meant to have no roles. Pass --force if you really mean it.'
    );
  }

  const [authUsers, rows] = await Promise.all([
    listAuthUsers(),
    prisma.adminUser.findMany({
      select: { id: true, _count: { select: { roles: true } } },
    }),
  ]);

  const plan = planBootstrap({
    authUsers,
    existingUserIds: new Set(rows.map((r) => r.id)),
    userIdsWithRoles: new Set(
      rows.filter((r) => r._count.roles > 0).map((r) => r.id)
    ),
    superAdminEmail,
  });

  const emailById = new Map(authUsers.map((u) => [u.id, u.email]));
  console.log(`Supabase Auth users: ${authUsers.length}`);
  console.log(`New admin_users rows: ${plan.newRows.length}`);
  for (const r of plan.newRows) {
    console.log(
      `  + ${r.email}${r.disabled ? ' (disabled — banned in Supabase)' : ''}`
    );
  }
  console.log(`Super-admin: ${emailById.get(plan.superAdminUserId)}`);
  console.log(`Admin role for ${plan.adminRoleUserIds.length} user(s):`);
  for (const id of plan.adminRoleUserIds)
    console.log(`  * ${emailById.get(id)}`);
  if (plan.skippedWithoutEmail.length > 0) {
    console.log(`Skipped (no email): ${plan.skippedWithoutEmail.join(', ')}`);
  }

  if (dryRun) {
    console.log('Dry run — nothing written.');
    return;
  }

  await prisma.$transaction([
    prisma.adminUser.createMany({ data: plan.newRows, skipDuplicates: true }),
    prisma.userRole.createMany({
      data: [
        {
          userId: plan.superAdminUserId,
          roleId: superRole.id,
          assignedBy: 'bootstrap',
        },
        ...plan.adminRoleUserIds.map((userId) => ({
          userId,
          roleId: adminRole.id,
          assignedBy: 'bootstrap',
        })),
      ],
      skipDuplicates: true,
    }),
  ]);
  console.log('Bootstrap complete.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof BootstrapError ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
```

If the super-admin's row already exists (auto-provisioned), `createMany` skips it and the role assignment still applies, because `superAdminUserId` is always assigned.

- [ ] **Step 6: Add the package script**

In `package.json` `scripts`, after `"db:sync-translations"`, add:

```json
"db:bootstrap-admins": "tsx scripts/bootstrap-admin-users.ts",
```

- [ ] **Step 7: Verify**

Run: `yarn type-check && yarn lint`
Expected: PASS. Confirm the script loads without a database: `SUPABASE_SERVICE_ROLE_KEY= DATABASE_URL=postgresql://invalid:5432/x yarn db:bootstrap-admins --dry-run` should fail with a Prisma connection error (not an import/`server-only` error). **Do not run it against a real database.**

- [ ] **Step 8: Leave uncommitted.** Do not commit.

---

### Task 18: Storage policies, hosting secret, docs, final verification

**Files:**

- Modify: `supabase/schema.sql`
- Modify: `apphosting.yaml`
- Modify: `CLAUDE.md`

**Interfaces:**

- Consumes: table/column names from Task 4; permission keys from Task 1.
- Produces: `public.admin_has_any_permission(uid uuid, perms text[]) returns boolean`; storage policies `article_images_upload`, `article_images_update`, `article_images_delete`.

- [ ] **Step 1: Replace the storage policies in `supabase/schema.sql`**

Keep the header comment, the bucket insert and `article_images_public_read`. Replace the three `article_images_authenticated_*` policies with:

```sql
-- Admin permission check for storage policies (see src/lib/permissions.ts).
-- True when the user is active (not disabled, no pending password change) and
-- holds the super-admin role or any of `perms`. security definer so it can read
-- the RLS-protected access tables.
create or replace function public.admin_has_any_permission(uid uuid, perms text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from admin_users u
    join user_roles ur on ur.user_id = u.id
    join roles r on r.id = ur.role_id
    left join role_permissions rp on rp.role_id = r.id
    where u.id = uid
      and not u.disabled
      and not u.must_change_password
      and (r.key = 'super-admin' or rp.permission = any (perms))
  );
$$;

revoke all on function public.admin_has_any_permission(uuid, text[]) from public, anon;
grant execute on function public.admin_has_any_permission(uuid, text[]) to authenticated;

drop policy if exists "article_images_authenticated_upload" on storage.objects;
drop policy if exists "article_images_authenticated_update" on storage.objects;
drop policy if exists "article_images_authenticated_delete" on storage.objects;
drop policy if exists "article_images_upload" on storage.objects;
drop policy if exists "article_images_update" on storage.objects;
drop policy if exists "article_images_delete" on storage.objects;

-- Uploads: media library/editor (media.upload) and legacy import rehosting (import.run).
create policy "article_images_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'article-images'
    and public.admin_has_any_permission(auth.uid(), array['media.upload', 'import.run'])
  );

create policy "article_images_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'article-images'
    and public.admin_has_any_permission(auth.uid(), array['media.upload', 'import.run'])
  )
  with check (
    bucket_id = 'article-images'
    and public.admin_has_any_permission(auth.uid(), array['media.upload', 'import.run'])
  );

create policy "article_images_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'article-images'
    and public.admin_has_any_permission(auth.uid(), array['media.delete'])
  );
```

Also change the file's first comment block to mention that this file is run manually in the Supabase SQL editor and must be re-run after the `add_user_management` migration is deployed.

- [ ] **Step 2: Reference the service-role secret in `apphosting.yaml`**

Append at the end of the file:

```yaml
# Server-only secret for admin user management (src/lib/supabase/admin.ts).
# Runtime only so it never lands in build output. Create it BEFORE deploying
# this file — referencing a missing secret fails the build:
#   firebase apphosting:secrets:set SUPABASE_SERVICE_ROLE_KEY --project cosbe-website-ed97c
#   firebase apphosting:secrets:grantaccess SUPABASE_SERVICE_ROLE_KEY --backend cosbe-website --project cosbe-website-ed97c
env:
  - variable: SUPABASE_SERVICE_ROLE_KEY
    secret: SUPABASE_SERVICE_ROLE_KEY
    availability:
      - RUNTIME
```

Also update the top comment ("Environment variables are NOT listed here on purpose…") by adding one sentence: `Exception: SUPABASE_SERVICE_ROLE_KEY is a Secret Manager secret, declared below.`

- [ ] **Step 3: Document in `CLAUDE.md`**

1. In the Commands block, under `# Utilities`, add:
   ```bash
   yarn db:bootstrap-admins             # One-off: import Supabase Auth users into admin_users (Admin role; super-admin by email)
   yarn db:bootstrap-admins --dry-run   # Preview without writing
   ```
2. Add a section after "### Data Layer" subsections (before "### Pagination"):

```markdown
### Users & permissions

- **Permissions** are code-defined in `src/lib/permissions.ts`. **Roles** (UI-managed at `/admin/roles`) bundle permissions; users (`/admin/users`) can hold several roles and get the union. `super-admin` is a locked system role with every permission.
- **Enforcement:** every server action calls `requirePermission(...)` / `requireAnyPermission(...)` from `src/lib/authz.ts` (never just a session check). Pages call `hasPermission` and render `<PermissionNeeded />`. Client components use `usePermissions()` only to hide controls.
- **Guardrails** (`src/lib/authz-rules.ts`): no self-modification, only super-admins touch super-admins, nobody grants permissions they don't hold.
- **Adding a permission:** add the key to `PERMISSIONS`, add `admin.access.permissions.<key_with_underscores>` label/description to `messages/admin-{en,ja}.json`, add the `requirePermission` check where it applies, and decide whether default roles should get it (new migration inserting `role_permissions` rows + `DEFAULT_ROLE_PERMISSIONS`).
- **Auth accounts** are created/banned/deleted through `src/lib/supabase/admin.ts` (service-role key, server-only).
- **Storage policies** in `supabase/schema.sql` call `public.admin_has_any_permission`; re-run that SQL when changing which permissions allow uploads/deletes.
- **Deploy order for this feature:** create the `SUPABASE_SERVICE_ROLE_KEY` secret → `yarn db:deploy` → `yarn db:bootstrap-admins` → run `supabase/schema.sql` storage section → deploy code.
```

3. In "### Environment Variables", add `- SUPABASE_SERVICE_ROLE_KEY — server-only; admin user management and bootstrap script`.

- [ ] **Step 4: Full verification**

Run each and confirm:

```bash
yarn test          # unit + component: all pass
yarn type-check    # no errors
yarn lint          # no errors
grep -rn "requireUser\|require-user" src scripts || echo "no leftovers"
grep -rn "requirePermission\|requireAnyPermission\|requireActiveSession" src/actions | wc -l   # every action covered
```

For the grep above, open each file in `src/actions/*.ts` and confirm **every exported async function** starts with `requirePermission`, `requireAnyPermission` or `requireActiveSession`.

If a disposable local Postgres is available: `ADMIN_TEST_DB=1 yarn test:db` (after `yarn prisma migrate deploy` against it). Otherwise state that the db slice is left to CI.

- [ ] **Step 5: Manual check in the running app (dev database only)**

Only with a confirmed non-production `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for that project:

1. `yarn db:deploy`, `yarn db:bootstrap-admins --dry-run`, then `yarn db:bootstrap-admins`.
2. `yarn dev`, sign in as the super-admin: sidebar shows Users and Roles.
3. Create a user with no roles → credentials dialog shows once.
4. In a private window sign in as that user → forced to `/admin/change-password` → set a password → dashboard shows "Permission needed"; sidebar shows only View Site / Sign Out.
5. As super-admin assign Marketing → the user's next navigation shows the dashboard; Delete buttons are hidden.
6. Disable the user → their next click lands on the login page with the disabled message; signing in again shows the same message.
7. Delete the (disabled) user as super-admin.

If this cannot be done safely, list these as outstanding manual checks in your report.

- [ ] **Step 6: Leave uncommitted.** Do not commit. Report the list of changed files (`git status --short`) to the user.

---

## Deployment checklist (for the user, after merge)

1. Create the `SUPABASE_SERVICE_ROLE_KEY` secret in Firebase Secret Manager and grant the backend access.
2. `yarn db:deploy` against production.
3. `yarn db:bootstrap-admins --dry-run`, review, then `yarn db:bootstrap-admins`.
4. Run the storage section of `supabase/schema.sql` in the Supabase SQL editor.
5. Deploy the code.
