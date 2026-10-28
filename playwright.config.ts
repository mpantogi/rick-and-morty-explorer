import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://localhost:${String(PORT)}`
const EXPECT_TIMEOUT_MS = 10_000
const WEB_SERVER_TIMEOUT_MS = 30_000
const JOURNEYS = /@journey/
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  failOnFlakyTests: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  expect: { timeout: EXPECT_TIMEOUT_MS },
  use: { baseURL: BASE_URL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  // Serves the already-built dist: run `yarn build` first.
  webServer: {
    command: `node scripts/serve-dist.ts --port ${String(PORT)}`,
    url: `${BASE_URL}/`,
    reuseExistingServer: !isCI,
    timeout: WEB_SERVER_TIMEOUT_MS,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: JOURNEYS },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grep: JOURNEYS },
    { name: 'pixel-10', use: { ...devices['Pixel 10'] }, grep: JOURNEYS },
    { name: 'iphone-17', use: { ...devices['iPhone 17'] }, grep: JOURNEYS },
    { name: 'ipad', use: { ...devices['iPad (gen 11)'] }, grep: JOURNEYS },
  ],
})
