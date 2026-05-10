import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for NuloCake.
 *
 * Environment variables:
 *   TEST_MODE  – "dev" (default) or "preview"
 *   CI         – set in CI pipelines for retries and HTML reporter
 */

const isCI = !!process.env.CI;
const mode = (process.env.TEST_MODE ?? 'dev') as 'dev' | 'preview';

const webServerByMode = {
  dev: {
    command: 'npm run dev',
    port: 3000,
  },
  preview: {
    command: 'npm run build && npm run preview',
    port: 4321,
  },
} as const;

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: isCI ? 2 : 0,
  reporter: isCI ? 'html' : 'list',

  use: {
    baseURL: `http://localhost:${webServerByMode[mode].port}`,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  webServer: {
    command: webServerByMode[mode].command,
    port: webServerByMode[mode].port,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
