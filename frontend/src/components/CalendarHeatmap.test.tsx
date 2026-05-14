import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CalendarHeatmap } from './CalendarHeatmap'

function makeDays(counts: number[], startIso = '2026-02-12'): Array<{ date: string; reviews_total: number; retention: number }> {
  const start = new Date(`${startIso}T00:00:00Z`)
  return counts.map((n, i) => {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    return {
      date: d.toISOString().slice(0, 10),
      reviews_total: n,
      retention: n > 0 ? 0.8 : 0,
    }
  })
}

describe('CalendarHeatmap', () => {
  test('renders role="img" with default aria-label including window length + max', () => {
    render(<CalendarHeatmap data={makeDays([0, 3, 1, 0, 5, 2, 0])} />)
    const svg = screen.getByRole('img')
    expect(svg.getAttribute('aria-label')).toMatch(/7 days/)
    expect(svg.getAttribute('aria-label')).toMatch(/max 5/)
  })

  test('honors ariaLabel prop when passed', () => {
    render(<CalendarHeatmap data={makeDays([1])} ariaLabel="Custom label" />)
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Custom label')
  })

  test('renders 91 rect cells (13 cols × 7 rows)', () => {
    render(<CalendarHeatmap data={makeDays(Array(90).fill(1))} />)
    const svg = screen.getByTestId('calendar-heatmap')
    expect(svg.querySelectorAll('rect')).toHaveLength(91)
  })

  test('in-window cells with reviews carry a <title> "Mon D: N reviews"', () => {
    // 3-day window: 2026-02-12 (Thu) .. 2026-02-14 (Sat). Anchor = Sat.
    render(<CalendarHeatmap data={makeDays([1, 2, 3])} />)
    const titles = Array.from(
      screen.getByTestId('calendar-heatmap').querySelectorAll('title'),
    ).map((t) => t.textContent)
    expect(titles).toContain('Feb 12: 1 review')
    expect(titles).toContain('Feb 13: 2 reviews')
    expect(titles).toContain('Feb 14: 3 reviews')
  })

  test('zero-review days render a "no reviews" title (not absent)', () => {
    render(<CalendarHeatmap data={makeDays([0, 0, 0])} />)
    const titles = Array.from(
      screen.getByTestId('calendar-heatmap').querySelectorAll('title'),
    ).map((t) => t.textContent)
    expect(titles.filter((t) => t?.endsWith(': no reviews'))).toHaveLength(3)
  })

  test('out-of-window cells render fill="transparent" and no <title>', () => {
    // 1-day window — 90 of the 91 cells should be transparent.
    render(<CalendarHeatmap data={makeDays([4])} />)
    const rects = Array.from(
      screen.getByTestId('calendar-heatmap').querySelectorAll('rect'),
    )
    const transparent = rects.filter((r) => r.getAttribute('fill') === 'transparent')
    expect(transparent.length).toBe(90)
    for (const r of transparent) expect(r.querySelector('title')).toBeNull()
  })

  test('empty data array renders nothing', () => {
    const { container } = render(<CalendarHeatmap data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  test('uses theme tokens — no magic colors', () => {
    const { container } = render(<CalendarHeatmap data={makeDays([2, 0, 5])} />)
    expect(container.innerHTML).toMatch(/var\(--color-/)
  })
})
