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
  type: 'pyodide-ready' | 'pytest-ready' | 'ready' | 'error'
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
        // Stop #2 instrumentation (T6.3). Owner reads these three
        // numbers off DevTools console under cold-cache / warm-cache /
        // slow-3G conditions. One-shot per SPA session (boot is a
        // singleton per ADR-018), so production noise is bounded.
        console.info('[pyprep:pyodide] cold-start', _metrics)
        resolve()
      } else if (d.type === 'error') {
        reject(new Error(d.message ?? 'pyodide worker error'))
      }
    }
    _worker.onerror = (ev: ErrorEvent) =>
      reject(new Error(ev.message || 'pyodide worker onerror'))
    _worker.postMessage({ type: 'boot' })
  })
  return _readyPromise
}

export function getColdStartMetrics(): Readonly<ColdStartMetrics> {
  return { ..._metrics }
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
