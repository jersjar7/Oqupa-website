// End-to-end walkthrough of the public site as a visitor, at the three sizes
// people use it: computer, tablet, phone. Runs against staging by default
// (read-only apart from this browser's own storage). See e2e/README.md.
import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'https://oqupa-staging.web.app'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 3,
  reporter: [['list']],
  outputDir: './e2e/.results',
  use: {
    baseURL,
    channel: 'chrome',
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    {
      name: 'tablet',
      use: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
    },
    {
      name: 'phone',
      use: {
        ...devices['iPhone 13'],
        // Chrome, not WebKit: same engine as the other two sizes.
        defaultBrowserType: 'chromium',
        viewport: { width: 390, height: 844 },
      },
    },
  ],
})
