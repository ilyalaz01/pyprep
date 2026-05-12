/**
 * P7.T7.5 — formatters for OverviewCards.
 *
 * Pure functions, no React. Pulled out so the rendering component
 * stays narrowly visual and the formatting rules are unit-testable
 * in isolation (edge cases around 0, singular/plural, large values).
 *
 * Framing decisions baked in (per Phase 7 brief §C anti-Duolingo
 * discipline):
 *   - Streak label is "Active streak" + bare day count, NOT "🔥 N
 *     day streak!" — visible but not shamed (PRD §3.5 / FR-STATS-4).
 *   - Time is shown to the highest meaningful unit, never as raw
 *     seconds for long values (e.g. 3725s → "1h 2m", not "3725s").
 *   - All values use Latin-1 spaces and digits; no emoji, no flame,
 *     no badges — fits DESIGN.md "no Duolingo affordance" rule.
 */

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.floor(seconds))}s`
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return s === 0 ? `${m}m` : `${m}m ${s}s`
  }
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatStreak(days: number): { value: string; units: string } {
  return { value: String(Math.max(0, Math.floor(days))), units: days === 1 ? 'day' : 'days' }
}

export function formatAccuracy(retention: number): string {
  return `${Math.round(Math.max(0, Math.min(1, retention)) * 100)}%`
}

export function formatXp(xp: number): string {
  // Integer XP for display — fractional XP from per-difficulty
  // multipliers is a service-side artefact; the UI shows whole points.
  return String(Math.round(Math.max(0, xp)))
}

export function formatReviews(n: number): { value: string; units: string } {
  return { value: String(Math.max(0, Math.floor(n))), units: n === 1 ? 'review' : 'reviews' }
}
