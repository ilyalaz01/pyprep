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
 *
 * Stats-S3 (Phase 10.5): tile gains an icon in the eyebrow row
 * next to the label; value+units dominate the baseline row below.
 * Icons hand-rolled in ./icons.tsx (Lucide MIT paths, 4-icon
 * vocabulary — no npm dependency per ADR-025 spirit):
 *   Check (Reviewed), Clock (Time), Calendar (Active streak —
 *   NOT Flame, per anti-Duolingo rule), Sparkles (Progress).
 *
 * No outer card container — each Tile already has hairline border
 * + rounded + padding. The S3 spec mentioned "Tier 1.3 treatment",
 * but Tier 1.3 was for Section component; tiles already self-
 * contain at their own granularity. Wrapping would create double-
 * border noise.
 */
import type { ReactNode } from 'react'

import type { Overview } from '../lib/types'
import {
  formatReviews, formatStreak, formatTime, formatXp,
} from '../lib/format-stats'
import { Calendar, Check, Clock, Sparkles } from './icons'

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
      <Tile value={reviews.value} units={reviews.units} label="Reviewed" icon={<Check />} />
      <Tile value={formatTime(data.total_seconds)} label="Time invested" icon={<Clock />} />
      <Tile value={streak.value} units={streak.units} label="Active streak" icon={<Calendar />} />
      <Tile value={formatXp(data.xp)} units="XP" label="Progress" icon={<Sparkles />} />
    </div>
  )
}

interface TileProps {
  value: string
  units?: string
  label: string
  icon: ReactNode
}

function Tile({ value, units, label, icon }: TileProps) {
  return (
    <div
      data-tile={label}
      className={[
        'border border-[color:var(--color-border)] rounded p-4',
        'flex flex-col gap-2',
      ].join(' ')}
    >
      <div className="flex items-center gap-1.5 text-[color:var(--color-fg-subtle)]">
        {icon}
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
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
    </div>
  )
}
