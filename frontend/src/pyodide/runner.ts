/**
 * Pyodide runner — Phase 5 stub. Phase 6 swaps the body, NOT the
 * signature. Keeping the contract pinned per PRD_code_sandbox §4 so
 * CodeTaskCard ships testable in Phase 5: the renderer wires against
 * (user_code, hidden_tests, allowlist, options) and consumes
 * RunResult/TestResult exactly as Phase 6 will produce them.
 *
 * The Web Worker isolation rule (FR-SBX-5 main-thread) and the
 * per-run namespace reset (FR-SBX-6, mirrors ADR-016 React isolation)
 * are Phase-6 concerns. The stub returns a deterministic "not yet
 * wired" payload that the Results panel renders as guidance to copy
 * the snippet into local Python.
 */
export interface TestResult {
  name: string
  passed: boolean
  message?: string
  traceback?: string
  duration_ms: number
}

export interface RunResult {
  ok: boolean
  tests: TestResult[]
  stdout: string
  stderr: string
  timed_out: boolean
  total_duration_ms: number
}

export async function runCodeTask(
  user_code: string,
  hidden_tests: string,
  allowlist: string[],
  options?: { timeout_ms?: number },
): Promise<RunResult> {
  void user_code
  void hidden_tests
  void allowlist
  void options
  return {
    ok: false,
    tests: [],
    stdout: '',
    stderr: 'Pyodide not yet wired (Phase 6). Try this in your local Python.',
    timed_out: false,
    total_duration_ms: 0,
  }
}
