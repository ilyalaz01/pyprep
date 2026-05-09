/**
 * HomeDashboard — three sections, in order:
 *   1. Continue where you left off (skipped if no last-active history)
 *   2. Today's review queue (always visible; "0 cards" is a real signal)
 *   3. Weakness top-3 (skipped if total reviews < 10 — premature signal)
 *
 * No streaks, XP, progress bars, or daily-goal indicators. PRODUCT.md
 * principle 1: honest signaling > motivational theatre.
 */
import { useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'
import { getLastActive } from '../lib/last-active'
import { Button } from './Button'
import { Section } from './Section'

const WEAKNESS_MIN_REVIEWS = 10

export function HomeDashboard() {
  const lastActive = getLastActive()

  const queue = useQuery({ queryKey: ['review', 'queue'], queryFn: () => api.review.queue() })
  const overview = useQuery({ queryKey: ['stats', 'me'], queryFn: api.stats.me })
  const weakness = useQuery({
    queryKey: ['stats', 'weakness'],
    queryFn: () => api.stats.weakness(3),
    enabled: (overview.data?.reviews_total ?? 0) >= WEAKNESS_MIN_REVIEWS,
  })

  const queueCount = queue.data?.card_ids.length ?? 0
  const showWeakness = (overview.data?.reviews_total ?? 0) >= WEAKNESS_MIN_REVIEWS

  return (
    <div className="space-y-8">
      {lastActive && (
        <Section title="Continue where you left off">
          <a
            href={`/modules/${lastActive.module_id}/lesson/${lastActive.sphere_id}`}
            className="text-sm text-[color:var(--color-fg)] underline-offset-4 hover:underline"
          >
            Module {lastActive.module_id} · {lastActive.sphere_id}
          </a>
        </Section>
      )}

      <Section
        title="Today's review queue"
        action={
          queueCount > 0 ? (
            <Button variant="primary" size="sm" onClick={() => (window.location.href = '/review')}>
              Review now
            </Button>
          ) : null
        }
      >
        <p className="text-sm text-[color:var(--color-fg)]">
          {queueCount === 0
            ? 'Nothing due right now. New cards keep you ahead of the curve.'
            : `${queueCount} card${queueCount === 1 ? '' : 's'} due today.`}
        </p>
      </Section>

      {showWeakness && (
        <Section title="Top 3 weakness areas">
          {weakness.data?.top.length ? (
            <ul className="space-y-1.5">
              {weakness.data.top.map((s) => (
                <li
                  key={s.sphere_id}
                  className="flex items-baseline justify-between text-sm"
                >
                  <span className="text-[color:var(--color-fg)]">{s.sphere_id}</span>
                  <span className="text-xs text-[color:var(--color-fg-muted)] tabular-nums">
                    {Math.round(s.retention * 100)}% retention
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              No weak spheres yet — keep practicing.
            </p>
          )}
        </Section>
      )}
    </div>
  )
}
