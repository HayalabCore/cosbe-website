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
