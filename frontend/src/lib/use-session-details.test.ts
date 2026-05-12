/**
 * Hook-level wiring for the T5.11 SessionDetails snapshot.
 *
 * Pure aggregation logic is in session-details.test.ts; this file
 * verifies the hook plumbs the right shapes into buildDetails on
 * submit — and pins the P7-fix regression guard: accuracy comes
 * from the outcome arg (per ADR-015 + stop-point-#2 bug), NOT from
 * rating ≥ Good.
 *
 * Split from use-session.test.ts to keep the parent file under the
 * 150-LOC gate.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { clearLastActive } from './last-active'
import { useSession } from './use-session'

const json = (b: unknown, s = 200): Response =>
  new Response(JSON.stringify(b), { status: s })
const card = (id: string, type = 'flip') => ({
  card_id: id, type, topic: 't', difficulty: 1,
  sphere_id: 'm1-s0', raw: { question: `Q-${id}`, answer: `A-${id}` },
})
const sess = (id: string, queue: string[]) => ({
  id, user_id: 'u1', mode: 'review', queue,
  started_at: '2026-05-12T00:00:00Z', ended_at: null,
  cards_total: 0, cards_correct: 0, total_cards_in_sphere: queue.length,
})

function mockFetch(handler: (url: string) => Response): void {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    return handler(typeof input === 'string' ? input : input.toString())
  }))
}

beforeEach(() => clearLastActive())
afterEach(() => vi.unstubAllGlobals())

describe('useSession — details snapshot wires through', () => {
  test('submitAnswer updates details.ratings + nextDueBuckets', async () => {
    const due = new Date(Date.now() + 2 * 86_400_000).toISOString()
    mockFetch((url) => {
      if (url.endsWith('/api/sessions')) return json(sess('s1', ['c1', 'c2']))
      if (url.includes('/next')) return json(card('c1'))
      if (url.includes('/answer')) return json({ next_due_at: due, new_state: 'review' })
      if (url.includes('/finish')) return json({ cards_total: 2, cards_correct: 2, retention: 1.0 })
      return new Response('not mocked: ' + url, { status: 500 })
    })
    const { result } = renderHook(() => useSession({ mode: 'review', sphereId: 'm1-s0' }))
    await waitFor(() => expect(result.current.currentCard?.card_id).toBe('c1'))
    await act(async () => { await result.current.submitAnswer(3) })
    await waitFor(() => expect(result.current.details.ratings.good).toBe(1))
    expect(result.current.details.nextDueBuckets.find((b) => b.label === 'In 3 days')?.count).toBe(1)
    expect(result.current.details.accuracy).toBeNull() // flip-only session
  })

  // P7-fix regression guard (stop point #2 bug): accuracy = outcome,
  // NOT rating ≥ Good. ADR-015 lets the user rate Good on a wrong
  // answer; pre-fix this read as 100% on /stats.
  test('accuracy reflects outcome, not rating (P7-fix)', async () => {
    const due = new Date(Date.now() + 86_400_000).toISOString()
    mockFetch((url) => {
      if (url.endsWith('/api/sessions')) return json(sess('s1', ['mc1']))
      if (url.includes('/next')) return json(card('mc1', 'multiple_choice'))
      if (url.includes('/answer')) return json({ next_due_at: due, new_state: 'review' })
      if (url.includes('/finish')) return json({ cards_total: 1, cards_correct: 0, retention: 0 })
      return new Response('not mocked: ' + url, { status: 500 })
    })
    const { result } = renderHook(() => useSession({ mode: 'review', sphereId: 'm1-s0' }))
    await waitFor(() => expect(result.current.currentCard?.card_id).toBe('mc1'))
    await act(async () => { await result.current.submitAnswer(3, false) })
    await waitFor(() => expect(result.current.details.accuracy).toEqual({ correct: 0, total: 1 }))
  })

  // Companion: outcome=true on a correct objective answer → 1/1.
  test('accuracy increments correctly on outcome=true', async () => {
    const due = new Date(Date.now() + 86_400_000).toISOString()
    mockFetch((url) => {
      if (url.endsWith('/api/sessions')) return json(sess('s1', ['mc1']))
      if (url.includes('/next')) return json(card('mc1', 'multiple_choice'))
      if (url.includes('/answer')) return json({ next_due_at: due, new_state: 'review' })
      if (url.includes('/finish')) return json({ cards_total: 1, cards_correct: 1, retention: 1 })
      return new Response('not mocked: ' + url, { status: 500 })
    })
    const { result } = renderHook(() => useSession({ mode: 'review', sphereId: 'm1-s0' }))
    await waitFor(() => expect(result.current.currentCard?.card_id).toBe('mc1'))
    await act(async () => { await result.current.submitAnswer(3, true) })
    await waitFor(() => expect(result.current.details.accuracy).toEqual({ correct: 1, total: 1 }))
  })
})
