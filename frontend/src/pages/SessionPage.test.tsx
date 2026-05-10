import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { setToken } from '../lib/auth'
import { renderAt } from '../test/router-fixture'
import * as useSessionModule from '../lib/use-session'
import type { UseSessionResult } from '../lib/use-session'
import type { NextCard } from '../lib/types'

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
  totalCardsInSphere: null,
  submitAnswer: vi.fn(), finish: vi.fn(),
  ...over,
})

const baseRaw = { topic: 't', difficulty: 1, tags: ['x'] }
const flipRaw = { ...baseRaw, id: 'm1-s0-c1', type: 'flip',
  question: 'Which built-in types are mutable?',
  answer: 'list, dict, set, bytearray are mutable; rest are immutable.' }
const mcRaw = { ...baseRaw, id: 'm1-s0-c5', type: 'multiple_choice',
  question: 'Resolution order?',
  options: ['L→G', 'L→E→G→B', 'B→G→L', 'L→M→C→B'],
  correct_index: 1, option_explanations: ['', '', '', ''] }
const codeTrapRaw = { ...baseRaw, id: 'm1-s0-c2', type: 'code_trap',
  code_snippet: 'def f(x, items=[]):\n    items.append(x); return items',
  question: 'What does f(1) print twice in a row?',
  options: ['[1] [1]', '[1] [1, 2]', 'Error', '[]'], correct_index: 1,
  explanation_md: 'The default is evaluated once at definition time and shared.' }
const fillInRaw = { ...baseRaw, id: 'm1-s0-c3', type: 'fill_in',
  code_snippet_with_blanks: 'def f(x, items=___):\n    pass',
  accepted_answers: [['None']], explanation_md: 'Use None.' }
const codeTaskRaw = { ...baseRaw, id: 'm1-s0-c4', type: 'code_task', difficulty: 3,
  prompt_md: 'Implement make_counter(start=0) returning a closure.',
  starter_code: 'def make_counter(start=0):\n    pass',
  solution_code: 'def make_counter(start=0):\n    c = start\n    def step(): nonlocal c; c += 1; return c\n    return step',
  tests: 'def test_counts_from_zero():\n    c = make_counter(); assert c() == 1',
  allowlist: ['pytest'] }
const next = (raw: Record<string, unknown>): NextCard => ({
  card_id: raw.id as string, type: raw.type as string,
  topic: raw.topic as string, difficulty: raw.difficulty as number,
  sphere_id: 'm1-s0', raw,
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
    useSessionMock().mockReturnValue(
      mockSession({ status: 'error', error: new Error('start failed') }),
    )
    renderAt(SESSION_URL)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  test('Retry remounts SessionRunner — useSession is called again', async () => {
    useSessionMock().mockReturnValue(
      mockSession({ status: 'error', error: new Error('boom') }),
    )
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

  test('finished (cardsTotal>0) shows the T5.11 placeholder + Back link', async () => {
    useSessionMock().mockReturnValue(mockSession({
      status: 'finished', cardsTotal: 5,
      summary: { cards_total: 5, cards_correct: 4, retention: 0.8 },
    }))
    renderAt(SESSION_URL)
    expect(await screen.findByText(/session complete/i)).toBeInTheDocument()
    expect(screen.getByText(/t5\.11/i)).toBeInTheDocument()
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
})

describe('SessionPage — CardRenderer dispatches per type', () => {
  test.each([
    ['flip', flipRaw, /reveal/i],
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
