// Pyodide runner — main-thread API surface (T6.5 worker-driven).
//
// Public signature is pinned by PRD_code_sandbox §4 (and Phase-5
// T5.9 ADR): consumer (CodeTaskCard) is untouched across this swap.
// The body now drives the worker:
//   1. await bootPyodideWorker() — singleton boot, idempotent.
//   2. Post an 'execute' message with a unique requestId.
//   3. Attach a message listener that filters by requestId; resolve
//      on 'result', resolve-with-error on matching 'error'.
//   4. Listener detaches itself on first match.
//
// Errors are returned as a non-ok RunResult rather than rejected —
// the consumer (CodeTaskCard) renders stderr verbatim, so wrapping
// boot/worker failures into RunResult.stderr keeps the UI path
// uniform whether the failure was code or infrastructure.
//
// Timeout (T6.8) and input validation (T6.9, parallel) layer on top
// of this; both modify the dispatch shell, not the worker contract.
export type { RunResult, TestResult } from './types'
import {
  bootPyodideWorker, getPyodideWorker, invalidateWorker,
} from './loader'
import type { RunResult } from './types'

// PRD §FR-SBX-4 default — overridable via options.timeout_ms.
const DEFAULT_TIMEOUT_MS = 5000

// PRD §7.1 input validation. UTF-16 code-unit length, not bytes —
// over-permissive on multi-byte text by ~3x but Python source is
// nearly always ASCII; the check exists to prevent the "user pastes
// 5MB and freezes the worker" risk in PRD §8.
const MAX_INPUT_CHARS = 50_000
const MIN_TIMEOUT_MS = 100
const MAX_TIMEOUT_MS = 30_000

function validateInputs(
  user_code: unknown, hidden_tests: unknown, timeout_ms: number,
): string | null {
  if (typeof user_code !== 'string') return 'user_code must be a string'
  if (user_code.length > MAX_INPUT_CHARS) {
    return `user_code exceeds ${MAX_INPUT_CHARS}-character limit (got ${user_code.length})`
  }
  if (typeof hidden_tests !== 'string') return 'hidden_tests must be a string'
  if (hidden_tests.length > MAX_INPUT_CHARS) {
    return `hidden_tests exceeds ${MAX_INPUT_CHARS}-character limit (got ${hidden_tests.length})`
  }
  if (
    !Number.isFinite(timeout_ms) ||
    timeout_ms < MIN_TIMEOUT_MS ||
    timeout_ms > MAX_TIMEOUT_MS
  ) {
    return `timeout_ms must be in [${MIN_TIMEOUT_MS}, ${MAX_TIMEOUT_MS}], got ${timeout_ms}`
  }
  return null
}

function errorResult(message: string): RunResult {
  return {
    ok: false, tests: [], stdout: '', stderr: message,
    timed_out: false, total_duration_ms: 0,
  }
}

function timedOutResult(timeout_ms: number): RunResult {
  return {
    ok: false, tests: [], stdout: '',
    stderr: `Execution exceeded ${timeout_ms}ms timeout. Worker terminated.`,
    timed_out: true, total_duration_ms: timeout_ms,
  }
}

let _nextRequestId = 0

interface ExecuteReply {
  type?: string
  requestId?: string
  result?: RunResult
  message?: string
}

function dispatch(
  worker: Worker,
  user_code: string,
  hidden_tests: string,
  allowlist: string[],
  timeout_ms: number,
): Promise<RunResult> {
  const requestId = `pyprep-req-${++_nextRequestId}`
  return new Promise<RunResult>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const handler = (e: MessageEvent): void => {
      const d = e.data as ExecuteReply
      if (d.requestId !== requestId) return
      if (timer !== null) { clearTimeout(timer); timer = null }
      worker.removeEventListener('message', handler)
      if (d.type === 'result' && d.result) resolve(d.result)
      else if (d.type === 'error') resolve(errorResult(d.message ?? 'pyodide execute error'))
      else resolve(errorResult(`unexpected reply: ${d.type ?? '(no type)'}`))
    }
    // T6.8: hard timeout. Termination + singleton invalidation makes
    // the next runCodeTask construct a fresh worker (and pay cold-
    // start again — documented cost; FR-SBX-4 allows it).
    timer = setTimeout(() => {
      worker.removeEventListener('message', handler)
      invalidateWorker()
      resolve(timedOutResult(timeout_ms))
    }, timeout_ms)
    worker.addEventListener('message', handler)
    worker.postMessage({
      type: 'execute', requestId, user_code, hidden_tests, allowlist,
    })
  })
}

export async function runCodeTask(
  user_code: string,
  hidden_tests: string,
  allowlist: string[],
  options?: { timeout_ms?: number },
): Promise<RunResult> {
  const timeout_ms = options?.timeout_ms ?? DEFAULT_TIMEOUT_MS
  const invalid = validateInputs(user_code, hidden_tests, timeout_ms)
  if (invalid) return errorResult(invalid)
  try {
    await bootPyodideWorker()
  } catch (e) {
    return errorResult(e instanceof Error ? e.message : String(e))
  }
  const worker = getPyodideWorker()
  if (!worker) return errorResult('pyodide worker unavailable')
  return dispatch(worker, user_code, hidden_tests, allowlist, timeout_ms)
}
