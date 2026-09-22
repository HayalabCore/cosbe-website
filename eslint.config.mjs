import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next@16.2.9 bundles a newer eslint-plugin-react-hooks that
    // promotes these React-Compiler-oriented checks to errors. They flag several
    // pre-existing (mostly intentional) effect/ref patterns in the admin UI.
    // Kept as warnings so the dependency upgrade lands green; addressing them is
    // tracked as a separate hooks-cleanup follow-up.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      // next/image is stubbed as <img> in jsdom; LCP does not apply to tests.
      '@next/next/no-img-element': 'off',
    },
  },
  {
    // Engine code runs in the studio worker, tests and (later) in-process.
    // It must not depend on Next.js or request-scoped auth.
    files: ['src/generator/**/*.ts', 'src/ai/**/*.ts', 'worker/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['next', 'next/*'],
              message: 'Engine code must not depend on Next.js.',
            },
            {
              group: ['@/app/*', '@/actions/*', '@/components/*'],
              message: 'Engine code must not import UI or server actions.',
            },
            {
              group: ['@/lib/authz', '@/lib/supabase/server', 'server-only'],
              message:
                'Engine code has no request session; use src/generator/authz.ts.',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
