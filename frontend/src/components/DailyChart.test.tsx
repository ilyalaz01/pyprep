// P7.T7.7 — DailyChart rendering tests. Pins 30 bars, proportional
// heights, 1px baseline on zero days, 5 anchor x-axis labels,
// tooltips, anti-Duolingo glyphs, async states.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { setToken } from '../lib/auth'
import { renderAt } from '../test/router-fixture'

const json = (b: unknown, s = 200): Response =>
  new Response(JSON.stringify(b), { status: s })
const ME = { id: 'u1', email: 'me@x.com', created_at: '2026-05-12T00:00:00Z' }
const CONFIG = { single_user: false, version: '1.00', single_user_email: null }
const OVERVIEW = {
  reviews_total: 15, retention: 0.6, streak: 1, xp: 41,
  orphan_review_count: 0, total_seconds: 553,
}

function makeDays(counts: number[], startIso = '2026-04-13'): { days: Array<{ date: string; reviews_total: number; retention: number }> } {
  const start = new Date(`${startIso}T00:00:00Z`)
  return {
    days: counts.map((n, i) => {
      const d = new Date(start)
      d.setUTCDate(start.getUTCDate() + i)
      return {
        date: d.toISOString().slice(0, 10),
        reviews_total: n,
        retention: n > 0 ? 0.8 : 0,
      }
    }),
  }
}

function stubFetch(daily: { days: Array<{ date: string; reviews_total: number; retention: number }> } | { error: true } | 'loading') {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/api/auth/me')) return json(ME)
    if (url.includes('/api/config')) return json(CONFIG)
    if (url.includes('/api/stats/me/per-module')) return json({ modules: [] })
    // T7.8 sibling on /stats — return empty so it doesn't disturb
    // this test's focus on the daily chart.
    if (url.includes('/api/stats/me/weakness')) return json({ top: [] })
    if (url.includes('/api/stats/me/daily')) {
      if (daily === 'loading') return new Promise(() => {}) // never resolves
      return 'error' in daily
        ? new Response('boom', { status: 500 })
        : json(daily)
    }
    if (url.includes('/api/stats/me')) return json(OVERVIEW)
    return new Response('not mocked: ' + url, { status: 500 })
  }))
}

beforeEach(() => setToken('eyJ.test.token'))
afterEach(() => vi.unstubAllGlobals())

describe('DailyChart — structure', () => {
  test('renders 30 bars when 30 days returned', async () => {
    const counts = Array.from({ length: 30 }, (_, i) => i % 4)
    stubFetch(makeDays(counts))
    renderAt('/stats')
    await screen.findByTestId('daily-chart')
    const svg = screen.getByTestId('daily-chart')
    expect(svg.querySelectorAll('rect')).toHaveLength(30)
  })

  test('bar height proportional to reviews / max', async () => {
    // Day 0: 5 reviews (max), Day 1: 1 review → height ratio ~5:1.
    const counts = [5, 1, ...Array(28).fill(0)]
    stubFetch(makeDays(counts))
    renderAt('/stats')
    await screen.findByTestId('daily-chart')
    const rects = screen.getByTestId('daily-chart').querySelectorAll('rect')
    const day0H = Number(rects[0].getAttribute('height'))
    const day1H = Number(rects[1].getAttribute('height'))
    expect(day0H).toBeGreaterThan(day1H)
    // Day 0 = max → bar should occupy ~70 viewBox units (MAX_BAR_H).
    expect(day0H).toBeGreaterThanOrEqual(65)
  })

  test('zero-review days render a 1px baseline (not invisible)', async () => {
    stubFetch(makeDays(Array(30).fill(0)))
    renderAt('/stats')
    await screen.findByTestId('daily-chart')
    const rects = screen.getByTestId('daily-chart').querySelectorAll('rect')
    for (const r of rects) {
      expect(r.getAttribute('data-bar-zero')).toBe('true')
      expect(Number(r.getAttribute('height'))).toBe(1)
    }
  })

  test('every bar has a <title> tooltip with date + singular/plural', async () => {
    const counts = [1, 2, 0, ...Array(27).fill(3)]
    stubFetch(makeDays(counts))
    renderAt('/stats')
    await screen.findByTestId('daily-chart')
    const rects = screen.getByTestId('daily-chart').querySelectorAll('rect')
    expect(rects[0].querySelector('title')?.textContent).toMatch(/1 review$/)
    expect(rects[1].querySelector('title')?.textContent).toMatch(/2 reviews$/)
    expect(rects[2].querySelector('title')?.textContent).toMatch(/no reviews$/)
  })

  test('5 x-axis date labels at the per-7-day anchors', async () => {
    stubFetch(makeDays(Array(30).fill(0), '2026-04-13'))
    renderAt('/stats')
    await screen.findByTestId('daily-chart')
    // Anchors: indices 0, 7, 14, 21, 29 of a 30-day window
    // starting 2026-04-13 → Apr 13, Apr 20, Apr 27, May 4, May 12.
    for (const expected of ['Apr 13', 'Apr 20', 'Apr 27', 'May 4', 'May 12']) {
      expect(screen.getByText(expected)).toBeInTheDocument()
    }
  })

  test('shorter window renders only the available anchor labels', async () => {
    stubFetch(makeDays([1, 2, 3], '2026-05-10'))
    renderAt('/stats')
    await screen.findByTestId('daily-chart')
    expect(screen.getByText('May 10')).toBeInTheDocument()
    expect(screen.getByText('May 12')).toBeInTheDocument()
  })
})

describe('DailyChart — async states', () => {
  test('loading shows skeleton (aria-hidden, no chart)', async () => {
    stubFetch('loading')
    renderAt('/stats')
    expect(await screen.findByTestId('daily-chart-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('daily-chart')).not.toBeInTheDocument()
  })

  test('error is quiet — inline note, no page banner', async () => {
    stubFetch({ error: true })
    renderAt('/stats')
    expect(await screen.findByTestId('daily-chart-quiet')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('empty days array shows "No daily activity yet"', async () => {
    stubFetch({ days: [] })
    renderAt('/stats')
    expect(await screen.findByTestId('daily-chart-empty')).toBeInTheDocument()
  })
})

describe('DailyChart — anti-Duolingo discipline (ADR-025)', () => {
  test('no gamification glyphs in the rendered output', async () => {
    stubFetch(makeDays([3, 5, 1, 0, 2, 4, 0]))
    const { container } = renderAt('/stats')
    await screen.findByTestId('daily-chart')
    const text = container.textContent ?? ''
    for (const banned of ['🔥', '✨', '🎉', '🏆', '🥇', '⭐', '💯']) {
      expect(text).not.toContain(banned)
    }
  })

  test('bars are monochrome (no color-coded "good vs bad" days)', async () => {
    // High-vol day + low-vol day must render with the SAME fill color
    // (var(--color-fg-muted) for both). Coloring by value would
    // shame-code low-activity days.
    stubFetch(makeDays([10, 1, ...Array(28).fill(5)]))
    renderAt('/stats')
    await screen.findByTestId('daily-chart')
    const rects = screen.getByTestId('daily-chart').querySelectorAll('rect')
    const high = rects[0].getAttribute('fill')
    const low = rects[1].getAttribute('fill')
    expect(high).toBe(low)
  })
})
