import type { Actor } from '@/lib/authz-rules';
import type { Permission } from '@/lib/permissions';

/** Error codes returned by user/role/account actions; translated via admin.access.errors. */
export const ACCESS_ERROR_CODES = [
  'FORBIDDEN',
  'INVALID_INPUT',
  'EMAIL_EXISTS',
  'WEAK_PASSWORD',
  'SAME_PASSWORD',
  'WRONG_PASSWORD',
  'NOT_FOUND',
  'MUST_DISABLE_FIRST',
  'KEY_EXISTS',
  'BAN_FAILED',
  'SESSIONS_NOT_REVOKED',
  'AUTH_ORPHAN',
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
  permissions: string[];
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
