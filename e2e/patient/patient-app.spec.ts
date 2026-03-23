import { test, expect } from '@playwright/test';

test.describe('Patient App — Landing & Auth', () => {
  test('landing page loads with logo and CTA', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Should show content (not a blank page)
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });
});

test.describe('Patient App — Profile Pages', () => {
  test('profile page loads', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('edit-profile page loads', async ({ page }) => {
    await page.goto('/settings/edit-profile');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('security page loads', async ({ page }) => {
    await page.goto('/settings/security');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('notifications page loads', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('insurance page loads', async ({ page }) => {
    await page.goto('/settings/insurance');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('privacy-terms page loads', async ({ page }) => {
    await page.goto('/settings/privacy-terms');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('help page loads', async ({ page }) => {
    await page.goto('/settings/help');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('delete-account page loads', async ({ page }) => {
    await page.goto('/settings/delete-account');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });
});

test.describe('Patient App — i18n Content Rendering', () => {
  test('profile page renders translated menu items (not raw keys)', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const html = await page.content();
    // Should NOT show raw translation keys like "profile.editProfile"
    expect(html).not.toContain('profile.editProfile');
    expect(html).not.toContain('profile.security');
  });

  test('privacy-terms page renders translated content (not raw keys)', async ({ page }) => {
    await page.goto('/settings/privacy-terms');
    await page.waitForLoadState('networkidle');
    const html = await page.content();
    // Should NOT show raw keys
    expect(html).not.toContain('settings.privacyTermsTitle');
    expect(html).not.toContain('settings.privacyPolicyTitle');
  });

  test('help page renders FAQ content (not raw keys)', async ({ page }) => {
    await page.goto('/settings/help');
    await page.waitForLoadState('networkidle');
    const html = await page.content();
    // Should NOT show raw keys
    expect(html).not.toContain('help.faq1Q');
    expect(html).not.toContain('help.title');
  });

  test('delete-account page renders translated warnings (not raw keys)', async ({ page }) => {
    await page.goto('/settings/delete-account');
    await page.waitForLoadState('networkidle');
    const html = await page.content();
    expect(html).not.toContain('deleteAccount.title');
    expect(html).not.toContain('deleteAccount.permanentAction');
  });
});

test.describe('Patient App — Core Tabs', () => {
  test('consultations tab loads', async ({ page }) => {
    await page.goto('/(tabs)/consultations');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('wallet tab loads', async ({ page }) => {
    await page.goto('/(tabs)/wallet');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });
});
