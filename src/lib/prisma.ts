import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      // Unique-constraint tests expect P2002; Prisma still prints prisma:error
      // to stdout unless logging is off.
      process.env.ADMIN_TEST_DB === '1'
        ? []
        : process.env.NODE_ENV === 'development'
          ? ['error', 'warn']
          : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
