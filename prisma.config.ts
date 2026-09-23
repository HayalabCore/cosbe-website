/**
 * Prisma CLI (migrate, studio, generate) reads env files through the same
 * loader as the worker and scripts, so APP_ENV picks the database. With this
 * file present Prisma no longer loads .env on its own.
 */
import './src/lib/env/register';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
});
