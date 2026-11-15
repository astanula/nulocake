import { defineConfig, devices } from '@playwright/test';
import { testConfig } from './test-config';

/**
 * Playwright E2E configuration for NuloCake.
 *
 * Environment variables:
 *   TEST_MODE  – "dev" (default) or "preview"
 *   CI         – set in CI pipelines for retries and HTML reporter
 */

const isCI = !!process.env.CI;
const mode = (process.env.TEST_MODE ?? 'dev') as 'dev' | 'preview';
const port = 4350;

const webServerByMode = {
  dev: {
    command: `npm run dev -- --port ${port}`,
    env: { NULO_E2E_VITE: '1' },
  },
  preview: {
    command: `npm run build && npm run preview -- --port ${port}`,
  },
} as const;

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: isCI ? 2 : 0,
  reporter: isCI ? 'html' : 'list',

  use: {
    baseURL: `http://localhost:${port}${testConfig.basePath}`,
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
    ...webServerByMode[mode],
    port,
    // A reused server may be running an older build or different configuration.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
