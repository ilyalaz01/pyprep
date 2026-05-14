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
 * when a title is available. Slim retention bar (ProgressBar shared
 * with the session card progress bar) + compact percentage on the
 * right; tabular-nums for digit-stable alignment. Matches the T4.5.6
 * "Address-vs-Label" rule.
 *
 * Mode prop (Stats-S4 Phase 10.5 IA fix):
 *   - compact: single-line "Weakest: {title} {N}%" — used on /home
 *     dashboard to differentiate from /stats full view. No bar in
 *     compact mode (too dense for a one-liner; the percentage
 *     carries the signal).
 *   - full: top-N rows with retention bars (default; used on /stats).
 *
 * Anti-Duolingo discipline: "weak" is the audit-given name but the
 * UI copy stays neutral — "No weak spheres yet. Keep practicing."
 * is gentle; no "you're struggling with X" framing.
 */
import { useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'
import { ProgressBar } from './ProgressBar'
import { Section } from './Section'

interface WeaknessWidgetProps {
  title?: string
  /** Default 3; bumped to 5 on /stats if the surface wants more rows. */
  topN?: number
  /** Stats-S4: compact = single-line preview (dashboard); full = top-N rows (default). */
  mode?: 'compact' | 'full'
}

export function WeaknessWidget({
  title,
  topN = 3,
  mode = 'full',
}: WeaknessWidgetProps) {
  const resolvedTitle = title ?? (mode === 'compact' ? 'Weakest area' : 'Top 3 weakness areas')
  const effectiveTopN = mode === 'compact' ? 1 : topN
  const q = useQuery({
    queryKey: ['stats', 'weakness', effectiveTopN],
    queryFn: () => api.stats.weakness(effectiveTopN),
  })

  return (
    <Section title={resolvedTitle}>
      <WeaknessBody isLoading={q.isLoading} isError={q.isError} data={q.data} mode={mode} />
    </Section>
  )
}

interface BodyProps {
  isLoading: boolean
  isError: boolean
  data: { top: Array<{ sphere_id: string; lesson_title: string | null; retention: number }> } | undefined
  mode: 'compact' | 'full'
}

function WeaknessBody({ isLoading, isError, data, mode }: BodyProps) {
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
  if (mode === 'compact') {
    const s = data.top[0]
    return (
      <p data-testid="weakness-compact" className="text-sm">
        <span className="text-[color:var(--color-fg-subtle)]">Weakest: </span>
        <span className="text-[color:var(--color-fg)]">
          {s.lesson_title ?? s.sphere_id}
        </span>
        <span className="ml-2 text-[color:var(--color-fg-muted)] tabular-nums">
          {Math.round(s.retention * 100)}%
        </span>
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
          <span className="shrink-0 flex items-center gap-2 text-xs text-[color:var(--color-fg-muted)] tabular-nums">
            <ProgressBar
              value={s.retention}
              ariaLabel={`${Math.round(s.retention * 100)} percent retention`}
              className="w-40"
            />
            <span className="w-10 text-right">{Math.round(s.retention * 100)}%</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
