// Pyodide Web Worker entry (Phase 6 / T6.3 + T6.0.5 fix).
//
// On a 'boot' message: dynamic-imports pyodide.mjs from the CDN
// pinned in VITE_PYODIDE_CDN (ADR-020), calls loadPyodide({ indexURL }),
// loadPackage('pytest'), and emits the three readiness signals. The
// main-thread loader.ts owns the clock and timestamps each signal.
//
// T6.0.5 race fix: the production bootstrap uses top-level await so
// the worker doesn't register onmessage (and therefore can't dispatch
// a 'boot' message) until the CDN import has resolved or failed.
// Before the fix, the IIFE was fire-and-forget — a 'boot' message
// arriving before the import resolved produced
// "pyodide bootstrap not configured" indistinguishably from a missing
// env var, which is exactly what stop #2 surfaced.
//
// Bootstrap is injectable so the unit tests (PRD §6.1: mock the worker)
// can drive bootPyodide() against a fake loadPyodide. The CDN import
// only fires when running as a real DedicatedWorker.
import type { ColdStartMetrics as _Metrics } from './types' // ensures the contract import stays linked
void (null as unknown as _Metrics)

export type WorkerInbound = { type: 'boot' }
export type WorkerOutbound =
  | { type: 'pyodide-ready' }
  | { type: 'pytest-ready' }
  | { type: 'ready' }
  | { type: 'error'; message: string }
  // T6.3 stop-#2 retry: diagnostic messages surface worker-internal
  // state to the main-thread console. Used to distinguish silent-
  // failure modes (useEffect not firing vs. worker hang vs. env
  // undefined in worker scope).
  | { type: 'diagnostic'; message: string }

interface PyodideInstance {
  loadPackage(name: string | string[]): Promise<unknown>
}
type LoadPyodide = (opts: { indexURL: string }) => Promise<PyodideInstance>

let _loadPyodide: LoadPyodide | null = null
let _indexURL = ''
let _bootError: string | null = null

export function _setBootEnvForTests(load: LoadPyodide, indexURL: string): void {
  _loadPyodide = load
  _indexURL = indexURL
}

export function _setBootErrorForTests(message: string | null): void {
  _bootError = message
}

export async function bootPyodide(
  post: (m: WorkerOutbound) => void,
): Promise<void> {
  try {
    if (_bootError) {
      post({ type: 'error', message: _bootError })
      return
    }
    if (!_loadPyodide) {
      post({ type: 'error', message: 'pyodide bootstrap not configured' })
      return
    }
    const pyodide = await _loadPyodide({ indexURL: _indexURL })
    post({ type: 'pyodide-ready' })
    await pyodide.loadPackage('pytest')
    post({ type: 'pytest-ready' })
    // T6.4 will install pytest_harness.py here. T6.3 ships the
    // ready signal without harness work so stop #2 measures a
    // representative cold-start (loader + pytest) accurately.
    post({ type: 'ready' })
  } catch (e) {
    post({
      type: 'error',
      message: e instanceof Error ? e.message : String(e),
    })
  }
}

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
    void bootPyodide(post)
    return
  }
  post({
    type: 'error',
    message: `unknown message type: ${String(msg.type ?? 'undefined')}`,
  })
}

// Production-side bootstrap. Only attaches in a real DedicatedWorker.
// `DedicatedWorkerGlobalScope` lives in TS's WebWorker lib (not in
// tsconfig.app.json's lib: [ES2023, DOM]); the inline structural type
// keeps the worker self-contained.
interface WorkerLikeSelf {
  postMessage: (m: unknown) => void
  onmessage: ((e: MessageEvent) => void) | null
}
declare const self: WorkerLikeSelf & typeof globalThis

const ENV_NOT_SET_MSG =
  '[pyprep:pyodide] VITE_PYODIDE_CDN env var is not set. ' +
  'Copy frontend/.env.example to frontend/.env.local and restart pnpm dev. ' +
  'See README setup section.'

if (
  typeof self !== 'undefined' &&
  'WorkerGlobalScope' in (globalThis as Record<string, unknown>)
) {
  // T6.3 stop-#2 retry diagnostics. Each step posts to the main
  // thread so DevTools shows a trace even if the worker hangs
  // mid-import (workers' own console output isn't always visible
  // alongside main-thread logs).
  const diag = (message: string): void =>
    self.postMessage({ type: 'diagnostic', message })

  diag('worker top-level reached')
  const env = (import.meta as ImportMeta & {
    env?: { VITE_PYODIDE_CDN?: string }
  }).env
  const envCdn = env?.VITE_PYODIDE_CDN
  diag(
    `env check: hasEnv=${typeof env !== 'undefined'} ` +
    `cdn=${envCdn ?? '(undefined)'}`,
  )

  if (!envCdn) {
    _bootError = ENV_NOT_SET_MSG
    diag('env not set; _bootError prepared')
    console.error(ENV_NOT_SET_MSG)
  } else {
    try {
      diag(`importing pyodide.mjs from ${envCdn}`)
      // Top-level await: blocks worker activation until the CDN
      // import resolves. Browser queues main-thread
      // postMessage('boot') until then, so the 'boot' handler
      // always sees _loadPyodide populated (or _bootError set).
      const mod = await import(
        /* @vite-ignore */ new URL('pyodide.mjs', envCdn).toString()
      )
      diag('pyodide.mjs imported successfully')
      _setBootEnvForTests(mod.loadPyodide as LoadPyodide, envCdn)
    } catch (e) {
      _bootError =
        '[pyprep:pyodide] CDN import failed: ' +
        (e instanceof Error ? e.message : String(e)) +
        ' (check VITE_PYODIDE_CDN and network).'
      diag(`CDN import threw: ${e instanceof Error ? e.message : String(e)}`)
      console.error(_bootError, e)
    }
  }
  diag('attaching onmessage; ready for boot')
  self.onmessage = (e: MessageEvent) =>
    handleMessage((m) => self.postMessage(m), e.data)
}
