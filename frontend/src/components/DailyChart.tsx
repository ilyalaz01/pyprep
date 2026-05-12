/**
 * DailyChart — 30-day per-day review-count chart.
 *
 * Hand-rolled SVG per ADR-025. The chart is 30 vertical bars in a
 * fixed-viewBox container that scales to its parent width. Each bar
 * height is scaled against the max review count in the window so the
 * shape conveys relative load. A 1px baseline indicator renders on
 * zero-review days so empty days are visible (not confused with
 * "no data").
 *
 * Per-7-day x-axis labels under the chart use `<time>` elements with
 * mono caption styling. Bars carry SVG `<title>` for native hover +
 * screen reader tooltips ("May 5: 3 reviews").
 *
 * Self-contained query: own `useQuery({queryKey: ['stats', 'daily']})`
 * so StatsPage's state machine stays driven by the primary overview
 * signal; loading + error states inside this component are quiet
 * (skeleton + inline note).
 *
 * Anti-Duolingo discipline: monochrome bars, no gamification glyphs,
 * no color-coded "good vs bad" days. The data is the data.
 */
import { useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'
import type { DailyStat } from '../lib/types'

const VIEWBOX_W = 300
const VIEWBOX_H = 80
const BAR_W = 8 // 30 bars × 10 (8 + 2 gap) = 300 — fits the viewBox exactly
const BAR_GAP = 2
const MAX_BAR_H = 70 // leaves 10 for padding above bars
const BASELINE_Y = VIEWBOX_H // bottom edge

export function DailyChart() {
  const q = useQuery({
    queryKey: ['stats', 'daily'],
    queryFn: () => api.stats.daily(30),
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

  const maxReviews = Math.max(1, ...days.map((d) => d.reviews_total))

  return (
    <div className="space-y-2">
      <svg
        data-testid="daily-chart"
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="w-full h-20 block"
        role="img"
        aria-label={`30-day review activity, max ${maxReviews} on a single day`}
      >
        {days.map((d, i) => (
          <Bar key={d.date} day={d} index={i} maxReviews={maxReviews} />
        ))}
      </svg>
      <DailyAxisLabels days={days} />
    </div>
  )
}

interface BarProps {
  day: DailyStat
  index: number
  maxReviews: number
}

function Bar({ day, index, maxReviews }: BarProps) {
  const x = index * (BAR_W + BAR_GAP)
  // Zero days still show a 1 px baseline indicator so the day is
  // visible (distinguishes "0 reviews" from "no data").
  const rawH = (day.reviews_total / maxReviews) * MAX_BAR_H
  const h = day.reviews_total === 0 ? 1 : Math.max(2, rawH)
  const y = BASELINE_Y - h
  const fill = day.reviews_total === 0
    ? 'var(--color-border)'
    : 'var(--color-fg-muted)'
  const label = day.reviews_total === 0
    ? `${formatDate(day.date)}: no reviews`
    : `${formatDate(day.date)}: ${day.reviews_total} ` +
      `${day.reviews_total === 1 ? 'review' : 'reviews'}`
  return (
    <rect
      data-bar-index={index}
      data-bar-zero={day.reviews_total === 0 ? 'true' : 'false'}
      x={x}
      y={y}
      width={BAR_W}
      height={h}
      fill={fill}
    >
      <title>{label}</title>
    </rect>
  )
}

function DailyAxisLabels({ days }: { days: DailyStat[] }) {
  // 5 anchor labels: days 0, 7, 14, 21, 29. Skip if range < 5 days.
  const anchors = [0, 7, 14, 21, days.length - 1]
    .filter((i, idx, arr) => i >= 0 && i < days.length && arr.indexOf(i) === idx)
  return (
    <div className="flex justify-between text-xs font-mono text-[color:var(--color-fg-subtle)]">
      {anchors.map((i) => (
        <time key={days[i].date} dateTime={days[i].date}>
          {formatDate(days[i].date)}
        </time>
      ))}
    </div>
  )
}

function formatDate(iso: string): string {
  // ISO YYYY-MM-DD → "Mon D" via toLocaleDateString. Browser-native;
  // no date library dependency. Force en-US so the format is stable
  // across owner locales for the MVP — Phase 10 can add i18n.
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

function DailyChartSkeleton() {
  return (
    <div
      data-testid="daily-chart-skeleton"
      aria-hidden="true"
      className="h-20 bg-[color:var(--color-bg-elevated)] rounded"
    />
  )
}
