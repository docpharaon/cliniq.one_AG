import { test, expect } from '@playwright/test';

test.describe('Doctor Web — Public Pages', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('root redirects to login or dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Should either be at login or dashboard (auth guard redirect)
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });
});

test.describe('Doctor Web — Protected Routes (Auth Guard)', () => {
  test('dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Auth guard should redirect to login
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('consultations page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/consultations');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('settings page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('earnings page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/earnings');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('/login');
  });
});
