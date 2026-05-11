import { describe, expect, test } from 'vitest'
import { screen } from '@testing-library/react'

import { SessionSummary, type SessionDetails } from './SessionSummary'
import { renderInMiniRouter } from '../test/mini-router'

const baseDetails: SessionDetails = {
  cardsReviewed: 15,
  elapsedMs: (8 * 60 + 23) * 1000, // 8 min 23s
  ratings: { again: 1, hard: 3, good: 8, easy: 3 },
  accuracy: { correct: 12, total: 15 },
  nextDueBuckets: [
    { label: 'Tomorrow', count: 5 },
    { label: 'In 3 days', count: 3 },
    { label: 'In 1 week', count: 4 },
    { label: 'Later', count: 3 },
  ],
}

const renderSummary = (over: Partial<SessionDetails> = {}) =>
  renderInMiniRouter(
    <SessionSummary
      details={{ ...baseDetails, ...over }}
      moduleId={1}
      sphereId="m1-s0"
    />,
    [
      '/modules/$moduleId',
      '/modules/$moduleId/sphere/$sphereId/session',
    ],
  )

// Anchor query — wait for the component to be mounted by the router.
const ready = () => screen.findByTestId('session-summary')

describe('SessionSummary', () => {
  test('renders RESULTS and NEXT UP eyebrows', async () => {
    renderSummary()
    await ready()
    expect(screen.getByText(/^results$/i)).toBeInTheDocument()
    expect(screen.getByText(/^next up$/i)).toBeInTheDocument()
  })

  test('shows cards reviewed count with the unit', async () => {
    renderSummary()
    await ready()
    expect(screen.getByText(/15 cards/i)).toBeInTheDocument()
  })

  test('shows time invested in M min Ss format for >= 1 minute', async () => {
    renderSummary()
    await ready()
    expect(screen.getByText(/8 min 23s/i)).toBeInTheDocument()
  })

  test('renders just seconds when elapsed < 1 minute', async () => {
    renderSummary({ elapsedMs: 23_000 })
    await ready()
    expect(screen.getByText(/^23s$/)).toBeInTheDocument()
    expect(screen.queryByText(/min/i)).not.toBeInTheDocument()
  })

  test('rating breakdown shows all four counts in Again/Hard/Good/Easy order', async () => {
    renderSummary()
    await ready()
    const breakdown = screen.getByTestId('rating-breakdown')
    const txt = breakdown.textContent ?? ''
    const order = ['Again', 'Hard', 'Good', 'Easy'].map((w) => txt.indexOf(w))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(txt).toContain('1 Again')
    expect(txt).toContain('3 Hard')
    expect(txt).toContain('8 Good')
    expect(txt).toContain('3 Easy')
  })

  test('rating breakdown uses the matching outcome color tokens', async () => {
    renderSummary()
    await ready()
    const html = screen.getByTestId('rating-breakdown').innerHTML
    expect(html).toMatch(/--color-danger/)      // Again
    expect(html).toMatch(/--color-warn/)        // Hard
    expect(html).toMatch(/--color-good-muted/)  // Good
    expect(html).toMatch(/--color-good\b/)      // Easy (\b so we don't match good-muted)
  })

  test('accuracy row shows percent + objective denominator when present', async () => {
    renderSummary()
    await ready()
    expect(
      screen.getByText(/accuracy: 80% \(12 of 15 objective cards\)/i),
    ).toBeInTheDocument()
  })

  test('omits accuracy row entirely when no objective cards', async () => {
    renderSummary({ accuracy: null })
    await ready()
    expect(screen.queryByText(/accuracy/i)).not.toBeInTheDocument()
  })

  test('next-up renders one row per non-empty bucket', async () => {
    renderSummary()
    const root = await ready()
    // Row label + count are styled as separate <span> + text-node, so
    // getByText regex won't span them. Match against the container text.
    const txt = root.textContent ?? ''
    expect(txt).toMatch(/tomorrow:\s*5 cards/i)
    expect(txt).toMatch(/in 3 days:\s*3 cards/i)
    expect(txt).toMatch(/in 1 week:\s*4 cards/i)
    expect(txt).toMatch(/later:\s*3 cards/i)
  })

  test('omits empty buckets from next-up section', async () => {
    renderSummary({
      nextDueBuckets: [
        { label: 'Tomorrow', count: 5 },
        { label: 'Later', count: 2 },
      ],
    })
    const root = await ready()
    const txt = root.textContent ?? ''
    expect(txt).toMatch(/tomorrow:\s*5 cards/i)
    expect(txt).toMatch(/later:\s*2 cards/i)
    expect(txt).not.toMatch(/in 3 days/i)
    expect(txt).not.toMatch(/in 1 week/i)
  })

  test('renders both CTAs with correct hrefs', async () => {
    renderSummary()
    await ready()
    const back = screen.getByRole('link', { name: /back to module/i })
    const again = screen.getByRole('link', { name: /practice again/i })
    expect(back).toHaveAttribute('href', '/modules/1')
    expect(again).toHaveAttribute('href', '/modules/1/sphere/m1-s0/session')
  })

  test('contains no celebratory copy (PRODUCT.md honest signaling)', async () => {
    renderSummary()
    const root = await ready()
    const txt = (root.textContent ?? '').toLowerCase()
    for (const banned of ['great', 'awesome', 'congrat', 'streak', ' xp ', '🎉']) {
      expect(txt).not.toContain(banned)
    }
  })
})
