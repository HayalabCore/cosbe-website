import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsertMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    author: {
      upsert: (args: unknown) => upsertMock(args),
    },
  },
}));

const { upsertAuthor } = await import('@/lib/articles-repository');

describe('upsertAuthor avatar handling', () => {
  beforeEach(() => {
    upsertMock.mockReset();
    upsertMock.mockResolvedValue({ id: 'author-1' });
  });

  it('does not touch avatarUrl when none is supplied', async () => {
    await upsertAuthor('Author', 'Role');
    const args = upsertMock.mock.calls[0][0];
    expect(args.update).toEqual({});
    expect(args.create).toEqual({ name: 'Author', designation: 'Role' });
  });

  it('writes the avatar on both create and update when supplied', async () => {
    await upsertAuthor('Author', 'Role', 'https://cdn.example/a.png');
    const args = upsertMock.mock.calls[0][0];
    expect(args.update).toEqual({ avatarUrl: 'https://cdn.example/a.png' });
    expect(args.create.avatarUrl).toBe('https://cdn.example/a.png');
  });

  it('clears the avatar when an empty string is supplied', async () => {
    await upsertAuthor('Author', 'Role', '');
    const args = upsertMock.mock.calls[0][0];
    expect(args.update).toEqual({ avatarUrl: null });
    expect(args.create.avatarUrl).toBeNull();
  });
});
