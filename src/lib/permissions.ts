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
