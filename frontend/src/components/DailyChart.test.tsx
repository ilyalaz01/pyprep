// P10.5.S1 — DailyChart wraps CalendarHeatmap. Bar-specific assertions
// were dropped with the rewrite (no more bars, max-scaling, baseline
// indicator, 5-anchor x-axis); the per-cell + grid contract lives in
// CalendarHeatmap.test.tsx. This file pins data flow + async states
// + anti-Duolingo discipline against the live /stats render path.
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

function makeDays(counts: number[], startIso = '2026-02-12'): { days: Array<{ date: string; reviews_total: number; retention: number }> } {
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
    if (url.includes('/api/stats/me/weakness')) return json({ top: [] })
    if (url.includes('/api/stats/me/daily')) {
      if (daily === 'loading') return new Promise(() => {})
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
  test('mounts a calendar-heatmap when data arrives', async () => {
    const counts = Array.from({ length: 90 }, (_, i) => i % 4)
    stubFetch(makeDays(counts))
    renderAt('/stats')
    await screen.findByTestId('daily-chart')
    expect(screen.getByTestId('calendar-heatmap')).toBeInTheDocument()
  })

  test('every non-zero cell has a <title> tooltip with date + singular/plural', async () => {
    stubFetch(makeDays([1, 2, 0]))
    renderAt('/stats')
    await screen.findByTestId('daily-chart')
    const titles = Array.from(
      screen.getByTestId('calendar-heatmap').querySelectorAll('title'),
    ).map((t) => t.textContent)
    expect(titles.some((t) => t?.endsWith(': 1 review'))).toBe(true)
    expect(titles.some((t) => t?.endsWith(': 2 reviews'))).toBe(true)
    expect(titles.some((t) => t?.endsWith(': no reviews'))).toBe(true)
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

  test('cells share a single fill color (no value-coded green/red)', async () => {
    // High-vol day + low-vol day must render with the SAME fill color
    // (var(--color-fg-muted) for both). Magnitude is encoded via opacity,
    // not hue — keeps the monochrome anti-Duolingo discipline.
    stubFetch(makeDays([10, 1, 5, 0, 5, 5, 5]))
    renderAt('/stats')
    await screen.findByTestId('daily-chart')
    const rects = Array.from(
      screen.getByTestId('calendar-heatmap').querySelectorAll('rect'),
    )
    const fills = new Set(
      rects
        .map((r) => r.getAttribute('fill'))
        .filter((f) => f && f !== 'transparent'),
    )
    // Only two distinct fills allowed: zero-day bg-elevated and the
    // single non-zero color (--color-fg-muted, varied via fill-opacity).
    for (const f of fills) {
      expect([
        'var(--color-bg-elevated)',
        'var(--color-fg-muted)',
      ]).toContain(f)
    }
  })
})
