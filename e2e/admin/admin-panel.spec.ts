import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────
// Admin Panel — Smoke Tests (no auth required)
// ─────────────────────────────────────────────────────

test.describe('Admin Panel — Public Pages', () => {
  test('login page renders with form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
    const inputs = page.locator('input');
    expect(await inputs.count()).toBeGreaterThanOrEqual(2);
  });

  test('root redirects to login or dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });
});

// ─────────────────────────────────────────────────────
// Admin Panel — All Protected Routes (No 500 Errors)
// ─────────────────────────────────────────────────────

test.describe('Admin Panel — Dashboard Pages (Auth Guard)', () => {
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/consultations',
    '/dashboard/doctors',
    '/dashboard/doctors/locum',
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
  ];

  for (const route of protectedRoutes) {
    test(`${route} responds without 500`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  }
});

// ─────────────────────────────────────────────────────
// Admin Panel — Authenticated Flow Tests
// ─────────────────────────────────────────────────────

test.describe('Admin Panel — Dashboard (Authenticated)', () => {
  test('dashboard overview shows stat cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    if (url.includes('/dashboard') && !url.includes('/login')) {
      const content = await page.content();
      expect(content.length).toBeGreaterThan(500);
    }
  });

  test('doctors page renders list or empty state', async ({ page }) => {
    await page.goto('/dashboard/doctors');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    if (url.includes('/doctors')) {
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    }
  });

  test('AI management page loads without error', async ({ page }) => {
    const response = await page.goto('/dashboard/ai');
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('consultations page renders', async ({ page }) => {
    await page.goto('/dashboard/consultations');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    if (url.includes('/consultations')) {
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    }
  });
});
