// Pyodide Web Worker entry (Phase 6 / T6.3).
//
// On a 'boot' message: dynamic-imports pyodide.mjs from the CDN
// pinned in VITE_PYODIDE_CDN (ADR-020), calls loadPyodide({ indexURL }),
// loadPackage('pytest'), and emits the three readiness signals. The
// main-thread loader.ts owns the clock and timestamps each signal —
// the worker just orders the events.
//
// Bootstrap is injectable so the unit tests (PRD §6.1: mock the worker)
// can drive bootPyodide() against a fake loadPyodide that returns a
// fake Pyodide{loadPackage}. The dynamic CDN import only fires when
// running as a real DedicatedWorker (jsdom test imports take the
// _setBootEnvForTests path instead).
import type { ColdStartMetrics as _Metrics } from './types' // type-only; ensures the contract import stays linked
void (null as unknown as _Metrics)

export type WorkerInbound = { type: 'boot' }
export type WorkerOutbound =
  | { type: 'pyodide-ready' }
  | { type: 'pytest-ready' }
  | { type: 'ready' }
  | { type: 'error'; message: string }

interface PyodideInstance {
  loadPackage(name: string | string[]): Promise<unknown>
}
type LoadPyodide = (opts: { indexURL: string }) => Promise<PyodideInstance>

let _loadPyodide: LoadPyodide | null = null
let _indexURL = ''

export function _setBootEnvForTests(load: LoadPyodide, indexURL: string): void {
  _loadPyodide = load
  _indexURL = indexURL
}

export async function bootPyodide(
  post: (m: WorkerOutbound) => void,
): Promise<void> {
  try {
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

// Production-side bootstrap. Only attaches in a real DedicatedWorker
// context — jsdom unit tests skip this block and use the
// _setBootEnvForTests escape hatch instead.
//
// `DedicatedWorkerGlobalScope` lives in TS's `WebWorker` lib which
// isn't in tsconfig.app.json (we run lib: [ES2023, DOM]). Inlining a
// minimal structural type keeps the worker code self-contained
// without forcing a project-wide lib bump.
interface WorkerLikeSelf {
  postMessage: (m: unknown) => void
  onmessage: ((e: MessageEvent) => void) | null
}
declare const self: WorkerLikeSelf & typeof globalThis

const isWorker =
  typeof self !== 'undefined' &&
  'WorkerGlobalScope' in (globalThis as Record<string, unknown>)

if (isWorker) {
  // Vite reads VITE_PYODIDE_CDN from the env at build time. The CDN
  // url is the indexURL passed to loadPyodide AND the base for the
  // dynamic pyodide.mjs import.
  const cdn =
    (import.meta as ImportMeta & { env?: { VITE_PYODIDE_CDN?: string } })
      .env?.VITE_PYODIDE_CDN ??
    'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
  void (async () => {
    try {
      const mod = await import(/* @vite-ignore */ new URL('pyodide.mjs', cdn).toString())
      _setBootEnvForTests(mod.loadPyodide as LoadPyodide, cdn)
    } catch (e) {
      // Surface CDN-import failures at boot time, not silently. First
      // incoming 'boot' message will see _loadPyodide=null and post a
      // structured error reply.
      console.error('[pyprep:pyodide] CDN import failed', e)
    }
  })()
  self.onmessage = (e: MessageEvent) =>
    handleMessage((m) => self.postMessage(m), e.data)
}
