/**
 * HomePage — welcome line uses /me; empty-state placeholder pinned so a
 * future T4.4 PR that fills it sees a deliberate test diff.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { setToken } from '../lib/auth'
import { renderAt } from '../test/router-fixture'

const ME = { id: 'u1', email: 'me@example.com', created_at: '2026-05-09T00:00:00Z' }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  setToken('eyJ.test.token')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/config')) {
        return jsonResponse({ single_user: false, version: '1.00', single_user_email: null })
      }
      if (url.includes('/api/auth/me')) return jsonResponse(ME)
      if (url.includes('/api/modules')) return jsonResponse({ modules: [] })
      if (url.includes('/api/review/queue'))
        return jsonResponse({ card_ids: [], sphere_id: null })
      if (url.includes('/api/stats/me'))
        return jsonResponse({
          reviews_total: 0, retention: 0, streak: 0, xp: 0, orphan_review_count: 0,
        })
      return new Response('not mocked: ' + url, { status: 500 })
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('HomePage', () => {
  test('renders the welcome heading', async () => {
    renderAt('/home')
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
  })

  test('shows the signed-in email once /me resolves', async () => {
    renderAt('/home')
    expect(await screen.findByText(/signed in as/i)).toBeInTheDocument()
    // Email appears in TopBar AND inline in the welcome line — both are
    // me@example.com, so use getAllByText for the assertion.
    const matches = await screen.findAllByText('me@example.com')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  test('shows the modules section heading (real content replaces the T4.3 placeholder)', async () => {
    renderAt('/home')
    expect(await screen.findByText(/^Modules$/)).toBeInTheDocument()
  })
})
