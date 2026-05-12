// T6.11 cold-start CI gate + P6.5/P1-3 NFR-SBX-2 hot-path gate
// (Playwright).
//
// Loads /cold-start.html (a secondary Vite entry in dist), awaits
// `window.__pyprepColdStart`, and asserts TWO budgets independently:
//
//   1. **Cold-start (ADR-020, 12 s)** — boot + first runCodeTask
//      completion on the realistic Date.from_string workload (P6.5/P1-3
//      replaced the trivial `def add` with a real Module 1 code_task
//      after the audit flagged the original workload as
//      under-measuring user-visible cold-start).
//
//   2. **NFR-SBX-2 hot-path (1.5 s)** — each subsequent runCodeTask in
//      the same session, same worker, fresh namespace per call. The
//      PRD aspiration is ≤ 1 s; 1.5 s ceiling adds CI-variance
//      headroom while still failing on a real regression (e.g. a
//      forgotten worker termination or a per-run pytest reload).
//
// Two separate expect() calls so a regression points at the right
// gate without ambiguity.
//
// N036 resolution: protocol-level network throttling via
// `context.route`. DevTools throttle doesn't propagate to Web Worker
// fetches; the route handler below adds a fixed-latency hop to every
// jsdelivr.net request — works inside the worker because Playwright's
// routing operates at the network stack level, below the worker
// boundary. 80 ms per jsdelivr hop = mid-tier home broadband round
// trip; tightening is Phase-10 polish if the gate goes flaky.
import { test, expect } from '@playwright/test'

const COLD_START_BUDGET_MS = 12_000
const NFR_SBX_2_BUDGET_MS = 1_500
const THROTTLE_MS_PER_HOP = 80

test('Pyodide cold-start + NFR-SBX-2 hot path within budgets', async ({
  page,
  context,
}) => {
  await context.route('https://cdn.jsdelivr.net/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS_PER_HOP))
    await route.continue()
  })

  await page.goto('/cold-start.html', { waitUntil: 'load' })

  const measurement = await page.evaluate(async () => {
    const w = window as unknown as {
      __pyprepColdStart?: Promise<{
        cold_ms: number
        subsequent_ms: number[]
        cold_ok: boolean
        subsequent_oks: boolean[]
        stderr: string
        metrics: Record<string, number | null>
      }>
    }
    if (!w.__pyprepColdStart) {
      throw new Error('cold-start fixture did not register window.__pyprepColdStart')
    }
    return w.__pyprepColdStart
  })

  console.log('cold-start metrics:', JSON.stringify(measurement.metrics))
  console.log('cold_ms:', measurement.cold_ms.toFixed(0))
  console.log('subsequent_ms:', JSON.stringify(measurement.subsequent_ms.map((n) => Math.round(n))))

  // Sanity: the realistic workload must actually pass in Pyodide.
  // A false negative here means cold-start.html is wired wrong, not
  // that the gate is wrong. Surface stderr so debugging is one log
  // away.
  expect(
    measurement.cold_ok,
    `cold-start sanity: realistic workload (m1-s1-c12 Date.from_string) ` +
      `must pass; stderr=\n${measurement.stderr}`,
  ).toBe(true)
  expect(
    measurement.subsequent_oks.every(Boolean),
    `hot-path sanity: every subsequent run must pass; stderr=\n${measurement.stderr}`,
  ).toBe(true)

  // Cold-start budget (ADR-020).
  expect(
    measurement.cold_ms,
    `cold_ms=${measurement.cold_ms.toFixed(0)} exceeded ADR-020 ceiling ` +
      `${COLD_START_BUDGET_MS}ms`,
  ).toBeLessThan(COLD_START_BUDGET_MS)

  // NFR-SBX-2 hot-path budget — max of the subsequent runs. If a
  // single subsequent run trips the gate, that's worth flagging
  // (warm-path latency variance is the regression mode we care about).
  const maxSubsequent = Math.max(...measurement.subsequent_ms)
  expect(
    maxSubsequent,
    `max subsequent run=${maxSubsequent.toFixed(0)}ms exceeded NFR-SBX-2 ` +
      `ceiling ${NFR_SBX_2_BUDGET_MS}ms ` +
      `(all runs: ${JSON.stringify(measurement.subsequent_ms.map((n) => Math.round(n)))})`,
  ).toBeLessThan(NFR_SBX_2_BUDGET_MS)
})
