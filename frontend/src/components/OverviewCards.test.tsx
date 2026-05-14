/**
 * P7.T7.5 — OverviewCards rendering tests.
 *
 * Verifies the five-tile structure renders, each tile carries the
 * expected value+units+label, and the anti-Duolingo framing
 * (per Phase 7 brief §C) holds: no emoji, no shame copy, no
 * gamification chrome.
 */
import { describe, expect, test } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import type { Overview } from '../lib/types'
import { OverviewCards } from './OverviewCards'

const sample: Overview = {
  reviews_total: 12,
  retention: 0.833,
  streak: 3,
  xp: 45,
  orphan_review_count: 0,
  total_seconds: 3725, // 1h 2m
}

function tileBy(label: string): HTMLElement {
  const el = document.querySelector(`[data-tile="${label}"]`)
  if (!el) throw new Error(`tile not found: ${label}`)
  return el as HTMLElement
}

describe('OverviewCards — structure', () => {
  test('renders four tiles (Accuracy dropped per P7-fix / N040)', () => {
    render(<OverviewCards data={sample} />)
    expect(screen.getByTestId('overview-cards').children).toHaveLength(4)
  })

  test('Reviewed tile shows count + plural label', () => {
    render(<OverviewCards data={sample} />)
    const tile = tileBy('Reviewed')
    expect(within(tile).getByText('12')).toBeInTheDocument()
    expect(within(tile).getByText('reviews')).toBeInTheDocument()
  })

  // P7-fix regression guard: per ADR-015 + N040, cross-session
  // accuracy is structurally unavailable; the tile must stay dropped
  // until backend stores outcome (ADR amendment + schema migration).
  test('NO Accuracy tile rendered (server has no outcome data)', () => {
    const { container } = render(<OverviewCards data={sample} />)
    expect(container.querySelector('[data-tile="Accuracy"]')).toBeNull()
    expect(container.textContent ?? '').not.toMatch(/accuracy/i)
  })

  test('Time invested tile shows wall-clock (ADR-027), highest unit', () => {
    render(<OverviewCards data={sample} />)
    const tile = tileBy('Time invested')
    expect(within(tile).getByText('1h 2m')).toBeInTheDocument()
  })

  test('Active streak tile shows day count + neutral framing', () => {
    render(<OverviewCards data={sample} />)
    const tile = tileBy('Active streak')
    expect(within(tile).getByText('3')).toBeInTheDocument()
    expect(within(tile).getByText('days')).toBeInTheDocument()
  })

  test('Progress (XP) tile shows rounded number + units', () => {
    render(<OverviewCards data={sample} />)
    const tile = tileBy('Progress')
    expect(within(tile).getByText('45')).toBeInTheDocument()
    expect(within(tile).getByText('XP')).toBeInTheDocument()
  })

  test('singular streak: 1 day (not "1 days")', () => {
    render(<OverviewCards data={{ ...sample, streak: 1 }} />)
    const tile = tileBy('Active streak')
    expect(within(tile).getByText('day')).toBeInTheDocument()
    expect(within(tile).queryByText('days')).not.toBeInTheDocument()
  })

  test('zero streak renders "0 days" — neutral, not "broken streak"', () => {
    render(<OverviewCards data={{ ...sample, streak: 0 }} />)
    const tile = tileBy('Active streak')
    expect(within(tile).getByText('0')).toBeInTheDocument()
    expect(within(tile).getByText('days')).toBeInTheDocument()
  })
})

// Stats-S3 (Phase 10.5): each tile renders an icon in its eyebrow row.
describe('OverviewCards — Stats-S3 icons', () => {
  test('every tile renders an <svg> icon', () => {
    render(<OverviewCards data={sample} />)
    for (const label of ['Reviewed', 'Time invested', 'Active streak', 'Progress']) {
      expect(tileBy(label).querySelector('svg')).not.toBeNull()
    }
  })

  // Anti-Duolingo regression guard: the Calendar icon for the streak
  // tile is a deliberate "NOT Flame" design call. If a future contributor
  // swaps in Flame, this test must catch it. We check the icons module
  // does not export Flame and the rendered streak tile's <svg> does not
  // carry the Lucide Flame path data.
  test('NO Flame icon anywhere in OverviewCards (anti-Duolingo)', async () => {
    const icons = await import('./icons')
    expect((icons as Record<string, unknown>).Flame).toBeUndefined()
    const { container } = render(<OverviewCards data={sample} />)
    // The Lucide Flame path starts with 'M8.5 14.5' (verbatim path-d signature).
    expect(container.innerHTML).not.toContain('M8.5 14.5')
  })
})

describe('OverviewCards — anti-Duolingo discipline (P7 brief §C)', () => {
  test('no emoji or flame anywhere in the rendered output', () => {
    const { container } = render(<OverviewCards data={sample} />)
    const text = container.textContent ?? ''
    for (const banned of ['🔥', '✨', '🎉', '🏆', '🥇', '⭐', '💯']) {
      expect(text).not.toContain(banned)
    }
  })

  test('no shame/level/rank chrome in tile captions', () => {
    const { container } = render(<OverviewCards data={sample} />)
    const text = container.textContent?.toLowerCase() ?? ''
    for (const banned of [
      'level', 'rank', 'score', 'streak lost', 'broken',
      'keep it up', 'great job', 'amazing', 'congratulations',
    ]) {
      expect(text).not.toContain(banned)
    }
  })

  test('numbers use tabular-nums for column alignment', () => {
    const { container } = render(<OverviewCards data={sample} />)
    const numbers = container.querySelectorAll('.tabular-nums')
    expect(numbers.length).toBe(4)
  })
})
