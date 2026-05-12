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
  test('renders five tiles', () => {
    render(<OverviewCards data={sample} />)
    expect(screen.getByTestId('overview-cards').children).toHaveLength(5)
  })

  test('Reviewed tile shows count + plural label', () => {
    render(<OverviewCards data={sample} />)
    const tile = tileBy('Reviewed')
    expect(within(tile).getByText('12')).toBeInTheDocument()
    expect(within(tile).getByText('reviews')).toBeInTheDocument()
  })

  test('Accuracy tile shows rounded percentage, no decimal', () => {
    render(<OverviewCards data={sample} />)
    const tile = tileBy('Accuracy')
    expect(within(tile).getByText('83%')).toBeInTheDocument()
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
    expect(numbers.length).toBe(5)
  })
})
