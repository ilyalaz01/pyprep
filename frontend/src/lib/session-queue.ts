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
   * P7.T7.10 / N034: how many times this card has been the current
   * card so far (0-based; the first time the user sees a card, this
   * returns 0; after one AGAIN, the next presentation returns 1).
   * Drives deterministic option shuffling in MC + CodeTrap renderers
   * so a re-presented card doesn't reward position memory.
   */
  attemptCount(cardId: string): number
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
  // P7.T7.10 / N034: increments on AGAIN re-insertion so renderers
  // can derive a per-attempt shuffle seed. Keyed by card_id.
  const attempts = new Map<string, number>()

  return {
    current: () => queue[0] ?? null,
    isEmpty: () => queue.length === 0,
    size: () => queue.length,
    originalSize: () => original,
    completedCount: () => completed,
    attemptCount: (cardId) => attempts.get(cardId) ?? 0,
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
        // AGAIN: re-insert at end and bump attempt count so the
        // next presentation of this card sees attemptCount + 1.
        queue.push(head)
        attempts.set(head, (attempts.get(head) ?? 0) + 1)
      } else {
        completed += 1
      }
    },
  }
}
