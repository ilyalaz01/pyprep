// Pyodide runner — Phase 5 stub. Phase 6 swaps the body; the signature
// is pinned by PRD_code_sandbox §4 and by T5.9's ADR so CodeTaskCard
// ships testable in Phase 5. The renderer wires against (user_code,
// hidden_tests, allowlist, options) and consumes RunResult/TestResult
// exactly as the Phase-6 worker-driven path will produce them.
//
// T6.0 split: TestResult + RunResult moved to ./types.ts. This module
// re-exports them so the existing import path
// `import { runCodeTask, type RunResult } from '../pyodide/runner'`
// keeps working for consumers. Phase-6 work happens in loader.ts /
// worker.ts; this file's body is the last thing to change.
//
// The Web Worker isolation rule (FR-SBX-5) and the per-run namespace
// reset (FR-SBX-6, mirrors ADR-016 React isolation) are Phase-6
// concerns. The stub returns a deterministic "not yet wired" payload
// that the Results panel renders as guidance to copy the snippet into
// local Python.
export type { RunResult, TestResult } from './types'
import type { RunResult } from './types'

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
