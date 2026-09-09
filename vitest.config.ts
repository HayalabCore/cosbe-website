import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = fileURLToPath(new URL('./src', import.meta.url));
const serverOnlyStub = fileURLToPath(
  new URL('./src/test/server-only-stub.ts', import.meta.url)
);

const shared = {
  resolve: {
    alias: {
      '@': src,
      'server-only': serverOnlyStub,
    },
  },
};

export default defineConfig({
  ...shared,
  test: {
    projects: [
      {
        ...shared,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: [
            'src/**/*.db.test.ts',
            'src/lib/translations/flatten.roundtrip.test.ts',
          ],
        },
      },
      {
        ...shared,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['src/test/setup-jsdom.ts'],
        },
      },
      {
        ...shared,
        test: {
          name: 'db',
          environment: 'node',
          include: ['src/**/*.db.test.ts'],
          setupFiles: ['src/test/setup-db.ts'],
        },
      },
    ],
  },
});
