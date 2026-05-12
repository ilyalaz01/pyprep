import { describe, expect, test } from 'vitest'

import {
  buildDetails, clampResponseMs, computeNextDueBuckets, emptyDetails,
  makeIdempotencyKey, OBJECTIVE_TYPES, tallyRating,
} from './session-details'

const NOW = Date.parse('2026-05-11T12:00:00Z')
const days = (n: number) =>
  new Date(NOW + n * 86_400_000).toISOString()

describe('OBJECTIVE_TYPES', () => {
  test('contains the four objective card types and excludes flip', () => {
    for (const t of ['multiple_choice', 'code_trap', 'fill_in', 'code_task']) {
      expect(OBJECTIVE_TYPES.has(t)).toBe(true)
    }
    expect(OBJECTIVE_TYPES.has('flip')).toBe(false)
  })
})

describe('makeIdempotencyKey', () => {
  test('matches server pattern [A-Za-z0-9_-]{16,128}', () => {
    for (let i = 0; i < 8; i++) {
      expect(makeIdempotencyKey()).toMatch(/^[A-Za-z0-9_-]{16,128}$/)
    }
  })
  test('returns unique values across calls', () => {
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

describe('tallyRating', () => {
  test('mutates the four buckets correctly', () => {
    const r = { again: 0, hard: 0, good: 0, easy: 0 }
    tallyRating(r, 1); tallyRating(r, 1); tallyRating(r, 2)
    tallyRating(r, 3); tallyRating(r, 4); tallyRating(r, 4)
    expect(r).toEqual({ again: 2, hard: 1, good: 1, easy: 2 })
  })
})

describe('computeNextDueBuckets', () => {
  test('partitions ISO strings into the four labelled buckets', () => {
    const m = new Map<string, string>([
      ['c1', days(0.5)],   // Tomorrow (≤1 day)
      ['c2', days(1)],     // boundary → Tomorrow
      ['c3', days(2)],     // In 3 days
      ['c4', days(3)],     // boundary → In 3 days
      ['c5', days(5)],     // In 1 week
      ['c6', days(7)],     // boundary → In 1 week
      ['c7', days(10)],    // Later
    ])
    const buckets = computeNextDueBuckets(m, NOW)
    const get = (label: string) => buckets.find((b) => b.label === label)?.count ?? 0
    expect(get('Tomorrow')).toBe(2)
    expect(get('In 3 days')).toBe(2)
    expect(get('In 1 week')).toBe(2)
    expect(get('Later')).toBe(1)
  })

  test('skips invalid ISO strings without throwing', () => {
    const m = new Map([['c1', 'not-a-date'], ['c2', days(2)]])
    const buckets = computeNextDueBuckets(m, NOW)
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(1)
  })

  test('returns all-zero buckets for an empty map', () => {
    const buckets = computeNextDueBuckets(new Map(), NOW)
    expect(buckets.every((b) => b.count === 0)).toBe(true)
    expect(buckets.map((b) => b.label)).toEqual([
      'Tomorrow', 'In 3 days', 'In 1 week', 'Later',
    ])
  })
})

describe('buildDetails', () => {
  test('assembles a complete snapshot with accuracy when objectives present', () => {
    const d = buildDetails({
      completedCount: 3,
      startedAt: NOW - 5 * 60_000, // 5 min ago
      ratings: { again: 1, hard: 0, good: 2, easy: 0 },
      // P7-fix: outcomes (correctness), not ratings. One correct, one wrong.
      objectiveLastOutcome: new Map([['mc1', true], ['mc2', false]]),
      nextDueByCard: new Map([['mc1', days(2)], ['mc2', days(0.5)]]),
      now: NOW,
    })
    expect(d.cardsReviewed).toBe(3)
    expect(d.elapsedMs).toBe(5 * 60_000)
    expect(d.ratings).toEqual({ again: 1, hard: 0, good: 2, easy: 0 })
    expect(d.accuracy).toEqual({ correct: 1, total: 2 })
    expect(d.nextDueBuckets.find((b) => b.label === 'Tomorrow')?.count).toBe(1)
    expect(d.nextDueBuckets.find((b) => b.label === 'In 3 days')?.count).toBe(1)
  })

  test('accuracy is null when no objective cards', () => {
    const d = buildDetails({
      completedCount: 2,
      startedAt: NOW - 60_000,
      ratings: { again: 0, hard: 0, good: 2, easy: 0 },
      objectiveLastOutcome: new Map(),
      nextDueByCard: new Map(),
      now: NOW,
    })
    expect(d.accuracy).toBeNull()
  })

  test('elapsedMs is 0 when session has not started', () => {
    const d = buildDetails({
      completedCount: 0,
      startedAt: 0,
      ratings: { again: 0, hard: 0, good: 0, easy: 0 },
      objectiveLastOutcome: new Map(),
      nextDueByCard: new Map(),
      now: NOW,
    })
    expect(d.elapsedMs).toBe(0)
  })

  // P7-fix regression guard (stop point #2 bug): a user can rate Good
  // on a wrong answer per ADR-015. Accuracy must reflect the outcome,
  // NOT the rating.
  test('accuracy from outcome, NOT rating (ADR-015 / P7-fix)', () => {
    const d = buildDetails({
      completedCount: 1,
      startedAt: NOW - 10_000,
      // User rated Good (3) on a card they got wrong (outcome=false).
      // Pre-fix code computed accuracy from rating>=3 → 100%. Wrong.
      ratings: { again: 0, hard: 0, good: 1, easy: 0 },
      objectiveLastOutcome: new Map([['mc1', false]]),
      nextDueByCard: new Map(),
      now: NOW,
    })
    expect(d.accuracy).toEqual({ correct: 0, total: 1 })
  })
})

describe('emptyDetails', () => {
  test('returns a zero-state snapshot', () => {
    expect(emptyDetails()).toEqual({
      cardsReviewed: 0,
      elapsedMs: 0,
      ratings: { again: 0, hard: 0, good: 0, easy: 0 },
      accuracy: null,
      nextDueBuckets: [],
    })
  })
})
