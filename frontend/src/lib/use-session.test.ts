import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { clearLastActive, getLastActive } from './last-active'
import {
  clampResponseMs,
  makeIdempotencyKey,
  useSession,
} from './use-session'

const json = (b: unknown, s = 200): Response =>
  new Response(JSON.stringify(b), { status: s })
const card = (id: string) => ({
  card_id: id, type: 'flip', topic: 't', difficulty: 1,
  sphere_id: 'm1-s0', raw: { question: `Q-${id}`, answer: `A-${id}` },
})
const sess = (id: string, queue: string[]) => ({
  id, user_id: 'u1', mode: 'review', queue,
  started_at: '2026-05-10T00:00:00Z', ended_at: null,
  cards_total: 0, cards_correct: 0,
})

interface Recorder {
  calls: { url: string; method: string; body?: Record<string, unknown> }[]
}

type AnswerBody = { card_id: string; rating: number; response_ms: number; idempotency_key: string }

function mockFetch(handler: (url: string) => Response): Recorder {
  const r: Recorder = { calls: [] }
  vi.stubGlobal('fetch', vi.fn(async (
    input: RequestInfo | URL, init?: RequestInit,
  ) => {
    const url = typeof input === 'string' ? input : input.toString()
    r.calls.push({
      url, method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    })
    return handler(url)
  }))
  return r
}

beforeEach(() => clearLastActive())
afterEach(() => vi.unstubAllGlobals())

describe('makeIdempotencyKey', () => {
  test('matches server pattern [A-Za-z0-9_-]{16,128}', () => {
    for (let i = 0; i < 8; i++) {
      expect(makeIdempotencyKey()).toMatch(/^[A-Za-z0-9_-]{16,128}$/)
    }
  })
  test('returns unique values', () => {
    expect(new Set([
      makeIdempotencyKey(), makeIdempotencyKey(), makeIdempotencyKey(),
    ]).size).toBe(3)
  })
})

describe('clampResponseMs', () => {
  test.each([
    [0, 0], [500, 500], [600_000, 600_000], [600_001, 600_000],
    [-1, 0], [Number.NaN, 0], [Number.POSITIVE_INFINITY, 600_000],
  ])('clamps %s -> %s', (i, e) => expect(clampResponseMs(i)).toBe(e))
})

describe('useSession — happy path', () => {
  test('loads, advances, finishes, writes last-active, posts well-formed answer', async () => {
    const recorder = mockFetch((url) => {
      if (url.endsWith('/api/sessions')) return json(sess('s1', ['c1', 'c2']))
      if (url.includes('/next')) {
        const after = new URL(url, 'http://x').searchParams.get('after')
        return json(card(after === null ? 'c1' : 'c2'))
      }
      if (url.includes('/answer')) {
        return json({ next_due_at: '2026-05-11T00:00:00Z', new_state: 'review' })
      }
      if (url.includes('/finish')) {
        return json({ cards_total: 2, cards_correct: 2, retention: 1.0 })
      }
      return new Response('not mocked: ' + url, { status: 500 })
    })

    const { result } = renderHook(() =>
      useSession({ mode: 'review', sphereId: 'm1-s0', moduleId: 1 }),
    )
    await waitFor(() => expect(result.current.status).toBe('active'))
    expect(result.current.currentCard?.card_id).toBe('c1')
    expect(result.current.cardsTotal).toBe(2)
    expect(getLastActive()).toMatchObject({ module_id: 1, sphere_id: 'm1-s0' })

    await act(async () => { await result.current.submitAnswer(2) })
    await waitFor(() => expect(result.current.currentCard?.card_id).toBe('c2'))
    expect(result.current.completedCount).toBe(1)

    const a = recorder.calls.find((c) => c.url.includes('/answer'))
    if (!a?.body) throw new Error('expected /answer call with body')
    const body = a.body as unknown as AnswerBody
    expect(a.method).toBe('POST')
    expect(body).toMatchObject({ card_id: 'c1', rating: 2 })
    expect(body.response_ms).toBeGreaterThanOrEqual(0)
    expect(body.idempotency_key).toMatch(/^[A-Za-z0-9_-]{16,128}$/)

    await act(async () => { await result.current.submitAnswer(3) })
    await waitFor(() => expect(result.current.status).toBe('finished'))
    expect(result.current.summary).toEqual({
      cards_total: 2, cards_correct: 2, retention: 1.0,
    })
    expect(result.current.currentCard).toBeNull()
  })
})

describe('useSession — AGAIN re-insertion (ADR-010 client-owned loop)', () => {
  test('re-presented card served from cache, distinct idempotency keys per attempt', async () => {
    const recorder = mockFetch((url) => {
      if (url.endsWith('/api/sessions')) return json(sess('s1', ['c1', 'c2']))
      if (url.includes('/next')) {
        const after = new URL(url, 'http://x').searchParams.get('after')
        if (after === null) return json(card('c1'))
        if (after === 'c1') return json(card('c2'))
        return new Response('over-fetched /next', { status: 500 })
      }
      if (url.includes('/answer')) {
        return json({ next_due_at: '2026-05-11T00:00:00Z', new_state: 'review' })
      }
      if (url.includes('/finish')) {
        return json({ cards_total: 2, cards_correct: 2, retention: 1.0 })
      }
      return new Response('not mocked: ' + url, { status: 500 })
    })

    const { result } = renderHook(() =>
      useSession({ mode: 'review', sphereId: 'm1-s0' }),
    )
    await waitFor(() => expect(result.current.currentCard?.card_id).toBe('c1'))
    await act(async () => { await result.current.submitAnswer(1) }) // Again
    await waitFor(() => expect(result.current.currentCard?.card_id).toBe('c2'))
    expect(result.current.completedCount).toBe(0)
    await act(async () => { await result.current.submitAnswer(3) })
    await waitFor(() => expect(result.current.currentCard?.card_id).toBe('c1'))
    expect(result.current.completedCount).toBe(1)

    expect(recorder.calls.filter((c) => c.url.includes('/next'))).toHaveLength(2)

    await act(async () => { await result.current.submitAnswer(3) })
    await waitFor(() => expect(result.current.status).toBe('finished'))
    const c1Keys = recorder.calls
      .filter((c) => c.url.includes('/answer') && c.body?.card_id === 'c1')
      .map((c) => (c.body as unknown as AnswerBody).idempotency_key)
    expect(c1Keys).toHaveLength(2)
    expect(new Set(c1Keys).size).toBe(2)
  })
})

describe('useSession — error handling', () => {
  test('start failure surfaces as status=error', async () => {
    mockFetch((url) => url.endsWith('/api/sessions')
      ? json({ error: 'forbidden', detail: 'no' }, 403)
      : new Response('not mocked', { status: 500 }))
    const { result } = renderHook(() =>
      useSession({ mode: 'review', sphereId: 'm1-s0' }),
    )
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.currentCard).toBeNull()
  })
})
