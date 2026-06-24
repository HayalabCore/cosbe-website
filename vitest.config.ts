import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Standalone tsx round-trip script (run via `yarn test:translations-flatten`),
    // not a Vitest suite — exclude so it isn't collected here.
    exclude: [
      ...configDefaults.exclude,
      'src/lib/translations/flatten.roundtrip.test.ts',
    ],
  },
});
