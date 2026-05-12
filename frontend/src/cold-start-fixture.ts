// Cold-start + NFR-SBX-2 fixture (T6.11 + P6.5/P1-3). Boots Pyodide,
// then runs the same realistic code_task three times: once cold (boot +
// first execute) and twice more in the warm session. Exposes the
// timings on `window.__pyprepColdStart` for the Playwright spec.
//
// CI-only path. The fixture HTML is reachable at /cold-start.html in
// dist but isn't linked from the SPA. Owner-facing behaviour is
// unchanged.
//
// **Workload** — m1-s1-c12 (Date.from_string), one of seven Module 1
// code_tasks. Picked for mid-complexity: 3 tests, an `import pytest`,
// a classmethod constructor + iso parser. Not the trivial `def add`
// from T6.11 (audit P1-3 flagged that as under-measuring the user's
// actual first-touch experience). The card body is mirrored here from
// content/modules/01_python_core_oop/01_class_architecture.cards.json;
// a content change to that card needs a paired update here.
//
// **Two budgets, one boot.** The cold-start budget (ADR-020, 12 s)
// gates boot + first execute. The NFR-SBX-2 budget (1.5 s, P6.5/P1-3)
// gates each subsequent run in the same session. The spec splits
// these into separate expect() calls so a failure points at the right
// gate.
import { runCodeTask } from './pyodide/runner'
import { getColdStartMetrics } from './pyodide/loader'

declare global {
  interface Window {
    __pyprepColdStart?: Promise<{
      cold_ms: number
      subsequent_ms: number[]
      cold_ok: boolean
      subsequent_oks: boolean[]
      stderr: string
      metrics: ReturnType<typeof getColdStartMetrics>
    }>
  }
}

const WORKLOAD_CODE = `\
class Date:
    def __init__(self, year: int, month: int, day: int):
        self.year = year
        self.month = month
        self.day = day

    @classmethod
    def from_string(cls, s: str):
        y, m, d = (int(part) for part in s.split('-'))
        return cls(y, m, d)
`
const WORKLOAD_TESTS = `\
import pytest
from solution import Date

def test_init_stores_attributes():
    d = Date(2026, 5, 7)
    assert (d.year, d.month, d.day) == (2026, 5, 7)

def test_from_string_parses_iso_like_date():
    d = Date.from_string('2026-05-07')
    assert (d.year, d.month, d.day) == (2026, 5, 7)

def test_from_string_returns_subclass_instance():
    class Holiday(Date):
        pass
    h = Holiday.from_string('2026-01-01')
    assert isinstance(h, Holiday)
`
const ALLOWLIST = ['pytest']
const SUBSEQUENT_RUNS = 2

window.__pyprepColdStart = (async () => {
  // Cold: boot + first execute. Generous timeout (worst-case Pyodide
  // load on a CI runner is ~10 s before this even starts).
  const t0 = performance.now()
  const cold = await runCodeTask(WORKLOAD_CODE, WORKLOAD_TESTS, ALLOWLIST, {
    timeout_ms: 30_000,
  })
  const cold_ms = performance.now() - t0

  // Subsequent: same worker, same allowlist, fresh tmp dir per call
  // (per FR-SBX-6 namespace reset). These measure NFR-SBX-2.
  const subsequent_ms: number[] = []
  const subsequent_oks: boolean[] = []
  let last_stderr = cold.stderr
  for (let i = 0; i < SUBSEQUENT_RUNS; i++) {
    const s0 = performance.now()
    const r = await runCodeTask(WORKLOAD_CODE, WORKLOAD_TESTS, ALLOWLIST, {
      timeout_ms: 10_000,
    })
    subsequent_ms.push(performance.now() - s0)
    subsequent_oks.push(r.ok)
    if (!r.ok) last_stderr = r.stderr
  }

  return {
    cold_ms,
    subsequent_ms,
    cold_ok: cold.ok,
    subsequent_oks,
    stderr: last_stderr,
    metrics: getColdStartMetrics(),
  }
})()
