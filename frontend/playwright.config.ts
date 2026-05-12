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
    // **Explicit --host 127.0.0.1**: vite preview's default binding
    // behaviour differs in headless CI (TTY-less) vs local dev. The
    // url check below is `http://127.0.0.1:4173`; explicit binding
    // guarantees the bound interface matches what Playwright polls,
    // closing one of the suspect paths for the CI hang.
    command: 'pnpm preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    // **stdout/stderr 'pipe'**: by default Playwright swallows
    // webServer output, which is exactly why the CI hang has no
    // diagnostic signal. Piping surfaces the vite banner ("Local:
    // http://...") and any error stack in the Playwright job log, so
    // the next failure tells us where preview actually wedges instead
    // of just "timed out waiting on 127.0.0.1:4173".
    // Ref: https://playwright.dev/docs/test-webserver#configuration
    stdout: 'pipe',
    stderr: 'pipe',
    // 180s (was 60s) — GitHub Actions runners are slower than local
    // on cold disk cache + slower CPU. 180s also failed in CI, but
    // that's now diagnosed via the piped output rather than papered
    // over with a higher timeout. Don't bump again without reading
    // the surfaced stdout/stderr first.
    timeout: 180_000,
  },
})
