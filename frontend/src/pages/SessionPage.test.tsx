import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { setToken } from '../lib/auth'
import { renderAt } from '../test/router-fixture'
import * as useSessionModule from '../lib/use-session'
import type { UseSessionResult } from '../lib/use-session'
import { emptyDetails } from '../lib/session-details'
import {
  codeTaskRaw, codeTrapRaw, fillInRaw, flipRaw, mcRaw, next,
} from '../test/card-fixtures'

vi.mock('../lib/use-session', () => ({ useSession: vi.fn() }))
vi.mock('../components/CodeMirrorEditor', () => ({
  CodeMirrorEditor: ({ initialDoc }: { initialDoc: string }) => (
    <textarea data-testid="codemirror-mock" defaultValue={initialDoc} />
  ),
}))

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s })
const ME = { id: 'u1', email: 'me@example.com', created_at: '2026-05-09T00:00:00Z' }
const CONFIG = { single_user: false, version: '1.00', single_user_email: null }
const stubMe = () => vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
  const url = typeof input === 'string' ? input : input.toString()
  if (url.includes('/api/auth/me')) return json(ME)
  if (url.includes('/api/config')) return json(CONFIG)
  return new Response('not mocked: ' + url, { status: 500 })
}))
const mockSession = (over: Partial<UseSessionResult>): UseSessionResult => ({
  status: 'loading', error: null, currentCard: null,
  cardsTotal: 0, completedCount: 0, summary: null,
  totalCardsInSphere: null, details: emptyDetails(),
  submitAnswer: vi.fn(), finish: vi.fn(),
  ...over,
})

const SESSION_URL = '/modules/1/sphere/m1-s0/session'

beforeEach(() => {
  setToken('eyJ.test.token')
  stubMe()
  vi.mocked(useSessionModule.useSession).mockReset()
})
afterEach(() => vi.unstubAllGlobals())

const useSessionMock = () => vi.mocked(useSessionModule.useSession)

describe('SessionPage — state machine', () => {
  test('loading shows the skeleton, not "Loading…" text', async () => {
    useSessionMock().mockReturnValue(mockSession({ status: 'loading' }))
    renderAt(SESSION_URL)
    expect(await screen.findByTestId('session-skeleton')).toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  test('error shows a Banner alert + Retry button', async () => {
    useSessionMock().mockReturnValue(mockSession({ status: 'error', error: new Error('start failed') }))
    renderAt(SESSION_URL)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  test('Retry remounts SessionRunner — useSession is called again', async () => {
    useSessionMock().mockReturnValue(mockSession({ status: 'error', error: new Error('x') }))
    renderAt(SESSION_URL)
    const before = useSessionMock().mock.calls.length
    await userEvent.click(await screen.findByRole('button', { name: /retry/i }))
    expect(useSessionMock().mock.calls.length).toBeGreaterThan(before)
  })

  test.each([
    ['sphere has no cards', 0, /this sphere has no cards yet/i],
    ['caught up for today', 12, /you're caught up/i],
  ] as const)('empty queue (%s) shows the right copy', async (_l, total, copy) => {
    useSessionMock().mockReturnValue(mockSession({
      status: 'finished', cardsTotal: 0, totalCardsInSphere: total,
    }))
    renderAt(SESSION_URL)
    expect(await screen.findByText(copy)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to module/i }))
      .toHaveAttribute('href', '/modules/1')
  })

  test('finished (cardsTotal>0) shows the SessionSummary surface', async () => {
    useSessionMock().mockReturnValue(mockSession({
      status: 'finished', cardsTotal: 5, details: {
        cardsReviewed: 5, elapsedMs: 65_000,
        ratings: { again: 0, hard: 1, good: 3, easy: 1 },
        accuracy: { correct: 3, total: 4 },
        nextDueBuckets: [{ label: 'Tomorrow', count: 5 }],
      },
    }))
    renderAt(SESSION_URL)
    const root = await screen.findByTestId('session-summary')
    expect(root.textContent).toMatch(/cards reviewed:\s*5 cards/i)
    expect(screen.getByRole('link', { name: /practice again/i }))
      .toHaveAttribute('href', '/modules/1/sphere/m1-s0/session')
  })

  test('active state renders CardShell eyebrow + the matching renderer', async () => {
    useSessionMock().mockReturnValue(mockSession({
      status: 'active', currentCard: next(flipRaw),
      cardsTotal: 3, completedCount: 0,
    }))
    renderAt(SESSION_URL)
    expect(await screen.findByText(/card 1 of 3/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument()
  })

  // T5.12 keymap cheatsheet — visible during the session, hidden on summary.
  test('keymap cheatsheet shows in active state, hides on finished state', async () => {
    useSessionMock().mockReturnValue(mockSession({
      status: 'active', currentCard: next(flipRaw), cardsTotal: 1,
    }))
    const { unmount } = renderAt(SESSION_URL)
    const cs = await screen.findByTestId('keymap-cheatsheet')
    expect(cs.textContent).toMatch(/⎵.*reveal.*1234.*rate.*esc.*exit/i)
    unmount()
    useSessionMock().mockReturnValue(mockSession({
      status: 'finished', cardsTotal: 1, details: {
        cardsReviewed: 1, elapsedMs: 1000, accuracy: null, nextDueBuckets: [],
        ratings: { again: 0, hard: 0, good: 1, easy: 0 },
      },
    }))
    renderAt(SESSION_URL)
    await screen.findByTestId('session-summary')
    expect(screen.queryByTestId('keymap-cheatsheet')).not.toBeInTheDocument()
  })
})

describe('SessionPage — CardRenderer dispatches per type', () => {
  test.each([
    // T5.12: cheatsheet contains the word "reveal" too, so flip's marker
    // pins the question text instead of the button label.
    ['flip', flipRaw, /which built-in types/i],
    ['multiple_choice', mcRaw, /L→E→G→B/],
    ['code_trap', codeTrapRaw, /f\(1\) print twice/i],
    ['fill_in', fillInRaw, /check/i],
    ['code_task', codeTaskRaw, /run tests/i],
  ] as const)('mounts the %s renderer', async (_l, raw, marker) => {
    useSessionMock().mockReturnValue(mockSession({
      status: 'active', currentCard: next(raw), cardsTotal: 1,
    }))
    renderAt(SESSION_URL)
    expect(await screen.findByText(marker)).toBeInTheDocument()
  })

  test('rating click forwards through to useSession.submitAnswer', async () => {
    const submit = vi.fn()
    useSessionMock().mockReturnValue(mockSession({
      status: 'active', currentCard: next(flipRaw), cardsTotal: 1,
      submitAnswer: submit,
    }))
    renderAt(SESSION_URL)
    await userEvent.click(await screen.findByRole('button', { name: /reveal/i }))
    await userEvent.click(screen.getByRole('button', { name: /good/i }))
    expect(submit).toHaveBeenCalledExactlyOnceWith(3)
  })
})
