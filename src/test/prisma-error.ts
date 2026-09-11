import { Prisma } from '@prisma/client';

/** Build a P2002 the same way Prisma 6 emits it (`meta.target` is fields or a constraint name). */
export function prismaUniqueConflict(
  target: string[] | string
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed',
    {
      code: 'P2002',
      clientVersion: '6.19.0',
      meta: { target },
    }
  );
}