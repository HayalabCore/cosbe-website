import { Prisma } from '@prisma/client';

function isUniqueConflict(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta?.target ?? '').includes(field)
  );
}

export function isSlugUniqueConflict(error: unknown): boolean {
  return isUniqueConflict(error, 'slug');
}

export function isEmailUniqueConflict(error: unknown): boolean {
  return isUniqueConflict(error, 'email');
}
