import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/pwa',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4176/NumberCal/',
    ...devices['Desktop Chrome'],
    locale: 'ko-KR',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node scripts/serve-pages.mjs',
    url: 'http://127.0.0.1:4176/NumberCal/',
    reuseExistingServer: true,
    timeout: 30_000
  }
});
