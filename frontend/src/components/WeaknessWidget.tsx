/**
 * WeaknessWidget — top-N weakest spheres, ranked by weakness score.
 *
 * Extracted from HomeDashboard at T7.8 so /home and /stats share the
 * same rendering. Both surfaces:
 *   /home  — mounted ONLY when overview.reviews_total ≥ 10 (the
 *            "premature signal" gate is in the parent, not here).
 *   /stats — always mounted; owner-clarified "different surface
 *            intent: /stats is explicit user-requested, so empty
 *            state is appropriate" (Phase 7 brief §A).
 *
 * Self-contained query: owns `useQuery({queryKey: ['stats',
 * 'weakness']})`. React Query dedupes by key, so both surfaces share
 * the same cached response.
 *
 * Row shape: lesson_title primary, sphere_id mono caption beneath
 * when a title is available. retention % on the right. tabular-nums.
 * Matches the T4.5.6 "Address-vs-Label" rule.
 *
 * Anti-Duolingo discipline: "weak" is the audit-given name but the
 * UI copy stays neutral — "No weak spheres yet. Keep practicing."
 * is gentle; no "you're struggling with X" framing.
 */
import { useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'
import { Section } from './Section'

interface WeaknessWidgetProps {
  title?: string
  /** Default 3; bumped to 5 on /stats if the surface wants more rows. */
  topN?: number
}

export function WeaknessWidget({
  title = 'Top 3 weakness areas',
  topN = 3,
}: WeaknessWidgetProps) {
  const q = useQuery({
    queryKey: ['stats', 'weakness', topN],
    queryFn: () => api.stats.weakness(topN),
  })

  return (
    <Section title={title}>
      <WeaknessBody isLoading={q.isLoading} isError={q.isError} data={q.data} />
    </Section>
  )
}

interface BodyProps {
  isLoading: boolean
  isError: boolean
  data: { top: Array<{ sphere_id: string; lesson_title: string | null; retention: number }> } | undefined
}

function WeaknessBody({ isLoading, isError, data }: BodyProps) {
  if (isLoading) {
    return (
      <div data-testid="weakness-skeleton" aria-hidden="true" className="space-y-2">
        <div className="h-4 w-3/4 bg-[color:var(--color-bg-elevated)] rounded" />
        <div className="h-4 w-2/3 bg-[color:var(--color-bg-elevated)] rounded" />
        <div className="h-4 w-1/2 bg-[color:var(--color-bg-elevated)] rounded" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <p
        data-testid="weakness-quiet"
        className="text-sm text-[color:var(--color-fg-subtle)]"
      >
        Couldn't load weakness ranking.
      </p>
    )
  }
  if (data.top.length === 0) {
    return (
      <p
        data-testid="weakness-empty"
        className="text-sm text-[color:var(--color-fg-muted)]"
      >
        No weak spheres yet. Keep practicing.
      </p>
    )
  }
  return (
    <ul data-testid="weakness-list" className="space-y-2">
      {data.top.map((s) => (
        <li
          key={s.sphere_id}
          className="flex items-baseline justify-between gap-4 text-sm"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[color:var(--color-fg)] truncate">
              {s.lesson_title ?? s.sphere_id}
            </span>
            {s.lesson_title && (
              <span className="block text-xs font-mono text-[color:var(--color-fg-subtle)]">
                {s.sphere_id}
              </span>
            )}
          </span>
          <span className="shrink-0 text-xs text-[color:var(--color-fg-muted)] tabular-nums">
            {Math.round(s.retention * 100)}% retention
          </span>
        </li>
      ))}
    </ul>
  )
}
