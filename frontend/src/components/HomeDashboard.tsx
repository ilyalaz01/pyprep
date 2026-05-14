/**
 * HomeDashboard — three sections, in order:
 *   1. Continue where you left off (skipped if no last-active history)
 *   2. Today's review queue (always visible; "0 cards" is a real signal)
 *   3. Weakness top-3 (skipped if total reviews < 10 — premature signal)
 *
 * T7.8: the weakness section is rendered via the shared
 * `<WeaknessWidget />`. The /home gate (≥10 reviews) lives here in
 * the parent — /stats mounts the same widget unconditionally for
 * its own surface intent.
 *
 * No streaks, XP, progress bars, or daily-goal indicators. PRODUCT.md
 * principle 1: honest signaling > motivational theatre.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { api } from '../lib/api'
import { getLastActive } from '../lib/last-active'
import { LinkButton } from './LinkButton'
import { Section } from './Section'
import { WeaknessWidget } from './WeaknessWidget'

const WEAKNESS_MIN_REVIEWS = 10

export function HomeDashboard() {
  const lastActive = getLastActive()

  const queue = useQuery({ queryKey: ['review', 'queue'], queryFn: () => api.review.queue() })
  const overview = useQuery({ queryKey: ['stats', 'me'], queryFn: api.stats.me })

  const queueCount = queue.data?.card_ids.length ?? 0
  const showWeakness = (overview.data?.reviews_total ?? 0) >= WEAKNESS_MIN_REVIEWS

  return (
    <div className="space-y-8">
      {lastActive && (
        <Section title="Continue where you left off">
          <Link
            to="/modules/$moduleId/lesson/$sphereId"
            params={{
              moduleId: String(lastActive.module_id),
              sphereId: lastActive.sphere_id,
            }}
            className="text-sm text-[color:var(--color-fg)] underline-offset-4 hover:underline"
          >
            Module {lastActive.module_id} · {lastActive.sphere_id}
          </Link>
        </Section>
      )}

      <Section
        title="Today's review queue"
        action={
          queueCount > 0 ? (
            lastActive ? (
              <LinkButton
                variant="primary"
                size="sm"
                to="/modules/$moduleId/sphere/$sphereId/session"
                params={{
                  moduleId: String(lastActive.module_id),
                  sphereId: lastActive.sphere_id,
                }}
              >
                Review now
              </LinkButton>
            ) : (
              // No last-active history: send the user to the module
              // dashboard to pick a sphere. (Owner spec said "/modules"
              // but that route does not exist — /home is the module
              // discovery surface.)
              <LinkButton variant="primary" size="sm" to="/home">
                Review now
              </LinkButton>
            )
          ) : null
        }
      >
        <p className="text-sm text-[color:var(--color-fg)]">
          {queueCount === 0
            ? 'Nothing due right now. New cards keep you ahead of the curve.'
            : `${queueCount} card${queueCount === 1 ? '' : 's'} due today.`}
        </p>
      </Section>

      {showWeakness && <WeaknessWidget mode="compact" />}
    </div>
  )
}
