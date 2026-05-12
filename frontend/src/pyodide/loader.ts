// Pyodide loader (Phase 6 / T6.1). Singleton worker boot + cold-start
// instrumentation. The clock owned here is the single source of truth
// — stop #2 verification reads getColdStartMetrics() programmatically
// and the T6.11 CI gate reads the same accessor, no duplicated math.
//
// Three segments per ADR/owner pre-flight:
//   pyodide_load_ms  — new Worker() → worker reports 'pyodide-ready'
//   pytest_load_ms   — pyodide-ready → worker reports 'pytest-ready'
//   harness_init_ms  — pytest-ready → worker reports 'ready'
// total_ms = sum (within rounding); recorded with the final signal.
//
// Worker is created exactly once per SPA session (ADR-018). Termination
// + respawn happens via the timeout path in T6.8, not here.
import type { ColdStartMetrics } from './types'

type WorkerFactory = () => Worker

interface BootMessage {
  type: 'pyodide-ready' | 'pytest-ready' | 'ready' | 'error' | 'diagnostic'
  message?: string
}

let _metrics: ColdStartMetrics = {
  pyodide_load_ms: null,
  pytest_load_ms: null,
  harness_init_ms: null,
  total_ms: null,
}
let _worker: Worker | null = null
let _readyPromise: Promise<void> | null = null

function defaultFactory(): Worker {
  return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
}

export function bootPyodideWorker(
  factory: WorkerFactory = defaultFactory,
): Promise<void> {
  // React 19 Strict Mode runs useEffect twice in dev; the cached
  // promise is returned on the second call.
  if (_readyPromise) return _readyPromise
  const t0 = performance.now()
  _worker = factory()
  _readyPromise = new Promise<void>((resolve, reject) => {
    if (!_worker) return reject(new Error('worker factory returned null'))
    let pyodideAt: number | null = null
    let pytestAt: number | null = null
    _worker.onmessage = (e: MessageEvent<BootMessage>) => {
      const now = performance.now()
      const d = e.data
      if (d.type === 'diagnostic') {
        // Worker-internal trace; dev-only surface.
        if (import.meta.env.DEV) {
          console.info('[pyprep:pyodide-worker]', d.message)
        }
        return
      }
      if (d.type === 'pyodide-ready') {
        pyodideAt = now
        _metrics = { ..._metrics, pyodide_load_ms: now - t0 }
      } else if (d.type === 'pytest-ready') {
        pytestAt = now
        _metrics = {
          ..._metrics,
          pytest_load_ms: pyodideAt === null ? null : now - pyodideAt,
        }
      } else if (d.type === 'ready') {
        _metrics = {
          ..._metrics,
          harness_init_ms: pytestAt === null ? null : now - pytestAt,
          total_ms: now - t0,
        }
        // Cold-start metrics: dev-only console surface; CI gate reads
        // the same numbers via getColdStartMetrics(). Singleton boot
        // (ADR-018) bounds the noise to one emission per SPA session.
        if (import.meta.env.DEV) {
          console.info('[pyprep:pyodide] cold-start', _metrics)
        }
        resolve()
      } else if (d.type === 'error') {
        reject(new Error(d.message ?? 'pyodide worker error'))
      }
    }
    _worker.onerror = (ev: ErrorEvent) =>
      reject(new Error(ev.message || 'pyodide worker onerror'))
    // No postMessage('boot') — the worker self-bootstraps at top-level
    // and emits 'ready' autonomously. Stop-#2 retry diagnosed that the
    // browser's "queue postMessage until onmessage attaches" guarantee
    // broke in practice with Vite ES-module workers + TLA + dynamic
    // CDN import; messages posted in that window were dropped.
  })
  return _readyPromise
}

export function getColdStartMetrics(): Readonly<ColdStartMetrics> {
  return { ..._metrics }
}

// Worker accessor for runner.ts (T6.5). After bootPyodideWorker() resolves,
// the worker is ready for 'execute' messages. Returns null pre-boot.
export function getPyodideWorker(): Worker | null {
  return _worker
}

// T6.8: terminate the current worker and reset the singleton + metrics.
// Called by runner.ts on timeout (FR-SBX-4). The next bootPyodideWorker()
// call reconstructs a fresh worker, paying the cold-start cost again —
// acceptable per the proposal; FR-SBX-4 doesn't mandate fast recovery.
export function invalidateWorker(): void {
  if (_worker) {
    try { _worker.terminate() } catch { /* no-op */ }
    _worker = null
  }
  _readyPromise = null
  _metrics = {
    pyodide_load_ms: null,
    pytest_load_ms: null,
    harness_init_ms: null,
    total_ms: null,
  }
}

// Test-only escape hatch. Resets the singleton so the test suite can
// drive boot() multiple times against fresh mock workers. Underscore-
// prefixed to mark non-production; not re-exported via index/barrel.
export function _resetLoaderForTests(): void {
  if (_worker) {
    try { _worker.terminate() } catch { /* no-op */ }
  }
  _worker = null
  _readyPromise = null
  _metrics = {
    pyodide_load_ms: null,
    pytest_load_ms: null,
    harness_init_ms: null,
    total_ms: null,
  }
}
