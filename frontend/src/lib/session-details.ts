/**
 * Session-details helpers (T5.11).
 *
 * Pure module: shapes the rich client-side summary that
 * `useSession` aggregates per session and that <SessionSummary />
 * renders. Splitting the bucketing logic out of useSession keeps
 * the hook under the 150-LOC budget and lets us unit-test the
 * pure parts without touching React.
 *
 * Per-card-type accuracy is restricted to OBJECTIVE_TYPES — flip
 * cards have no objective outcome (the user self-rates only).
 *
 * Next-due bucket boundaries (relative to "now"):
 *   Tomorrow    = within ≤ 1 day
 *   In 3 days   = > 1 and ≤ 3 days
 *   In 1 week   = > 3 and ≤ 7 days
 *   Later       = > 7 days
 *
 * Boundaries align with the FSRS scheduling cadence at the early
 * intervals (1d / 3d / 1w common steps); pre-MVP this is purely a
 * UX bucketing decision, not a scheduling claim.
 */

const DAY_MS = 86_400_000
const RESPONSE_MS_CAP = 600_000

export const OBJECTIVE_TYPES: ReadonlySet<string> = new Set([
  'multiple_choice',
  'code_trap',
  'fill_in',
  'code_task',
])

/** UUIDv4 — 36 chars [0-9a-f-], satisfies server's [A-Za-z0-9_-]{16,128}. */
export function makeIdempotencyKey(): string {
  return crypto.randomUUID()
}

/** Clamp per-card response_ms into the server's accepted range. */
export function clampResponseMs(ms: number): number {
  if (Number.isNaN(ms) || ms < 0) return 0
  if (ms > RESPONSE_MS_CAP) return RESPONSE_MS_CAP
  return Math.floor(ms)
}

export interface SessionDetails {
  cardsReviewed: number
  elapsedMs: number
  ratings: { again: number; hard: number; good: number; easy: number }
  /** null when the session contained no objective cards. */
  accuracy: { correct: number; total: number } | null
  nextDueBuckets: ReadonlyArray<{ label: string; count: number }>
}

/** Empty starting point for the hook before any answers land. */
export function emptyDetails(): SessionDetails {
  return {
    cardsReviewed: 0,
    elapsedMs: 0,
    ratings: { again: 0, hard: 0, good: 0, easy: 0 },
    accuracy: null,
    nextDueBuckets: [],
  }
}

/**
 * Bucket a set of next_due_at ISO strings (one per distinct card,
 * latest scheduling decision) by relative time from `now`. Returns
 * fixed-order labels with possibly-zero counts; the renderer
 * decides whether to omit empty rows.
 */
export function computeNextDueBuckets(
  nextDueIsoByCard: ReadonlyMap<string, string>,
  now: number = Date.now(),
): ReadonlyArray<{ label: string; count: number }> {
  let tomorrow = 0, in3 = 0, in1w = 0, later = 0
  for (const iso of nextDueIsoByCard.values()) {
    const t = Date.parse(iso)
    if (Number.isNaN(t)) continue
    const days = (t - now) / DAY_MS
    if (days <= 1) tomorrow += 1
    else if (days <= 3) in3 += 1
    else if (days <= 7) in1w += 1
    else later += 1
  }
  return [
    { label: 'Tomorrow', count: tomorrow },
    { label: 'In 3 days', count: in3 },
    { label: 'In 1 week', count: in1w },
    { label: 'Later', count: later },
  ]
}

type Rating = 1 | 2 | 3 | 4
type Ratings = SessionDetails['ratings']

/** Mutate-in-place for the hook's per-rating tally ref. */
export function tallyRating(into: Ratings, rating: Rating): void {
  if (rating === 1) into.again += 1
  else if (rating === 2) into.hard += 1
  else if (rating === 3) into.good += 1
  else into.easy += 1
}

/** Pure assembly of the SessionDetails snapshot from hook refs.
 *
 * P7-fix (stop point #2 bug): accuracy is computed from the
 * **outcome** of each objective card (did the user actually answer
 * correctly?), NOT from the rating distribution. Per ADR-015 the user
 * may rate Good on a wrong-but-knew-it answer; using rating>=Good as
 * a correctness proxy reads "100% accuracy" on sessions where the
 * user got things wrong. See NOTES N040 for the cross-session
 * counterpart (currently impossible without backend changes).
 */
export function buildDetails(args: {
  completedCount: number
  startedAt: number  // ms epoch; 0 means session has not started
  ratings: Ratings
  objectiveLastOutcome: ReadonlyMap<string, boolean>
  nextDueByCard: ReadonlyMap<string, string>
  now?: number
}): SessionDetails {
  const now = args.now ?? Date.now()
  let correct = 0
  for (const ok of args.objectiveLastOutcome.values()) if (ok) correct += 1
  return {
    cardsReviewed: args.completedCount,
    elapsedMs: args.startedAt ? now - args.startedAt : 0,
    ratings: { ...args.ratings },
    accuracy: args.objectiveLastOutcome.size === 0
      ? null
      : { correct, total: args.objectiveLastOutcome.size },
    nextDueBuckets: computeNextDueBuckets(args.nextDueByCard, now),
  }
}
