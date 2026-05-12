import { describe, expect, test } from 'vitest'
import { createSessionQueue } from './session-queue'

describe('session-queue', () => {
  test('starts at the head and exposes original size', () => {
    const q = createSessionQueue(['c1', 'c2', 'c3'])
    expect(q.current()).toBe('c1')
    expect(q.size()).toBe(3)
    expect(q.originalSize()).toBe(3)
    expect(q.completedCount()).toBe(0)
    expect(q.isEmpty()).toBe(false)
  })

  test('Good/Hard/Easy advance and shrink the queue', () => {
    const q = createSessionQueue(['c1', 'c2', 'c3'])
    q.recordRating('c1', 3) // Good
    expect(q.current()).toBe('c2')
    expect(q.size()).toBe(2)
    expect(q.completedCount()).toBe(1)
    q.recordRating('c2', 2) // Hard
    expect(q.current()).toBe('c3')
    expect(q.completedCount()).toBe(2)
    q.recordRating('c3', 4) // Easy
    expect(q.current()).toBeNull()
    expect(q.isEmpty()).toBe(true)
    expect(q.completedCount()).toBe(3)
  })

  test('Again re-inserts the current card at the end', () => {
    const q = createSessionQueue(['c1', 'c2', 'c3'])
    q.recordRating('c1', 1) // Again
    expect(q.current()).toBe('c2')
    expect(q.size()).toBe(3)
    expect(q.completedCount()).toBe(0)
    expect(q.remaining()).toEqual(['c2', 'c3', 'c1'])
  })

  test('originalSize is stable across Again re-insertions', () => {
    const q = createSessionQueue(['c1', 'c2'])
    q.recordRating('c1', 1)
    q.recordRating('c2', 1)
    expect(q.originalSize()).toBe(2)
    expect(q.size()).toBe(2)
  })

  test('Again-then-advance: re-inserted card stays at logical end past intervening cards', () => {
    const q = createSessionQueue(['c1', 'c2', 'c3', 'c4'])
    q.recordRating('c1', 1) // Again -> c1 to end
    expect(q.remaining()).toEqual(['c2', 'c3', 'c4', 'c1'])
    q.recordRating('c2', 3)
    q.recordRating('c3', 3)
    q.recordRating('c4', 3)
    // c1 is now the only card left, exactly where it was re-inserted
    expect(q.current()).toBe('c1')
    expect(q.remaining()).toEqual(['c1'])
    expect(q.completedCount()).toBe(3)
    q.recordRating('c1', 3) // user got it on the second try
    expect(q.isEmpty()).toBe(true)
    expect(q.completedCount()).toBe(4)
  })

  test('multiple Again cards stack at the end in the order they were re-inserted', () => {
    const q = createSessionQueue(['c1', 'c2', 'c3'])
    q.recordRating('c1', 1) // -> [c2, c3, c1]
    q.recordRating('c2', 1) // -> [c3, c1, c2]
    expect(q.remaining()).toEqual(['c3', 'c1', 'c2'])
  })

  test('recordRating throws when card_id is not the current card', () => {
    const q = createSessionQueue(['c1', 'c2'])
    expect(() => q.recordRating('c2', 3)).toThrow(/current/)
  })

  test('recordRating throws on an empty queue', () => {
    const q = createSessionQueue([])
    expect(q.isEmpty()).toBe(true)
    expect(() => q.recordRating('c1', 3)).toThrow(/empty/)
  })

  test('initial empty queue is fully inert', () => {
    const q = createSessionQueue([])
    expect(q.current()).toBeNull()
    expect(q.size()).toBe(0)
    expect(q.originalSize()).toBe(0)
    expect(q.completedCount()).toBe(0)
    expect(q.remaining()).toEqual([])
  })

  test('remaining() returns a stable snapshot independent of internal mutation', () => {
    const q = createSessionQueue(['c1', 'c2'])
    const snap = q.remaining()
    q.recordRating('c1', 3)
    expect(snap).toEqual(['c1', 'c2'])
    expect(q.remaining()).toEqual(['c2'])
  })

  // P7.T7.10 / N034: attempt count tracking for MC shuffle.
  test('attemptCount starts at 0 and increments on AGAIN re-insertion', () => {
    const q = createSessionQueue(['c1', 'c2'])
    expect(q.attemptCount('c1')).toBe(0)
    q.recordRating('c1', 1) // AGAIN → re-inserted at end
    expect(q.attemptCount('c1')).toBe(1)
    // Walk through c2, come back to c1, AGAIN again → attempt 2.
    q.recordRating('c2', 3)
    q.recordRating('c1', 1)
    expect(q.attemptCount('c1')).toBe(2)
  })

  test('attemptCount stays at 0 when card is rated Good/Hard/Easy first time', () => {
    const q = createSessionQueue(['c1'])
    q.recordRating('c1', 3)
    expect(q.attemptCount('c1')).toBe(0)
  })

  test('attemptCount is 0 for unknown cards (no entry yet)', () => {
    const q = createSessionQueue(['c1'])
    expect(q.attemptCount('unknown')).toBe(0)
  })
})
