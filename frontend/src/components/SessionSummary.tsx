/**
 * SessionSummary — calm reporting at the end of a card session.
 *
 * Tone is honest signaling (PRODUCT.md): cards reviewed, time
 * invested, per-rating breakdown, accuracy on objective-only card
 * types, and the next-due preview. No XP, streaks, celebratory
 * copy, or animations — owner verifies the feel separately in a
 * design-polish pass.
 *
 * Next-due preview is a Phase-5 client-side aggregation: useSession
 * tracks `next_due_at` returned per /answer call, latest value
 * wins per card. Phase 7 stats UI will source this from a proper
 * server-side query.
 */
import type { SessionDetails } from '../lib/session-details'
import { LinkButton } from './LinkButton'
import { Section } from './Section'

export type { SessionDetails }

interface SessionSummaryProps {
  details: SessionDetails
  moduleId: number
  sphereId: string
}

const RATING_TOKENS = [
  { key: 'again' as const, label: 'Again', token: '--color-danger' },
  { key: 'hard'  as const, label: 'Hard',  token: '--color-warn' },
  { key: 'good'  as const, label: 'Good',  token: '--color-good-muted' },
  { key: 'easy'  as const, label: 'Easy',  token: '--color-good' },
] as const

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  if (totalSec < 60) return `${totalSec}s`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min} min ${sec}s`
}

function formatAccuracy(a: { correct: number; total: number }): string {
  const pct = a.total === 0 ? 0 : Math.round((100 * a.correct) / a.total)
  return `Accuracy: ${pct}% (${a.correct} of ${a.total} objective cards)`
}

export function SessionSummary({
  details, moduleId, sphereId,
}: SessionSummaryProps) {
  return (
    <div data-testid="session-summary" className="space-y-8">
      <Section title="Results">
        <div className="space-y-3 text-base text-[color:var(--color-fg)]">
          <p>
            <span className="text-[color:var(--color-fg-muted)]">
              Cards reviewed:
            </span>{' '}
            {details.cardsReviewed} cards
          </p>
          <p>
            <span className="text-[color:var(--color-fg-muted)]">
              Time invested:
            </span>{' '}
            {formatElapsed(details.elapsedMs)}
          </p>
          <div
            data-testid="rating-breakdown"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
          >
            {RATING_TOKENS.map((r, i) => (
              <span key={r.key} className="inline-flex items-center gap-2">
                {i > 0 ? (
                  <span
                    aria-hidden="true"
                    className="text-[color:var(--color-fg-subtle)]"
                  >
                    ·
                  </span>
                ) : null}
                <span
                  style={{ color: `var(${r.token})` }}
                  className="font-medium"
                >
                  {details.ratings[r.key]} {r.label}
                </span>
              </span>
            ))}
          </div>
          {details.accuracy ? (
            <p className="text-[color:var(--color-fg-muted)]">
              {formatAccuracy(details.accuracy)}
            </p>
          ) : null}
        </div>
      </Section>

      <Section title="Next up">
        {details.nextDueBuckets.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            No upcoming reviews scheduled.
          </p>
        ) : (
          <ul className="space-y-1.5 text-base text-[color:var(--color-fg)]">
            {details.nextDueBuckets
              .filter((b) => b.count > 0)
              .map((b) => (
                <li key={b.label}>
                  <span className="text-[color:var(--color-fg-muted)]">
                    {b.label}:
                  </span>{' '}
                  {b.count} cards
                </li>
              ))}
          </ul>
        )}
      </Section>

      <div className="flex flex-wrap gap-3">
        <LinkButton
          variant="secondary"
          to="/modules/$moduleId"
          params={{ moduleId: String(moduleId) }}
        >
          Back to module
        </LinkButton>
        <LinkButton
          variant="primary"
          to="/modules/$moduleId/sphere/$sphereId/session"
          params={{ moduleId: String(moduleId), sphereId }}
        >
          Practice again
        </LinkButton>
      </div>
    </div>
  )
}
