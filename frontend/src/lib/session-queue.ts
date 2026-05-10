/**
 * Pure client-side session queue. Owns card order, the FR-REVIEW-3
 * AGAIN-reinsertion rule, and "is the queue empty." No React, no
 * network, no storage — just data + four mutations. Lives outside
 * any hook so the ADR-010 rule (client-owns-the-loop) is testable
 * in isolation from the React tree.
 *
 * Rating mapping: 1=Again, 2=Hard, 3=Good, 4=Easy. Only Again is
 * special (re-inserts the current card at the end of the queue).
 */
export type Rating = 1 | 2 | 3 | 4

export interface SessionQueue {
  /** The card the user should see next, or null when finished. */
  current(): string | null
  /** True when no cards remain. */
  isEmpty(): boolean
  /** Cards still pending (shrinks on Hard/Good/Easy, stable on Again). */
  size(): number
  /** Initial queue length. Stable for the life of the session. */
  originalSize(): number
  /** Distinct cards that have left the queue permanently (non-Again ratings). */
  completedCount(): number
  /**
   * Apply a rating to the current card. Again moves it to the end;
   * any other rating drops it. Throws if `cardId` is not the current
   * card or the queue is empty.
   */
  recordRating(cardId: string, rating: Rating): void
  /** Snapshot of pending card IDs in order. Caller-safe (frozen copy). */
  remaining(): readonly string[]
}

export function createSessionQueue(initial: readonly string[]): SessionQueue {
  const queue: string[] = [...initial]
  const original = initial.length
  let completed = 0

  return {
    current: () => queue[0] ?? null,
    isEmpty: () => queue.length === 0,
    size: () => queue.length,
    originalSize: () => original,
    completedCount: () => completed,
    remaining: () => Object.freeze([...queue]),
    recordRating(cardId, rating) {
      if (queue.length === 0) {
        throw new Error('cannot rate: queue is empty')
      }
      if (queue[0] !== cardId) {
        throw new Error(
          `cannot rate ${cardId}: not the current card (current=${queue[0]})`,
        )
      }
      const head = queue.shift() as string
      if (rating === 1) {
        queue.push(head)
      } else {
        completed += 1
      }
    },
  }
}
