/**
 * P7.T7.6 — PerModuleTable rendering tests.
 *
 * Pins: four rows always rendered (one per PyPrep module), dimmed
 * "no reviews yet" for modules with no data, real-data rows are
 * Link-clickable with correct href, retention bar width tracks the
 * %, singular/plural review count, no gamification glyphs.
 *
 * Uses renderAt because the active-data row is a TanStack <Link>;
 * a plain `render` would throw on missing router context.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen, within } from '@testing-library/react'

import { setToken } from '../lib/auth'
import { renderAt } from '../test/router-fixture'

const json = (b: unknown, s = 200): Response =>
  new Response(JSON.stringify(b), { status: s })
const ME = { id: 'u1', email: 'me@x.com', created_at: '2026-05-12T00:00:00Z' }
const CONFIG = { single_user: false, version: '1.00', single_user_email: null }
// Note: we land on /stats which calls /api/stats/me too — stub it
// alongside per-module so the StatsPage gets out of loading.
const OVERVIEW = {
  reviews_total: 15, retention: 0.6, streak: 1, xp: 41,
  orphan_review_count: 0, total_seconds: 553,
}

function stubFetch(perModule: { modules: Array<{ module_id: number; reviews_total: number; retention: number }> } | { error: true }) {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/api/auth/me')) return json(ME)
    if (url.includes('/api/config')) return json(CONFIG)
    if (url.includes('/api/stats/me/per-module')) {
      return 'error' in perModule
        ? new Response('boom', { status: 500 })
        : json(perModule)
    }
    // T7.7/T7.8 siblings on /stats — return empty so the sibling
    // components render quietly and don't disturb this test's focus.
    if (url.includes('/api/stats/me/daily')) return json({ days: [] })
    if (url.includes('/api/stats/me/weakness')) return json({ top: [] })
    if (url.includes('/api/stats/me')) return json(OVERVIEW)
    return new Response('not mocked: ' + url, { status: 500 })
  }))
}

beforeEach(() => setToken('eyJ.test.token'))
afterEach(() => vi.unstubAllGlobals())

function rowFor(moduleId: number): HTMLElement {
  const el = document.querySelector(`[data-tile="module-${moduleId}"]`)
  if (!el) throw new Error(`module row not found: ${moduleId}`)
  return el as HTMLElement
}

describe('PerModuleTable — structure', () => {
  test('renders one row per PyPrep module (4 total)', async () => {
    stubFetch({ modules: [] })
    renderAt('/stats')
    await screen.findByTestId('per-module-table')
    for (const id of [1, 2, 3, 4]) {
      expect(rowFor(id)).toBeInTheDocument()
    }
  })

  test('module with reviews: clickable link + meta + retention bar', async () => {
    stubFetch({
      modules: [{ module_id: 1, reviews_total: 15, retention: 0.6 }],
    })
    renderAt('/stats')
    await screen.findByTestId('per-module-table')
    const row = rowFor(1)
    expect(row.tagName.toLowerCase()).toBe('a')
    expect(row).toHaveAttribute('href', '/modules/1')
    expect(within(row).getByText(/python core & oop/i)).toBeInTheDocument()
    expect(within(row).getByText(/15 reviews · 60% retention/i)).toBeInTheDocument()
    // Retention bar inner div carries the data-driven width.
    const bar = row.querySelector('[aria-hidden="true"] > div') as HTMLElement | null
    expect(bar).not.toBeNull()
    expect(bar?.style.width).toBe('60%')
  })

  test('singular review count: "1 review", not "1 reviews"', async () => {
    stubFetch({
      modules: [{ module_id: 1, reviews_total: 1, retention: 1 }],
    })
    renderAt('/stats')
    await screen.findByTestId('per-module-table')
    expect(within(rowFor(1)).getByText(/1 review · 100%/i)).toBeInTheDocument()
  })

  test('absent OR reviews_total=0: dimmed, inert, "no reviews yet"', async () => {
    // Two paths produce the same dimmed row: module not in response,
    // and module in response with reviews_total=0 (collapsed into one
    // test rather than two — the row impl branches on the same
    // condition `!stats || stats.reviews_total === 0`).
    stubFetch({
      modules: [{ module_id: 1, reviews_total: 0, retention: 0 }],
    })
    renderAt('/stats')
    await screen.findByTestId('per-module-table')
    for (const id of [1, 2]) {
      const row = rowFor(id)
      expect(row.tagName.toLowerCase()).not.toBe('a')
      expect(within(row).getByText(/no reviews yet/i)).toBeInTheDocument()
    }
  })
})

describe('PerModuleTable — async states', () => {
  test('shows skeleton while loading', async () => {
    // Fetch that never resolves for per-module — overview resolves
    // so StatsPage reaches the ready branch, but the table stays in
    // loading.
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/auth/me')) return json(ME)
      if (url.includes('/api/config')) return json(CONFIG)
      if (url.includes('/api/stats/me/per-module')) {
        return new Promise(() => {}) // never resolves
      }
      if (url.includes('/api/stats/me/daily')) return json({ days: [] })
      if (url.includes('/api/stats/me/weakness')) return json({ top: [] })
      if (url.includes('/api/stats/me')) return json(OVERVIEW)
      return new Response('not mocked: ' + url, { status: 500 })
    }))
    renderAt('/stats')
    expect(await screen.findByTestId('per-module-skeleton')).toBeInTheDocument()
  })

  test('failure is quiet — small inline note, not a page banner', async () => {
    stubFetch({ error: true })
    renderAt('/stats')
    expect(await screen.findByTestId('per-module-quiet')).toBeInTheDocument()
    // Page-level error Banner stays absent (overview succeeded).
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('PerModuleTable — anti-Duolingo discipline', () => {
  test('no gamification glyphs anywhere', async () => {
    stubFetch({
      modules: [
        { module_id: 1, reviews_total: 12, retention: 0.83 },
        { module_id: 3, reviews_total: 4, retention: 0.25 },
      ],
    })
    const { container } = renderAt('/stats')
    await screen.findByTestId('per-module-table')
    const text = container.textContent ?? ''
    for (const banned of ['🔥', '✨', '🎉', '🏆', '🥇', '⭐', '💯']) {
      expect(text).not.toContain(banned)
    }
  })

  test('low-retention module is NOT shame-coded (same row shape as high)', async () => {
    stubFetch({
      modules: [
        { module_id: 1, reviews_total: 8, retention: 0.1 }, // very low
      ],
    })
    renderAt('/stats')
    await screen.findByTestId('per-module-table')
    const row = rowFor(1)
    // No "needs work" / "weak" / "struggling" / shame copy.
    const text = row.textContent?.toLowerCase() ?? ''
    for (const banned of ['needs work', 'weak', 'struggling', 'poor', 'bad']) {
      expect(text).not.toContain(banned)
    }
  })
})
