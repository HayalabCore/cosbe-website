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

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  password,
});

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
