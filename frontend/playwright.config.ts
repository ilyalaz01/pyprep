// Playwright config for the two CI-only gates:
//
//   1. T6.11 cold-start + P6.5/P1-3 NFR-SBX-2 — `cold-start.spec.ts`
//   2. P6.5/P1-2 real-Pyodide e2e (T6.10 + T6.12 matrices against the
//      real WASM runtime) — `pyodide-e2e.spec.ts`
//
// Runs against `pnpm preview` which serves `dist/`. The webServer
// section spins up preview, waits for the port, runs the specs.
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
  // P6.5/P1-2 — pyodide-e2e.spec.ts joins cold-start.spec.ts in CI.
  testMatch: /(cold-start|pyodide-e2e)\.spec\.ts$/,
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
