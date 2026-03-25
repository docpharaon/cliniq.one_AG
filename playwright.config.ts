import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Auth setup — runs first, saves state for other projects
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Patient app (Expo web — runs independently, no auth needed for smoke tests)
    {
      name: 'patient-app',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8081',
      },
      testMatch: /patient\/.+\.spec\.ts/,
    },

    // Doctor web — uses authenticated doctor state
    {
      name: 'doctor-web',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3002',
        storageState: path.join(__dirname, 'e2e', '.auth', 'doctor.json'),
      },
      dependencies: ['auth-setup'],
      testMatch: /doctor\/.+\.spec\.ts/,
    },

    // Admin panel — uses authenticated admin state
    {
      name: 'admin-panel',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
        storageState: path.join(__dirname, 'e2e', '.auth', 'admin.json'),
      },
      dependencies: ['auth-setup'],
      testMatch: /admin\/.+\.spec\.ts/,
    },
  ],
});
