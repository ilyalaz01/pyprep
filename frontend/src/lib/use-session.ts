/**
 * useSession — drives one card session from start to finish.
 *
 * Owns four things React state cannot easily own well:
 *   - the SessionQueue (ADR-010 client-owned progression).
 *   - a NextCard cache so AGAIN'd cards re-render without a second
 *     /next fetch (the server walks its own fixed queue, not ours).
 *   - per-card response_ms timing.
 *   - idempotency keys per submit (one Review row per attempt; AGAIN
 *     repeats produce distinct keys, server records both).
 *
 * Lifecycle: 'loading' → 'active' (loop submitAnswer) → 'finishing' →
 * 'finished'. 'error' is terminal. The hook auto-finishes when the
 * queue empties; callers may also invoke finish() to exit early.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { api } from './api'
import { setLastActive } from './last-active'
import { createSessionQueue, type Rating, type SessionQueue } from './session-queue'
import type { NextCard, SessionMode, SessionSummary } from './types'

const RESPONSE_MS_CAP = 600_000

/** UUIDv4 — 36 chars [0-9a-f-], satisfies server's [A-Za-z0-9_-]{16,128}. */
export function makeIdempotencyKey(): string {
  return crypto.randomUUID()
}

export function clampResponseMs(ms: number): number {
  if (Number.isNaN(ms) || ms < 0) return 0
  if (ms > RESPONSE_MS_CAP) return RESPONSE_MS_CAP
  return Math.floor(ms)
}

export type SessionStatus =
  | 'loading' | 'active' | 'submitting' | 'finishing' | 'finished' | 'error'

export interface UseSessionResult {
  status: SessionStatus
  error: Error | null
  currentCard: NextCard | null
  cardsTotal: number
  completedCount: number
  summary: SessionSummary | null
  submitAnswer: (rating: Rating) => Promise<void>
  finish: () => Promise<void>
}

export interface UseSessionParams {
  mode: SessionMode
  sphereId?: string
  /** Optional — when present with sphereId, last-active is written on start. */
  moduleId?: number
  limit?: number
}

export function useSession(params: UseSessionParams): UseSessionResult {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [error, setErr] = useState<Error | null>(null)
  const [currentCard, setCurrentCard] = useState<NextCard | null>(null)
  const [cardsTotal, setCardsTotal] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [summary, setSummary] = useState<SessionSummary | null>(null)

  const sessionIdRef = useRef<string | null>(null)
  const queueRef = useRef<SessionQueue | null>(null)
  const cacheRef = useRef<Map<string, NextCard>>(new Map())
  const mountedAtRef = useRef<number>(0)
  const lastFromServerRef = useRef<string | null>(null)
  const startedRef = useRef(false)

  const fail = useCallback((e: unknown) => {
    setErr(e instanceof Error ? e : new Error(String(e)))
    setStatus('error')
  }, [])

  const advance = useCallback(async () => {
    const queue = queueRef.current
    const sessionId = sessionIdRef.current
    if (!queue || !sessionId) return
    const nextId = queue.current()
    if (nextId === null) {
      setStatus('finishing')
      try {
        const sum = await api.sessions.finish(sessionId)
        setSummary(sum); setCurrentCard(null); setStatus('finished')
      } catch (e) { fail(e) }
      return
    }
    const cached = cacheRef.current.get(nextId)
    if (cached) {
      setCurrentCard(cached); mountedAtRef.current = Date.now(); setStatus('active')
      return
    }
    try {
      const card = await api.sessions.next(
        sessionId, lastFromServerRef.current ?? undefined,
      )
      cacheRef.current.set(card.card_id, card)
      lastFromServerRef.current = card.card_id
      setCurrentCard(card); mountedAtRef.current = Date.now(); setStatus('active')
    } catch (e) { fail(e) }
  }, [fail])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void (async () => {
      try {
        const s = await api.sessions.start({
          mode: params.mode, sphere_id: params.sphereId, limit: params.limit,
        })
        sessionIdRef.current = s.id
        queueRef.current = createSessionQueue(s.queue)
        setCardsTotal(s.queue.length)
        if (params.moduleId !== undefined && params.sphereId !== undefined) {
          setLastActive({ module_id: params.moduleId, sphere_id: params.sphereId })
        }
        await advance()
      } catch (e) { fail(e) }
    })()
  }, [advance, fail, params.limit, params.mode, params.moduleId, params.sphereId])

  const submitAnswer = useCallback(
    async (rating: Rating) => {
      const queue = queueRef.current
      const sessionId = sessionIdRef.current
      if (!queue || !sessionId || !currentCard) return
      setStatus('submitting')
      try {
        await api.sessions.answer(sessionId, {
          card_id: currentCard.card_id,
          rating,
          response_ms: clampResponseMs(Date.now() - mountedAtRef.current),
          idempotency_key: makeIdempotencyKey(),
        })
        queue.recordRating(currentCard.card_id, rating)
        setCompletedCount(queue.completedCount())
        await advance()
      } catch (e) { fail(e) }
    },
    [advance, currentCard, fail],
  )

  const finish = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (!sessionId || status === 'finished') return
    setStatus('finishing')
    try {
      const sum = await api.sessions.finish(sessionId)
      setSummary(sum); setCurrentCard(null); setStatus('finished')
    } catch (e) { fail(e) }
  }, [fail, status])

  return {
    status, error, currentCard, cardsTotal, completedCount, summary,
    submitAnswer, finish,
  }
}
