// useSession — drives one card session from start to finish.
// Owns the SessionQueue (ADR-010 client-owned progression), a NextCard
// cache so AGAIN'd cards re-render without a second /next fetch, per-card
// response_ms timing, idempotency keys (one Review row per attempt), and
// the T5.11 SessionDetails aggregation.
// Lifecycle: 'loading' → 'active' (loop submitAnswer) → 'finishing' →
// 'finished'. 'error' is terminal. Auto-finishes when queue empties.
import { useCallback, useEffect, useRef, useState } from 'react'

import { api } from './api'
import { setLastActive } from './last-active'
import {
  buildDetails, clampResponseMs, emptyDetails, makeIdempotencyKey,
  OBJECTIVE_TYPES, tallyRating, type SessionDetails,
} from './session-details'
import { createSessionQueue, type Rating, type SessionQueue } from './session-queue'
import type { NextCard, SessionMode, SessionSummary } from './types'

// Re-exports preserve the public surface that tests + callers already import.
export { clampResponseMs, makeIdempotencyKey }

export type SessionStatus =
  | 'loading' | 'active' | 'submitting' | 'finishing' | 'finished' | 'error'

export interface UseSessionResult {
  status: SessionStatus
  error: Error | null
  currentCard: NextCard | null
  cardsTotal: number
  completedCount: number
  summary: SessionSummary | null
  // Authored card count for the sphere; null in global review mode.
  // Disambiguates "this sphere has no cards yet" from "caught up".
  totalCardsInSphere: number | null
  // T5.11 client-side aggregation for SessionSummary. Always present;
  // values reflect the partial session before status='finished'.
  details: SessionDetails
  // P7-fix (stop point #2): outcome is the objective-card correctness
  // signal (MC index match, fill-in all-blanks match, code-task tests
  // passed). Decoupled from rating per ADR-015 — the user can rate
  // Good on a wrong answer. Undefined for flip cards (no objective
  // outcome). Accuracy aggregates only from defined outcomes.
  submitAnswer: (rating: Rating, outcome?: boolean) => Promise<void>
  finish: () => Promise<void>
}

export interface UseSessionParams {
  mode: SessionMode
  sphereId?: string
  // moduleId+sphereId together write last-active on session start.
  moduleId?: number
  limit?: number
  // P7.T7.9 / ADR-026: "Practice anyway" — bypass the new-card daily
  // cap. SessionPage flips this when the route arrives with
  // ?practice=true (caught-up EmptySession CTA).
  overrideDailyCap?: boolean
}

