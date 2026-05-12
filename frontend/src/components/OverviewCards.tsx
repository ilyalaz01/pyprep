/**
 * OverviewCards — four-tile summary at the top of /stats.
 *
 * Layout: responsive grid, 2 → 4 columns. Hairline border per
 * DESIGN.md (no shadows, no rounded-square chrome). Numbers use
 * `tabular-nums` so adjacent tiles align across the row.
 *
 * Framing (per Phase 7 brief §C, anti-Duolingo discipline):
 *   - Streak: "Active streak" caption + bare day count. NO flame
 *     icon, NO "🔥 N day streak!" copy.
 *   - XP: visible (PRD §3.5 / FR-STATS-4) but the caption is
 *     "Progress" not "Level" / "Rank" / "Score". No level chrome.
 *   - Time: highest meaningful unit (1h 2m vs 3725s). Honest,
 *     wall-clock per ADR-027.
 *   - Reviews: bare count + singular/plural.
 *
 * **No Accuracy tile** (P7-fix, stop point #2): per ADR-015 the
 * server stores rating, not outcome. Cross-session accuracy is
 * therefore structurally unavailable — computing it from
 * `rating >= Good` is a lie (the user can rate Good on wrong
 * answers, ADR-015 explicit intent). Per-session accuracy in
 * SessionSummary IS honest because the renderer has the answer
 * data in-memory; only the aggregate /stats tile is dropped.
 * See NOTES N040 for the post-MVP path to restore.
 */
import type { Overview } from '../lib/types'
import {
  formatReviews, formatStreak, formatTime, formatXp,
} from '../lib/format-stats'

interface OverviewCardsProps {
  data: Overview
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const reviews = formatReviews(data.reviews_total)
  const streak = formatStreak(data.streak)
  return (
    <div
      data-testid="overview-cards"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      <Tile value={reviews.value} units={reviews.units} label="Reviewed" />
      <Tile value={formatTime(data.total_seconds)} label="Time invested" />
      <Tile value={streak.value} units={streak.units} label="Active streak" />
      <Tile value={formatXp(data.xp)} units="XP" label="Progress" />
    </div>
  )
}

interface TileProps {
  value: string
  units?: string
  label: string
}

function Tile({ value, units, label }: TileProps) {
  return (
    <div
      data-tile={label}
      className={[
        'border border-[color:var(--color-border)] rounded p-4',
        'flex flex-col gap-1',
      ].join(' ')}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums text-[color:var(--color-fg)]">
          {value}
        </span>
        {units ? (
          <span className="text-sm text-[color:var(--color-fg-muted)]">
            {units}
          </span>
        ) : null}
      </div>
      <p className="text-xs uppercase tracking-wide text-[color:var(--color-fg-subtle)]">
        {label}
      </p>
    </div>
  )
}
