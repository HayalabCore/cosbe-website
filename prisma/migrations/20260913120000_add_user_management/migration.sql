-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
