-- The studio system check (is the worker running?) is for whoever deploys
-- and operates the worker. Must match DEFAULT_ROLE_PERMISSIONS in
-- src/lib/permissions.ts (checked by src/lib/roles-seed.db.test.ts).
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT r."id", 'studio.system'
FROM "roles" r
WHERE r."key" IN ('admin', 'developer')
ON CONFLICT DO NOTHING;
