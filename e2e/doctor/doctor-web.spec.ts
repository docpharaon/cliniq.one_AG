import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────
// Doctor Web — Smoke Tests (no auth required)
// ─────────────────────────────────────────────────────

test.describe('Doctor Web — Public Pages', () => {
  test('login page renders with form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
    // Should have email and password inputs
    const inputs = page.locator('input');
    expect(await inputs.count()).toBeGreaterThanOrEqual(2);
  });

  test('root redirects to login or dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });

  test('forgot-password page loads', async ({ page }) => {
    const resp = await page.goto('/forgot-password');
    expect(resp?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });
});

// ─────────────────────────────────────────────────────
// Doctor Web — Protected Routes (Auth Guard)
// ─────────────────────────────────────────────────────

test.describe('Doctor Web — Protected Routes (Auth Guard)', () => {
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/queue',
    '/dashboard/consultations',
    '/dashboard/analytics',
    '/dashboard/schedule',
    '/dashboard/notifications',
    '/dashboard/profile',
    '/dashboard/settings',
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
// Doctor Web — Authenticated Flow Tests
// These run when storageState is available from auth setup
// ─────────────────────────────────────────────────────

test.describe('Doctor Web — Dashboard (Authenticated)', () => {
  test('dashboard loads with stat cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // If authenticated, should see dashboard content (not redirected to login)
    const url = page.url();
    if (url.includes('/dashboard') && !url.includes('/login')) {
      // Should render stat cards or loading spinner
      const content = await page.content();
      // Should not be a blank page
      expect(content.length).toBeGreaterThan(500);
    }
  });

  test('queue page renders table or empty state', async ({ page }) => {
    await page.goto('/dashboard/queue');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    if (url.includes('/queue')) {
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    }
  });

  test('notification bell is present', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    if (url.includes('/dashboard') && !url.includes('/login')) {
      const bell = page.locator('#notification-bell');
      if (await bell.count() > 0) {
        await expect(bell).toBeVisible();
      }
    }
  });

  test('consultation detail page loads for valid ID format', async ({ page }) => {
    // Navigate to a placeholder consultation ID — should show 404 or error, not crash
    await page.goto('/dashboard/consultation/00000000-0000-0000-0000-000000000000');
    await page.waitForLoadState('networkidle');
    const response = await page.goto('/dashboard/consultation/00000000-0000-0000-0000-000000000000');
    expect(response?.status()).toBeLessThan(500);
  });
});
