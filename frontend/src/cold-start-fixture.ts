// Cold-start fixture entry (T6.11). Boots the Pyodide worker exactly
// once, runs a trivial code_task, then exposes ColdStartMetrics on
// `window` for the Playwright spec to read.
//
// CI-only path. The fixture HTML is reachable at /cold-start.html
// in dist but isn't linked from the SPA. Owner-facing behaviour is
// unchanged.
//
// We measure end-to-end (boot + first runCodeTask completion). That
// matches what the user experiences on first click of Run, and is the
// honest reading of "time-to-first-runCodeTask-ready". The PRD budget
// NFR-SBX-1 is cold-load only; the gate measures cold-load + first
// execute together because that's the user signal.
import { runCodeTask } from './pyodide/runner'
import { getColdStartMetrics } from './pyodide/loader'

declare global {
  interface Window {
    __pyprepColdStart?: Promise<{
      total_ms: number
      ok: boolean
      stderr: string
      metrics: ReturnType<typeof getColdStartMetrics>
    }>
  }
}

const TRIVIAL_CODE = 'def add(a, b):\n    return a + b\n'
const TRIVIAL_TESTS =
  'from solution import add\n\ndef test_add():\n    assert add(1, 2) == 3\n'

window.__pyprepColdStart = (async () => {
  const t0 = performance.now()
  const result = await runCodeTask(TRIVIAL_CODE, TRIVIAL_TESTS, [], {
    timeout_ms: 30_000,
  })
  const t1 = performance.now()
  return {
    total_ms: t1 - t0,
    ok: result.ok,
    stderr: result.stderr,
    metrics: getColdStartMetrics(),
  }
})()
