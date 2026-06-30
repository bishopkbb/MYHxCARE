import { expect, test } from '@playwright/test';

// Verifies the Next.js app starts and responds — not a feature test.
// Replace or delete once the login page exists in Phase 3.
test('application serves a response', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
});
