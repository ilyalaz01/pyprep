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
import { bootPyodideWorker, getPyodideWorker } from './loader'
import type { RunResult } from './types'

function errorResult(message: string): RunResult {
  return {
    ok: false,
    tests: [],
    stdout: '',
    stderr: message,
    timed_out: false,
    total_duration_ms: 0,
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
): Promise<RunResult> {
  const requestId = `pyprep-req-${++_nextRequestId}`
  return new Promise<RunResult>((resolve) => {
    const handler = (e: MessageEvent): void => {
      const d = e.data as ExecuteReply
      if (d.requestId !== requestId) return
      worker.removeEventListener('message', handler)
      if (d.type === 'result' && d.result) {
        resolve(d.result)
      } else if (d.type === 'error') {
        resolve(errorResult(d.message ?? 'pyodide execute error'))
      } else {
        resolve(errorResult(`unexpected reply: ${d.type ?? '(no type)'}`))
      }
    }
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
  void options // T6.8 wires the timeout layer
  try {
    await bootPyodideWorker()
  } catch (e) {
    return errorResult(e instanceof Error ? e.message : String(e))
  }
  const worker = getPyodideWorker()
  if (!worker) return errorResult('pyodide worker unavailable')
  return dispatch(worker, user_code, hidden_tests, allowlist)
}
