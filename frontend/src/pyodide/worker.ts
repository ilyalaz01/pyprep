// Pyodide Web Worker entry (Phase 6 / T6.2 skeleton).
//
// T6.2 ships the message contract and the postMessage shell — no
// Pyodide loading yet. T6.3 replaces the body of the 'boot' handler
// with the real CDN load + loadPackage('pytest') + harness init.
//
// Contract (mirrored by loader.ts):
//   inbound:  { type: 'boot' }
//   outbound: { type: 'pyodide-ready' }   — emitted by T6.3
//             { type: 'pytest-ready' }    — emitted by T6.3
//             { type: 'ready' }           — emitted by T6.3
//             { type: 'error', message }  — emitted on any failure
//
// Wiring on the real Worker side guards against the jsdom test env;
// vitest imports handleMessage directly and never executes the
// `self.onmessage = ...` line (jsdom is not a WorkerGlobalScope).

export type WorkerInbound = { type: 'boot' }

export type WorkerOutbound =
  | { type: 'pyodide-ready' }
  | { type: 'pytest-ready' }
  | { type: 'ready' }
  | { type: 'error'; message: string }

export function handleMessage(
  post: (m: WorkerOutbound) => void,
  data: unknown,
): void {
  if (typeof data !== 'object' || data === null) {
    post({ type: 'error', message: 'unknown message: not an object' })
    return
  }
  const msg = data as { type?: unknown }
  if (msg.type === 'boot') {
    // T6.3 swaps this branch for:
    //   importScripts(`${VITE_PYODIDE_CDN}/pyodide.js`)
    //   pyodide = await loadPyodide({ indexURL: ... })
    //   post({ type: 'pyodide-ready' })
    //   await pyodide.loadPackage('pytest')
    //   post({ type: 'pytest-ready' })
    //   pyodide.runPython(<pytest_harness.py contents>)
    //   post({ type: 'ready' })
    post({ type: 'error', message: 'pyodide not yet wired (T6.3)' })
    return
  }
  post({
    type: 'error',
    message: `unknown message type: ${String(msg.type ?? 'undefined')}`,
  })
}

// Only attach onmessage when running in a real DedicatedWorker context.
// Vitest under jsdom doesn't expose WorkerGlobalScope so this branch
// is skipped during unit tests; handleMessage is exported and tested
// directly.
declare const self: DedicatedWorkerGlobalScope & typeof globalThis

const isWorker =
  typeof self !== 'undefined' &&
  'WorkerGlobalScope' in (globalThis as Record<string, unknown>)

if (isWorker) {
  self.onmessage = (e: MessageEvent) =>
    handleMessage((m) => self.postMessage(m), e.data)
}
