-- Content Studio permissions for the default roles. Must match
-- DEFAULT_ROLE_PERMISSIONS in src/lib/permissions.ts
-- (checked by src/lib/roles-seed.db.test.ts).
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT r."id", p.permission
FROM "roles" r
CROSS JOIN LATERAL unnest(
  CASE r."key"
    WHEN 'admin' THEN ARRAY[
      'studio.use', 'studio.templates.manage', 'studio.sources.delete'
    ]
    WHEN 'developer' THEN ARRAY['studio.use', 'studio.templates.manage']
    WHEN 'marketing' THEN ARRAY['studio.use', 'studio.templates.manage']
  END
) AS p(permission)
WHERE r."key" IN ('admin', 'developer', 'marketing')
ON CONFLICT DO NOTHING;
