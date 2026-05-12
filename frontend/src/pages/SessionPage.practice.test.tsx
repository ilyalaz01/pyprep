// P7.T7.9 / ADR-026 — "Practice anyway" CTA + ?practice=true flow.
// Pins: caught-up empty state shows the CTA with ?practice=true href,
// no-cards-authored empty state does NOT, and the search param flows
// into useSession as overrideDailyCap. Split from SessionPage.test.tsx
// to keep both under the 150-LOC gate.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { setToken } from '../lib/auth'
import { renderAt } from '../test/router-fixture'
import * as useSessionModule from '../lib/use-session'
import type { UseSessionResult } from '../lib/use-session'
import { emptyDetails } from '../lib/session-details'

vi.mock('../lib/use-session', () => ({ useSession: vi.fn() }))
vi.mock('../components/CodeMirrorEditor', () => ({
  CodeMirrorEditor: ({ initialDoc }: { initialDoc: string }) => (
    <textarea data-testid="codemirror-mock" defaultValue={initialDoc} />
  ),
}))
vi.mock('../pyodide/loader', () => ({
  bootPyodideWorker: vi.fn(() => Promise.resolve()),
  getColdStartMetrics: vi.fn(),
}))

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s })
const ME = { id: 'u1', email: 'me@x.com', created_at: '2026-05-12T00:00:00Z' }
const CONFIG = { single_user: false, version: '1.00', single_user_email: null }
const stubMe = () => vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
  const url = typeof input === 'string' ? input : input.toString()
  if (url.includes('/api/auth/me')) return json(ME)
  if (url.includes('/api/config')) return json(CONFIG)
  return new Response('not mocked: ' + url, { status: 500 })
}))
const mockSession = (over: Partial<UseSessionResult>): UseSessionResult => ({
  status: 'loading', error: null, currentCard: null,
  currentAttemptIndex: 0,
  cardsTotal: 0, completedCount: 0, summary: null,
  totalCardsInSphere: null, details: emptyDetails(),
  submitAnswer: vi.fn(), finish: vi.fn(),
  ...over,
})

const SESSION_URL = '/modules/1/sphere/m1-s0/session'
const useSessionMock = () => vi.mocked(useSessionModule.useSession)

beforeEach(() => {
  setToken('eyJ.test.token')
  stubMe()
  vi.mocked(useSessionModule.useSession).mockReset()
})
afterEach(() => vi.unstubAllGlobals())

describe('SessionPage — Practice anyway (P7.T7.9 / ADR-026)', () => {
  test('caught-up empty state shows "Practice anyway" with ?practice=true', async () => {
    useSessionMock().mockReturnValue(mockSession({
      status: 'finished', cardsTotal: 0, totalCardsInSphere: 12,
    }))
    renderAt(SESSION_URL)
    const cta = await screen.findByRole('link', { name: /practice anyway/i })
    expect(cta).toHaveAttribute('href', expect.stringMatching(/practice=true/))
  })

  test('no-cards-authored empty state does NOT show the CTA', async () => {
    useSessionMock().mockReturnValue(mockSession({
      status: 'finished', cardsTotal: 0, totalCardsInSphere: 0,
    }))
    renderAt(SESSION_URL)
    await screen.findByText(/no cards yet/i)
    expect(screen.queryByRole('link', { name: /practice anyway/i }))
      .not.toBeInTheDocument()
  })

  test('?practice=true → overrideDailyCap=true into useSession', async () => {
    useSessionMock().mockReturnValue(mockSession({ status: 'loading' }))
    renderAt(`${SESSION_URL}?practice=true`)
    await screen.findByTestId('session-skeleton')
    const lastCall = useSessionMock().mock.calls.at(-1)?.[0]
    expect(lastCall?.overrideDailyCap).toBe(true)
  })

  test('default (no search param) → overrideDailyCap=false', async () => {
    useSessionMock().mockReturnValue(mockSession({ status: 'loading' }))
    renderAt(SESSION_URL)
    await screen.findByTestId('session-skeleton')
    const lastCall = useSessionMock().mock.calls.at(-1)?.[0]
    expect(lastCall?.overrideDailyCap).toBe(false)
  })
})
