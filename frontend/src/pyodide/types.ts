// Pyodide runner public types — see PRD_code_sandbox §4.
// Pinned shape: consumer contract for runCodeTask. Phase 6 swaps the
// runner body but never these types — CodeTaskCard reads RunResult
// fields directly and would break if any name/optionality changes.
export interface TestResult {
  name: string
  passed: boolean
  // Short failure message; absent on pass.
  message?: string
  // Multi-line traceback on failure.
  traceback?: string
  duration_ms: number
}

export interface RunResult {
  ok: boolean              // all tests passed
  tests: TestResult[]
  stdout: string
  stderr: string
  timed_out: boolean
  total_duration_ms: number
}

// Cold-start instrumentation (T6.1 / Phase 6). loader.ts is the single
// source of truth — both stop #2 verification and the T6.11 CI gate
// read these via getColdStartMetrics(). Segments are null before boot,
// numbers (ms) once measured. total_ms is recorded with the final
// ready signal and equals the sum of the segments within rounding.
export interface ColdStartMetrics {
  pyodide_load_ms: number | null  // new Worker() → pyodide ready
  pytest_load_ms: number | null   // pyodide ready → pytest loaded
  harness_init_ms: number | null  // pytest loaded → first runCodeTask-ready
  total_ms: number | null
}
