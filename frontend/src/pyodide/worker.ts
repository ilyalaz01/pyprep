// Pyodide Web Worker (Phase 6). Self-bootstrapping at module top-level:
// dynamic-imports pyodide.mjs from the CDN, calls loadPyodide +
// loadPackage('pytest'), installs pytest_harness.py via runPython,
// then attaches onmessage for runtime 'execute' requests. Drops the
// boot handshake — stop-#2 retry showed Vite ESM-workers + TLA can
// lose pre-attach postMessages. Harness install at T6.4; namespace
// bridge for execute at T6.5.
import type { ColdStartMetrics as _Metrics } from './types' // contract import
import type { RunResult } from './types'
void (null as unknown as _Metrics)
import harnessSource from './pytest_harness.py?raw'

export interface ExecuteRequest {
  type: 'execute'
  requestId: string
  user_code: string
  hidden_tests: string
  allowlist: string[]
}
export type WorkerInbound = ExecuteRequest

export type WorkerOutbound =
  | { type: 'pyodide-ready' }
  | { type: 'pytest-ready' }
  | { type: 'ready' }
  | { type: 'error'; message: string; requestId?: string }
  | { type: 'diagnostic'; message: string }
  | { type: 'result'; requestId: string; result: RunResult }

// PyProxy: globals.get('run_code_task') returns a callable proxy that,
// invoked, returns a dict proxy whose .toJs({dict_converter}) yields
// a plain JS object matching RunResult.
interface PyProxy {
  (...args: unknown[]): PyProxy
  toJs(opts?: { dict_converter?: unknown }): unknown
  destroy(): void
}
interface PyodideInstance {
  loadPackage(name: string | string[]): Promise<unknown>
  runPython(code: string): unknown
  globals: { get(name: string): PyProxy }
}
type LoadPyodide = (opts: { indexURL: string }) => Promise<PyodideInstance>

let _loadPyodide: LoadPyodide | null = null
let _indexURL = ''
// T6.5: post-boot reference to the loaded Pyodide instance, used by
// handleMessage's 'execute' branch to call into the harness.
let _pyodide: PyodideInstance | null = null

export function _setBootEnvForTests(load: LoadPyodide, indexURL: string): void {
  _loadPyodide = load
  _indexURL = indexURL
}

export function _setPyodideForTests(py: PyodideInstance | null): void {
  _pyodide = py
}

export async function bootPyodide(
  post: (m: WorkerOutbound) => void,
): Promise<void> {
  if (!_loadPyodide) {
    post({ type: 'error', message: 'pyodide bootstrap not configured' })
    return
  }
  try {
    post({ type: 'diagnostic', message: 'starting loadPyodide' })
    const pyodide = await _loadPyodide({ indexURL: _indexURL })
    post({ type: 'diagnostic', message: 'loadPyodide complete, starting loadPackage(pytest)' })
    post({ type: 'pyodide-ready' })
    await pyodide.loadPackage('pytest')
    post({ type: 'diagnostic', message: 'loadPackage(pytest) complete' })
    post({ type: 'pytest-ready' })
    // T6.4: install the harness module. The pytest-ready → ready
    // segment of ColdStartMetrics now actually measures something
    // (harness_init_ms was ~0ms in stop #2; will be small but
    // non-zero post-T6.4).
    post({ type: 'diagnostic', message: 'installing pytest_harness.py' })
    pyodide.runPython(harnessSource)
    _pyodide = pyodide  // T6.5: handleMessage's execute branch uses this
    post({ type: 'diagnostic', message: 'pytest_harness.py installed' })
    post({ type: 'ready' })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    post({ type: 'diagnostic', message: `boot error: ${message}` })
    post({ type: 'error', message })
    throw e
  }
}

export function handleMessage(post: (m: WorkerOutbound) => void, data: unknown): void {
  if (typeof data !== 'object' || data === null) {
    post({ type: 'error', message: 'unknown message: not an object' }); return
  }
  const msg = data as { type?: unknown; requestId?: unknown }
  if (msg.type === 'execute') { handleExecute(post, data as ExecuteRequest); return }
  const requestId = typeof msg.requestId === 'string' ? msg.requestId : undefined
  post({ type: 'error', message: `unknown message type: ${String(msg.type ?? 'undefined')}`, requestId })
}

function handleExecute(post: (m: WorkerOutbound) => void, req: ExecuteRequest): void {
  const { requestId } = req
  if (!_pyodide) {
    post({ type: 'error', requestId, message: 'pyodide not initialized' }); return
  }
  try {
    const fn = _pyodide.globals.get('run_code_task')
    const py = fn(req.user_code, req.hidden_tests, req.allowlist)
    const result = py.toJs({ dict_converter: Object.fromEntries }) as RunResult
    py.destroy()
    post({ type: 'result', requestId, result })
  } catch (e) {
    post({ type: 'error', requestId, message: e instanceof Error ? e.message : String(e) })
  }
}

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
  const post = (m: WorkerOutbound): void => self.postMessage(m)
  const diag = (message: string): void => post({ type: 'diagnostic', message })

  diag('worker top-level reached')
  const env = (import.meta as ImportMeta & {
    env?: { VITE_PYODIDE_CDN?: string }
  }).env
  const envCdn = env?.VITE_PYODIDE_CDN
  diag(`env check: hasEnv=${typeof env !== 'undefined'} cdn=${envCdn ?? '(undefined)'}`)

  if (!envCdn) {
    diag('env not set; aborting boot')
    post({ type: 'error', message: ENV_NOT_SET_MSG })
    console.error(ENV_NOT_SET_MSG)
  } else {
    try {
      diag(`importing pyodide.mjs from ${envCdn}`)
      const mod = await import(
        /* @vite-ignore */ new URL('pyodide.mjs', envCdn).toString()
      )
      diag('pyodide.mjs imported successfully')
      _setBootEnvForTests(mod.loadPyodide as LoadPyodide, envCdn)
      // Self-boot: no inbound 'boot' message. The browser's postMessage
      // queue semantics broke in practice with TLA + dynamic CDN import,
      // so we drive boot autonomously and the main thread just listens.
      await bootPyodide(post)
      diag('attaching onmessage for post-boot runtime requests')
      self.onmessage = (e: MessageEvent) => {
        const incoming = (e.data as { type?: string } | null)?.type ?? 'unknown'
        diag(`onmessage received: ${incoming}`)
        handleMessage(post, e.data)
      }
    } catch (e) {
      // bootPyodide already posted error + diagnostic before rethrowing.
      // Catch here so the worker module finishes evaluating cleanly
      // (no top-level unhandled rejection on top of the already-posted
      // error message). Stack is still visible in worker DevTools.
      diag(`top-level boot threw: ${e instanceof Error ? e.message : String(e)}`)
      console.error('[pyprep:pyodide-worker] boot failed', e)
    }
  }
}
