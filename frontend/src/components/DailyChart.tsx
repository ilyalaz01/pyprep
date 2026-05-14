/**
 * DailyChart — 90-day calendar heatmap of review activity.
 *
 * Hand-rolled SVG per ADR-025. 13-week grid (12 full + 1 partial current
 * week), 7 rows (Sun top, Sat bottom). Monochrome 5-step saturation
 * scale on --color-fg-muted. Anti-Duolingo discipline: no green/yellow/
 * red gradient, no streak gamification, no shame copy for empty days.
 *
 * Self-contained query so StatsPage's state machine stays driven by the
 * primary overview signal; loading + error states inside this component
 * stay quiet (skeleton + inline note).
 *
 * Stats-S1 (Phase 10.5) replaced the prior 30-day vertical-bar SVG: the
 * max-scaling made cold-start state render with mostly-invisible 1px
 * baselines, and 30 days was too narrow to reveal weekly habit patterns.
 * Window is now backed by api.stats.daily(90) — the backend cap.
 */
import { useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'
import { CalendarHeatmap } from './CalendarHeatmap'

export function DailyChart() {
  const q = useQuery({
    queryKey: ['stats', 'daily'],
    queryFn: () => api.stats.daily(90),
  })

  if (q.isLoading) return <DailyChartSkeleton />
  if (q.isError || !q.data) {
    return (
      <p
        data-testid="daily-chart-quiet"
        className="text-sm text-[color:var(--color-fg-subtle)]"
      >
        Couldn't load daily activity.
      </p>
    )
  }

  const days = q.data.days
  if (days.length === 0) {
    return (
      <p
        data-testid="daily-chart-empty"
        className="text-sm text-[color:var(--color-fg-subtle)]"
      >
        No daily activity yet.
      </p>
    )
  }

  return (
    <div data-testid="daily-chart">
      <CalendarHeatmap data={days} />
    </div>
  )
}

function DailyChartSkeleton() {
  return (
    <div
      data-testid="daily-chart-skeleton"
      aria-hidden="true"
      className="h-24 bg-[color:var(--color-bg-elevated)] rounded"
    />
  )
}
