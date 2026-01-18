import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4322',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [['list']]
});
