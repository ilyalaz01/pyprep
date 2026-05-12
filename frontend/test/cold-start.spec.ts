// T6.11 cold-start CI gate (Playwright).
//
// Loads /cold-start.html (built into dist as a secondary entry), awaits
// `window.__pyprepColdStart`, asserts total_ms < ADR-020 ceiling (12 s).
//
// N036 resolution: protocol-level network throttling via
// `context.route`, NOT DevTools throttling. DevTools throttle doesn't
// propagate to Web Worker fetches (filed in NOTES N036), so the
// original T6.11 design of "DevTools 3G + hope" wouldn't actually be
// measuring under slow-network conditions. The route handler below
// adds a fixed-latency hop to every jsdelivr.net request — works
// inside the worker because Playwright's routing operates at the
// network stack level, below where the worker boundary sits.
//
// 80 ms per jsdelivr hop is a conservative simulation of a mid-tier
// home broadband round trip. Tightening this is a Phase-10 polish if
// the gate ever goes flaky; for now the budget has 2 s of headroom.
import { test, expect } from '@playwright/test'

const COLD_START_BUDGET_MS = 12_000
const THROTTLE_MS_PER_HOP = 80

test('Pyodide cold-start: boot + first runCodeTask within budget', async ({
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
        total_ms: number
        ok: boolean
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
  console.log('cold-start total_ms:', measurement.total_ms.toFixed(0))

  expect(
    measurement.ok,
    `trivial sanity test must pass; stderr=\n${measurement.stderr}`,
  ).toBe(true)
  expect(
    measurement.total_ms,
    `cold-start total_ms=${measurement.total_ms.toFixed(0)} exceeded ` +
      `ADR-020 ceiling ${COLD_START_BUDGET_MS}ms`,
  ).toBeLessThan(COLD_START_BUDGET_MS)
})
