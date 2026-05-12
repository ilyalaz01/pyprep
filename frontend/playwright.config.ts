// Playwright config for T6.11 cold-start gate (CI-only).
//
// Runs against `pnpm preview` which serves `dist/`. The webServer
// section spins up preview, waits for the port, runs the spec.
// reuseExistingServer=true lets local dev avoid double-binding when
// owner manually runs `pnpm preview` in another shell.
//
// Single browser (chromium) — the gate is performance regression
// detection, not cross-browser coverage. Firefox/WebKit cold-start
// numbers would diverge and force per-browser thresholds; not the
// problem we're solving.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test',
  testMatch: /cold-start\.spec\.ts$/,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm preview --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
