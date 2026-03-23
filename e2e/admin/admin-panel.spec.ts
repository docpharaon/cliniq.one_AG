import { test, expect } from '@playwright/test';

test.describe('Admin Panel — Public Pages', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('root redirects to login or dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });
});

test.describe('Admin Panel — Dashboard Pages (Auth Guard)', () => {
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/consultations',
    '/dashboard/doctors',
    '/dashboard/users',
    '/dashboard/tokens',
    '/dashboard/analytics',
    '/dashboard/ai',
    '/dashboard/settings',
    '/dashboard/pricing',
    '/dashboard/protocols',
    '/dashboard/kyc',
    '/dashboard/news',
    '/dashboard/ads',
    '/dashboard/hr',
    '/dashboard/scheduling',
    '/dashboard/interventions',
    '/dashboard/errors',
    '/dashboard/doctors/locum',
  ];

  for (const route of protectedRoutes) {
    test(`${route} responds (redirects or renders)`, async ({ page }) => {
      const response = await page.goto(route);
      // Should not 500 — either redirects to login or renders content
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  }
});

test.describe('Admin Panel — No Broken Pages', () => {
  test('test page loads', async ({ page }) => {
    await page.goto('/test');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });
});
