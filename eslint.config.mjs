import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      // Disallow `any` — use `unknown` and narrow instead
      '@typescript-eslint/no-explicit-any': 'error',

      // Enforce `import type` for type-only imports (enables better tree-shaking)
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Allow _-prefixed unused vars (event handler params, intentional ignores)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // console.log must not reach committed code; warn/error are allowed
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Force @/ path aliases — no ../../ parent traversal in imports
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../**'],
              message: 'Use @/ path aliases instead of relative parent imports.',
            },
          ],
        },
      ],
    },
  },

  globalIgnores([
    // Next.js build outputs
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // ShadCN vendor components — not our code, not our rules
    'src/components/ui/**',
    // Service worker — plain JS in ServiceWorkerGlobalScope, not Node/browser env
    'public/sw.js',
  ]),
]);

export default eslintConfig;
