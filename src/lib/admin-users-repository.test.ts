import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prismaUniqueConflict } from '@/test/prisma-error';

const findUnique = vi.fn();
const upsert = vi.fn();
const create = vi.fn();
const deleteRow = vi.fn();
const deleteMany = vi.fn();
const transaction = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    adminUser: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      upsert: (...a: unknown[]) => upsert(...a),
      create: (...a: unknown[]) => create(...a),
      delete: (...a: unknown[]) => deleteRow(...a),
    },
    userRole: { deleteMany: (...a: unknown[]) => deleteMany(...a) },
    $transaction: (fn: (tx: unknown) => unknown) => transaction(fn),
  },
}));

import {
  adoptAdminUserId,
  EmailOwnedByOtherRowError,
  provisionAdminUser,
} from './admin-users-repository';

const row = { id: 'u1', email: 'a@test.local', roles: [] };

describe('provisionAdminUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the existing row after a create race on id', async () => {
    upsert.mockRejectedValue(prismaUniqueConflict(['id']));
    findUnique.mockResolvedValue(row);
    await expect(provisionAdminUser('u1', 'a@test.local')).resolves.toEqual(
      row
    );
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      include: expect.anything(),
    });
  });

  it('throws EmailOwnedByOtherRowError on an email clash even if the id row exists', async () => {
    upsert.mockRejectedValue(prismaUniqueConflict(['email']));
    findUnique.mockResolvedValue({ id: 'other' });
    await expect(
      provisionAdminUser('u1', 'taken@test.local')
    ).rejects.toBeInstanceOf(EmailOwnedByOtherRowError);
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'taken@test.local' },
      select: { id: true },
    });
  });
});

describe('adoptAdminUserId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the new id when a concurrent adopt already created it', async () => {
    transaction.mockRejectedValue(new Error('write conflict'));
    findUnique.mockResolvedValue(row);
    await expect(
      adoptAdminUserId('old', 'u1', 'a@test.local')
    ).resolves.toEqual(row);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      include: expect.anything(),
    });
  });

  it('is a no-op when the target id already exists', async () => {
    const tx = {
      adminUser: {
        findUnique: vi.fn().mockResolvedValue(row),
        create,
        delete: deleteRow,
      },
      userRole: { deleteMany },
    };
    transaction.mockImplementation(async (fn: (t: unknown) => unknown) =>
      fn(tx)
    );
    await expect(
      adoptAdminUserId('old', 'u1', 'a@test.local')
    ).resolves.toEqual(row);
    expect(deleteRow).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
