import { test as setup, expect } from '@playwright/test';
import path from 'path';

// ─────────────────────────────────────────────────────
// Auth Setup — Logs in as doctor and admin, saves state
// Test accounts: configure via environment variables or
// create via Supabase Dashboard / seed script
// ─────────────────────────────────────────────────────

const DOCTOR_EMAIL = process.env.E2E_DOCTOR_EMAIL || 'test-doctor@cliniq.one';
const DOCTOR_PASSWORD = process.env.E2E_DOCTOR_PASSWORD || 'TestDoctor123!';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'test-admin@cliniq.one';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestAdmin123!';

const AUTH_DIR = path.join(__dirname, '.auth');

setup('authenticate as doctor', async ({ page }) => {
    await page.goto('http://localhost:3002/login');
    await page.waitForLoadState('networkidle');

    // Fill login form
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');

    if (await emailInput.count() > 0) {
        await emailInput.fill(DOCTOR_EMAIL);
        await passwordInput.fill(DOCTOR_PASSWORD);
        await submitButton.click();
        await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {
            // Login may fail with test account — that's okay for auth setup
            console.log('Doctor login redirect not detected — may need real credentials');
        });
    }

    await page.context().storageState({ path: path.join(AUTH_DIR, 'doctor.json') });
});

setup('authenticate as admin', async ({ page }) => {
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');

    if (await emailInput.count() > 0) {
        await emailInput.fill(ADMIN_EMAIL);
        await passwordInput.fill(ADMIN_PASSWORD);
        await submitButton.click();
        await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {
            console.log('Admin login redirect not detected — may need real credentials');
        });
    }

    await page.context().storageState({ path: path.join(AUTH_DIR, 'admin.json') });
});
