// P6.5/P1-4 — mid-session error recovery contract for useSession.
//
// Per ADR-010 (client-owned progression) + ADR-017 (no session
// resumption) + ADR-024 (Retry = fresh-session, queue not persisted):
// any /next or /answer failure lands the user in status='error'. The
// in-memory queue position is intentionally NOT recovered — the parent
// (SessionPage) wraps SessionRunner with a retryKey so Retry remounts
// useSession entirely, issuing a fresh POST /api/sessions. Reviews
// already persisted server-side for previously-rated cards are
// preserved by FSRS scheduling on the next mode='mixed' fetch.
//
// Split from use-session.test.ts to keep both files under the 150-LOC
// file-size gate (P6.5/P1-1 PRD clarification).
import { afterEach, describe, expect, test, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { useSession } from './use-session'

const json = (b: unknown, s = 200): Response =>
  new Response(JSON.stringify(b), { status: s })
const card = (id: string) => ({
  card_id: id, type: 'flip', topic: 't', difficulty: 1,
  sphere_id: 'm1-s0', raw: { question: `Q-${id}`, answer: `A-${id}` },
})
const sess = (id: string, queue: string[]) => ({
  id, user_id: 'u1', mode: 'review', queue,
  started_at: '2026-05-10T00:00:00Z', ended_at: null,
  cards_total: 0, cards_correct: 0, total_cards_in_sphere: queue.length,
})

interface Recorder {
  calls: { url: string; method: string }[]
}

function mockFetch(handler: (url: string) => Response): Recorder {
  const r: Recorder = { calls: [] }
  vi.stubGlobal('fetch', vi.fn(async (
    input: RequestInfo | URL, init?: RequestInit,
  ) => {
    const url = typeof input === 'string' ? input : input.toString()
    r.calls.push({ url, method: init?.method ?? 'GET' })
    return handler(url)
  }))
  return r
}

afterEach(() => vi.unstubAllGlobals())

describe('useSession — mid-session error recovery (P1-4 / ADR-024)', () => {
  test('/answer 500 mid-session sets status=error', async () => {
    let answerCalls = 0
    mockFetch((url) => {
      if (url.endsWith('/api/sessions')) return json(sess('s1', ['c1', 'c2']))
      if (url.includes('/next')) {
        const after = new URL(url, 'http://x').searchParams.get('after')
        return json(card(after === null ? 'c1' : 'c2'))
      }
      if (url.includes('/answer')) {
        answerCalls += 1
        return answerCalls === 1
          ? json({ next_due_at: '2026-05-11T00:00:00Z', new_state: 'review' })
          : json({ error: 'db_timeout' }, 500)
      }
      return new Response('not mocked: ' + url, { status: 500 })
    })

    const { result } = renderHook(() =>
      useSession({ mode: 'review', sphereId: 'm1-s0' }),
    )
    await waitFor(() => expect(result.current.currentCard?.card_id).toBe('c1'))
    await act(async () => { await result.current.submitAnswer(3) })
    await waitFor(() => expect(result.current.currentCard?.card_id).toBe('c2'))
    await act(async () => { await result.current.submitAnswer(2) })
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(answerCalls).toBe(2)
  })

  test('/next 500 mid-session sets status=error', async () => {
    mockFetch((url) => {
      if (url.endsWith('/api/sessions')) return json(sess('s1', ['c1', 'c2']))
      if (url.includes('/next')) {
        const after = new URL(url, 'http://x').searchParams.get('after')
        if (after === null) return json(card('c1'))
        return json({ error: 'no next' }, 500)
      }
      if (url.includes('/answer')) {
        return json({ next_due_at: '2026-05-11T00:00:00Z', new_state: 'review' })
      }
      return new Response('not mocked: ' + url, { status: 500 })
    })

    const { result } = renderHook(() =>
      useSession({ mode: 'review', sphereId: 'm1-s0' }),
    )
    await waitFor(() => expect(result.current.currentCard?.card_id).toBe('c1'))
    await act(async () => { await result.current.submitAnswer(3) })
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBeInstanceOf(Error)
  })

  test('Retry = fresh-session: re-rendering after unmount fires a second POST /api/sessions', async () => {
    // Simulates the SessionPage retryKey-bump re-mount. A future
    // resumption change MUST flip this test deliberately.
    const r = mockFetch((url) => {
      if (url.endsWith('/api/sessions')) return json(sess('s1', ['c1']))
      if (url.includes('/next')) return json(card('c1'))
      if (url.includes('/answer')) return json({ error: 'transient' }, 500)
      return new Response('not mocked: ' + url, { status: 500 })
    })

    const first = renderHook(() =>
      useSession({ mode: 'review', sphereId: 'm1-s0' }),
    )
    await waitFor(() => expect(first.result.current.currentCard?.card_id).toBe('c1'))
    await act(async () => { await first.result.current.submitAnswer(3) })
    await waitFor(() => expect(first.result.current.status).toBe('error'))
    first.unmount()

    const second = renderHook(() =>
      useSession({ mode: 'review', sphereId: 'm1-s0' }),
    )
    await waitFor(() => expect(second.result.current.currentCard?.card_id).toBe('c1'))

    const startCalls = r.calls.filter(
      (c) => c.url.endsWith('/api/sessions') && c.method === 'POST',
    )
    expect(startCalls).toHaveLength(2)
  })
})
