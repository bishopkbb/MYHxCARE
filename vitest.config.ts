import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for DOM APIs (window, document, localStorage, etc.)
    environment: 'jsdom',

    // Expose describe/it/expect/vi/beforeEach/afterEach as globals
    // (avoids boilerplate imports in every test file)
    globals: true,

    // Use threads pool (worker threads) instead of forks (child processes).
    // Forks pool fails on Windows when the project path contains spaces
    // because the spawned child process cannot resolve the path.
    pool: 'threads',

    // Runs before each test suite — imports jest-dom matchers
    setupFiles: ['./src/test/setup.ts'],

    // Don't fail when no test files match — early phases have no unit tests yet
    passWithNoTests: true,

    // Test file patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'src/test/e2e/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Test infrastructure
        'src/test/**',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/__mocks__/**',
        // ShadCN vendor components — not ours
        'src/components/ui/**',
        // Next.js App Router files (tested via Playwright E2E)
        'src/app/**',
      ],
    },
  },
  resolve: {
    // Mirror tsconfig paths exactly.
    // Named aliases MUST be declared before '@' — Vite matches the first prefix
    // that fits, so '@features' must win over '@' for '@features/x' imports.
    // '@types' is intentionally omitted (would shadow @types/node, @types/react, etc.).
    alias: {
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@providers': path.resolve(__dirname, './src/providers'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