export function useSession(params: UseSessionParams): UseSessionResult {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [error, setErr] = useState<Error | null>(null)
  const [currentCard, setCurrentCard] = useState<NextCard | null>(null)
  const [cardsTotal, setCardsTotal] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [totalCardsInSphere, setTotalCardsInSphere] = useState<number | null>(null)
  const [details, setDetails] = useState<SessionDetails>(() => emptyDetails())

  const sessionIdRef = useRef<string | null>(null)
  const queueRef = useRef<SessionQueue | null>(null)
  const cacheRef = useRef<Map<string, NextCard>>(new Map())
  const mountedAtRef = useRef<number>(0)
  const lastFromServerRef = useRef<string | null>(null)
  const startedRef = useRef(false)
  // Wall-clock session timer + per-card aggregations for SessionDetails.
  const sessionStartedAtRef = useRef<number>(0)
  const ratingsRef = useRef({ again: 0, hard: 0, good: 0, easy: 0 })
  // P7-fix: outcome tracking replaces the rating-as-proxy approach.
  const objectiveLastOutcomeRef = useRef<Map<string, boolean>>(new Map())
  const nextDueByCardRef = useRef<Map<string, string>>(new Map())

  const fail = useCallback((e: unknown) => {
    setErr(e instanceof Error ? e : new Error(String(e)))
    setStatus('error')
  }, [])

  // Aggregate per-card refs into a SessionDetails snapshot.
  // Pure assembly lives in session-details.ts.
  const refreshDetails = useCallback(() => {
    setDetails(buildDetails({
      completedCount: queueRef.current?.completedCount() ?? 0,
      startedAt: sessionStartedAtRef.current,
      ratings: ratingsRef.current,
      objectiveLastOutcome: objectiveLastOutcomeRef.current,
      nextDueByCard: nextDueByCardRef.current,
    }))
  }, [])

  const present = useCallback((card: NextCard) => {
    const now = Date.now()
    if (!sessionStartedAtRef.current) sessionStartedAtRef.current = now
    mountedAtRef.current = now
    setCurrentCard(card); setStatus('active')
  }, [])

  // Finalize the session — called both when the queue empties (auto)
  // and when a caller invokes finish() (manual exit). Dedupes the
  // POST /finish + summary state-set + refresh-details boilerplate.
  const finalize = useCallback(async (sessionId: string) => {
    setStatus('finishing')
    try {
      const sum = await api.sessions.finish(sessionId)
      setSummary(sum); setCurrentCard(null); setStatus('finished'); refreshDetails()
    } catch (e) { fail(e) }
  }, [fail, refreshDetails])

  const advance = useCallback(async () => {
    const queue = queueRef.current
    const sessionId = sessionIdRef.current
    if (!queue || !sessionId) return
    const nextId = queue.current()
    if (nextId === null) { await finalize(sessionId); return }
    const cached = cacheRef.current.get(nextId)
    if (cached) { present(cached); return }
    try {
      const card = await api.sessions.next(
        sessionId, lastFromServerRef.current ?? undefined,
      )
      cacheRef.current.set(card.card_id, card)
      lastFromServerRef.current = card.card_id
      present(card)
    } catch (e) { fail(e) }
  }, [fail, finalize, present])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void (async () => {
      try {
        const s = await api.sessions.start({
          mode: params.mode, sphere_id: params.sphereId, limit: params.limit,
          override_daily_cap: params.overrideDailyCap,
        })
        sessionIdRef.current = s.id
        queueRef.current = createSessionQueue(s.queue)
        setCardsTotal(s.queue.length)
        setTotalCardsInSphere(s.total_cards_in_sphere)
        if (params.moduleId !== undefined && params.sphereId !== undefined) {
          setLastActive({ module_id: params.moduleId, sphere_id: params.sphereId })
        }
        await advance()
      } catch (e) { fail(e) }
    })()
  }, [advance, fail, params.limit, params.mode, params.moduleId, params.sphereId])

  const submitAnswer = useCallback(
    async (rating: Rating, outcome?: boolean) => {
      const queue = queueRef.current
      const sessionId = sessionIdRef.current
      if (!queue || !sessionId || !currentCard) return
      setStatus('submitting')
      try {
        const result = await api.sessions.answer(sessionId, {
          card_id: currentCard.card_id,
          rating,
          response_ms: clampResponseMs(Date.now() - mountedAtRef.current),
          idempotency_key: makeIdempotencyKey(),
        })
        // T5.11 tally: rating bucket, objective-card outcome (latest
        // wins on AGAIN-then-rerate), and next-due ISO. P7-fix:
        // accuracy now comes from `outcome` (correctness), NOT rating
        // — fixes the "100% accuracy on Good-rated wrong answers"
        // bug surfaced at stop point #2.
        tallyRating(ratingsRef.current, rating)
        if (OBJECTIVE_TYPES.has(currentCard.type) && outcome !== undefined) {
          objectiveLastOutcomeRef.current.set(currentCard.card_id, outcome)
        }
        nextDueByCardRef.current.set(currentCard.card_id, result.next_due_at)
        queue.recordRating(currentCard.card_id, rating)
        setCompletedCount(queue.completedCount())
        refreshDetails()
        await advance()
      } catch (e) { fail(e) }
    },
    [advance, currentCard, fail, refreshDetails],
  )

  const finish = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (sessionId && status !== 'finished') await finalize(sessionId)
  }, [finalize, status])

  return {
    status, error, currentCard, cardsTotal, completedCount, summary,
    totalCardsInSphere, details, submitAnswer, finish,
  }
}
