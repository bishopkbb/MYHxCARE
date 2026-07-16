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

      // Dead-button guard (UI compliance checklist rule #10): "Coming soon"
      // is this codebase's one and only stub-toast fingerprint. A button
      // isn't done until it does something real — don't ship the affordance
      // before the destination exists.
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value='Coming soon']",
          message:
            'Dead button: "Coming soon" placeholders are banned. Wire this control to a real destination/behavior before committing it (see AGENTS.md, UI compliance checklist rule #10).',
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
