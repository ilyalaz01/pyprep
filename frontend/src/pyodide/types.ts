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
