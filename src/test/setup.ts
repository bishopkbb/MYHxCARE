import { loadEnvConfig } from '@next/env';

// Load .env.test (and .env) before any test file runs, so modules that
// import src/env.ts don't throw on missing required vars.
loadEnvConfig(process.cwd());

// Extends Vitest's expect with jest-dom matchers:
// toBeInTheDocument, toHaveTextContent, toBeDisabled, toBeVisible, etc.
import '@testing-library/jest-dom/vitest';
