/**
 * P7.T7.4 — StatsPage state machine.
 *
 * Four branches pinned: loading skeleton · error+Retry · empty state
 * (calm "stats appear here…" + Start CTA, per owner-clarified
 * anti-Duolingo discipline) · ready placeholder (T7.5+ swaps real
 * cards in). Fetch-stubbed end-to-end through renderAt — no useQuery
 * mocking, so the queryKey wiring is exercised too.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { setToken } from '../lib/auth'
import { renderAt } from '../test/router-fixture'

const json = (b: unknown, s = 200): Response =>
  new Response(JSON.stringify(b), { status: s })

const ME = { id: 'u1', email: 'me@x.com', created_at: '2026-05-12T00:00:00Z' }
const CONFIG = { single_user: false, version: '1.00', single_user_email: null }
const OVERVIEW_EMPTY = {
  reviews_total: 0, retention: 0, streak: 0, xp: 0,
  orphan_review_count: 0, total_seconds: 0,
}
const OVERVIEW_FULL = {
  reviews_total: 12, retention: 0.83, streak: 3, xp: 45,
  orphan_review_count: 0, total_seconds: 720,
}

function stubFetch(overview: unknown, opts: { fail?: boolean } = {}) {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/api/auth/me')) return json(ME)
    if (url.includes('/api/config')) return json(CONFIG)
    if (url.includes('/api/stats/me')) {
      return opts.fail
        ? new Response('boom', { status: 500 })
        : json(overview)
    }
    return new Response('not mocked: ' + url, { status: 500 })
  }))
}

beforeEach(() => setToken('eyJ.test.token'))
afterEach(() => vi.unstubAllGlobals())

describe('StatsPage — state machine', () => {
  test('loading shows the skeleton, not "Loading…" text', async () => {
    stubFetch(OVERVIEW_EMPTY)
    renderAt('/stats')
    expect(await screen.findByTestId('stats-skeleton')).toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  test('empty state when reviews_total === 0 shows calm copy + Start CTA', async () => {
    stubFetch(OVERVIEW_EMPTY)
    renderAt('/stats')
    expect(await screen.findByTestId('stats-empty')).toBeInTheDocument()
    expect(
      screen.getByText(/stats appear here after your first session/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start a session/i }))
      .toHaveAttribute('href', '/home')
  })

  test('empty state contains NO shame/guilt copy (anti-Duolingo)', async () => {
    stubFetch(OVERVIEW_EMPTY)
    const { container } = renderAt('/stats')
    await screen.findByTestId('stats-empty')
    const body = container.textContent ?? ''
    // Anti-pattern phrases owners called out — pin them absent.
    for (const banned of [
      /you haven't/i,
      /you have not/i,
      /no reviews yet/i,
      /missed/i,
      /broken streak/i,
      /streak.*lost/i,
    ]) {
      expect(body).not.toMatch(banned)
    }
  })

  test('error state shows Banner alert + Retry button', async () => {
    stubFetch(OVERVIEW_EMPTY, { fail: true })
    renderAt('/stats')
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  test('Retry refetches /api/stats/me — recovers from transient failure', async () => {
    // First call fails, second succeeds. Mock fetch to flip behavior.
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/auth/me')) return json(ME)
      if (url.includes('/api/config')) return json(CONFIG)
      if (url.includes('/api/stats/me')) {
        calls += 1
        return calls === 1
          ? new Response('transient', { status: 500 })
          : json(OVERVIEW_FULL)
      }
      return new Response('not mocked: ' + url, { status: 500 })
    }))
    renderAt('/stats')
    await screen.findByRole('button', { name: /retry/i })
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(await screen.findByTestId('stats-ready')).toBeInTheDocument()
  })

  test('ready state when reviews_total > 0 shows the dashboard surface', async () => {
    stubFetch(OVERVIEW_FULL)
    renderAt('/stats')
    expect(await screen.findByTestId('stats-ready')).toBeInTheDocument()
    // T7.4 placeholder shows the raw reviews_total; T7.5 swaps in cards.
    expect(screen.getByText(/12 reviews so far/i)).toBeInTheDocument()
  })
})
