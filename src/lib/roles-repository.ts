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
