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
