// Real-Pyodide e2e fixture (P6.5/P1-2). Boots the Pyodide worker once
// and exposes `runCodeTask` on `window` so the Playwright spec can
// drive the T6.10 + T6.12 matrices against the real WASM runtime.
//
// CI-only. Separate from the cold-start fixture so cold-start
// instrumentation (which assumes the boot happens during measurement)
// stays unaffected by the e2e sweep.
//
// **Why this exists** — Audit P1-2 / N037: until this fixture,
// every test in `frontend/src/pyodide/*.test.ts` mocked the worker,
// and the backend `test_pytest_harness.py` + `test_module1_allowlist_matrix.py`
// ran the harness under CPython, not Pyodide. The single real-Pyodide
// test (cold-start spec) ran one trivial workload. This fixture closes
// that gap: every Module 1 code_task's solution + every per-card
// allowlist boundary + the FR-SBX-6 namespace-reset contract now run
// in the real worker.
import { bootPyodideWorker } from './pyodide/loader'
import { runCodeTask, type RunResult } from './pyodide/runner'

declare global {
  interface Window {
    __pyprepE2eReady?: Promise<true>
    __pyprepRunCodeTask?: (
      user_code: string,
      hidden_tests: string,
      allowlist: string[],
      options?: { timeout_ms?: number },
    ) => Promise<RunResult>
  }
}

window.__pyprepRunCodeTask = runCodeTask
window.__pyprepE2eReady = bootPyodideWorker().then(() => true as const)
