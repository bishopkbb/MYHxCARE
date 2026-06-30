import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './src/test/e2e',

  // Run test files in parallel
  fullyParallel: true,

  // Fail CI build if test.only is accidentally committed
  forbidOnly: isCI,

  // Retry failed tests twice in CI — E2E tests can be flaky due to timing
  retries: isCI ? 2 : 0,

  // Limit workers in CI to avoid resource contention.
  // Omit the property locally so Playwright uses its own default (logical CPU count).
  ...(isCI ? { workers: 2 } : {}),

  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    // All page.goto('/path') calls resolve relative to this
    baseURL: 'http://localhost:3000',

    // Capture trace on first retry — essential for debugging flaky clinical workflows
    trace: 'on-first-retry',

    // Screenshot only when tests fail — no noise in passing runs
    screenshot: 'only-on-failure',

    // Video only for failed tests — helps reproduce timing-sensitive bugs
    video: 'retain-on-failure',

    // Generous timeout for clinical multi-step workflows
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // Chromium — primary (Chrome/Edge are the browsers used on hospital workstations)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Firefox — secondary (some hospital admin setups use Firefox)
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // WebKit (Safari) intentionally excluded — not used in Nigerian hospital environments
  ],

  // Auto-start the Next.js server before E2E tests run.
  // CI: assumes 'npm run build' ran earlier in the pipeline, so we just 'start'.
  // Local: dev server starts fresh each time (or reuses if already running).
  webServer: {
    command: isCI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
