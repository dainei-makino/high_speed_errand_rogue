import { test, expect } from '@playwright/test';

test('renders canvas', async ({ page }) => {
  await page.goto('/');
  const canvases = await page.locator('canvas');
  await expect(canvases).toHaveCount(1);
});
