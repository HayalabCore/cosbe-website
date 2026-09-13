import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolvePermissions, SUPER_ADMIN_ROLE_KEY } from '@/lib/permissions';
import { isEmailUniqueConflict } from '@/lib/prisma-errors';

type AdminDb = Prisma.TransactionClient | typeof prisma;

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

export function permissionsOf(user: AdminUserWithRoles): string[] {
  return [...resolvePermissions(rolesOf(user)).permissions];
}

export class EmailOwnedByOtherRowError extends Error {
  readonly existingId: string;

  constructor(existingId: string) {
    super(`Email already belongs to admin user ${existingId}`);
    this.name = 'EmailOwnedByOtherRowError';
    this.existingId = existingId;
  }
}

export async function findAdminUserWithRoles(
  id: string
): Promise<AdminUserWithRoles | null> {
  return prisma.adminUser.findUnique({ where: { id }, include: withRoles });
}

export async function findAdminUserByEmail(
  email: string
): Promise<AdminUserWithRoles | null> {
  return prisma.adminUser.findUnique({ where: { email }, include: withRoles });
}

/**
 * Creates a role-less row for a Supabase user that has none. Syncs email when
 * the Auth user's address has changed. Throws EmailOwnedByOtherRowError when
 * another row already owns the email (deleted-and-recreated Auth user).
 */
export async function provisionAdminUser(
  id: string,
  email: string
): Promise<AdminUserWithRoles> {
  try {
    return await prisma.adminUser.upsert({
      where: { id },
      create: { id, email },
      update: { email },
      include: withRoles,
    });
  } catch (error) {
    // Create-vs-create race on the same id. Email unique clashes must not
    // take this path: the row for `id` still has the old address.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      !isEmailUniqueConflict(error)
    ) {
      const raced = await prisma.adminUser.findUnique({
        where: { id },
        include: withRoles,
      });
      if (raced) return raced;
    }
    if (!isEmailUniqueConflict(error)) throw error;
    const owner = await prisma.adminUser.findUnique({
      where: { email },
      select: { id: true },
    });
    if (owner && owner.id !== id) {
      throw new EmailOwnedByOtherRowError(owner.id);
    }
    throw error;
  }
}

/** Moves an admin row to a new Auth user id (same email) and keeps its roles. */
export async function adoptAdminUserId(
  fromId: string,
  toId: string,
  email: string,
  options: {
    disabled?: boolean;
    displayName?: string | null;
    createdBy?: string;
    roleIds?: string[];
    mustChangePassword?: boolean;
    db?: AdminDb;
  } = {}
): Promise<AdminUserWithRoles> {
  const run = async (tx: AdminDb) => {
    const already = await tx.adminUser.findUnique({
      where: { id: toId },
      include: withRoles,
    });
    if (already) return already;

    const existing = await tx.adminUser.findUnique({
      where: { id: fromId },
      include: { roles: true },
    });
    if (!existing) {
      throw new Error(`Admin user ${fromId} not found`);
    }
    await tx.userRole.deleteMany({ where: { userId: fromId } });
    await tx.adminUser.delete({ where: { id: fromId } });
    return tx.adminUser.create({
      data: {
        id: toId,
        email,
        displayName:
          options.displayName !== undefined
            ? options.displayName
            : existing.displayName,
        disabled: options.disabled ?? existing.disabled,
        mustChangePassword:
          options.mustChangePassword ?? existing.mustChangePassword,
        createdBy: options.createdBy ?? existing.createdBy,
        roles: {
          create: (options.roleIds ?? existing.roles.map((r) => r.roleId)).map(
            (roleId) => ({
              roleId,
              assignedBy: options.createdBy ?? existing.createdBy,
            })
          ),
        },
      },
      include: withRoles,
    });
  };

  try {
    if (options.db) return await run(options.db);
    return await prisma.$transaction((tx) => run(tx));
  } catch (error) {
    try {
      const already = await (options.db ?? prisma).adminUser.findUnique({
        where: { id: toId },
        include: withRoles,
      });
      if (already) return already;
    } catch {
      // The caller's transaction may already be aborted.
    }
    throw error;
  }
}

export async function setAdminUserProfile(
  userId: string,
  data: { displayName: string | null; createdBy: string; disabled?: boolean }
): Promise<void> {
  await prisma.adminUser.update({
    where: { id: userId },
    data: { ...data, mustChangePassword: true },
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
