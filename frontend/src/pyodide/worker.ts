// Pyodide Web Worker entry (Phase 6 / T6.3 — self-bootstrapping).
//
// Stop-#2 retry diagnosis: with Vite ES-module workers + TLA +
// dynamic CDN import, the browser's "queue postMessage until
// onmessage attaches" guarantee broke in practice. The main thread
// posted 'boot' before the worker's top-level finished, and the
// worker never observed the message. Owner's fix: drop the boot
// handshake entirely. The worker self-initializes at top-level;
// the main thread just listens for 'ready'.
//
// Boot path now:
//   1. CodeTaskCard mount → bootPyodideWorker() creates worker.
//   2. Worker imports pyodide.mjs, calls loadPyodide, then
//      loadPackage('pytest'), emits pyodide-ready / pytest-ready /
//      ready signals along the way — all at module top-level.
//   3. Main-thread loader.ts captures the timestamps as before.
//   4. After boot, worker attaches onmessage for future runtime
//      requests (T6.5 'execute' etc). By that point onmessage
//      semantics are reliable.
import type { ColdStartMetrics as _Metrics } from './types' // contract import
void (null as unknown as _Metrics)

// T6.4: the harness is bundled as a string asset via Vite's ?raw
// query. After loadPackage('pytest'), the worker hands the source
// to `pyodide.runPython(harness)` which installs `run_code_task`
// in the Pyodide globals (T6.5 wires the JS-side call).
import harnessSource from './pytest_harness.py?raw'

export type WorkerInbound = { type: 'execute' } | { type: string }
export type WorkerOutbound =
  | { type: 'pyodide-ready' }
  | { type: 'pytest-ready' }
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'diagnostic'; message: string }

interface PyodideInstance {
  loadPackage(name: string | string[]): Promise<unknown>
  runPython(code: string): unknown
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
    post({ type: 'diagnostic', message: 'pytest_harness.py installed' })
    post({ type: 'ready' })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    post({ type: 'diagnostic', message: `boot error: ${message}` })
    post({ type: 'error', message })
    throw e
  }
}

export function handleMessage(
  post: (m: WorkerOutbound) => void,
  data: unknown,
): void {
  // Post-boot runtime messages only — T6.5 'execute' lands here.
  // 'boot' is no longer a valid inbound (worker self-bootstraps).
  if (typeof data !== 'object' || data === null) {
    post({ type: 'error', message: 'unknown message: not an object' })
    return
  }
  const msg = data as { type?: unknown }
  post({
    type: 'error',
    message: `unknown message type: ${String(msg.type ?? 'undefined')}`,
  })
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
