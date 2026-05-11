import { describe, expect, test, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RatingBar } from './RatingBar'

const labels = ['Again', 'Hard', 'Good', 'Easy'] as const

// The info-icon (T5.10.5 round-2) is also a button, so naive
// getAllByRole('button') picks up 5 elements. Filter to the
// rating-button set by accessible name.
const ratingButtons = () =>
  screen
    .getAllByRole('button')
    .filter((b) =>
      /^(Again|Hard|Good|Easy)\b/i.test(b.getAttribute('aria-label') ?? ''),
    )

describe('RatingBar', () => {
  test('renders four buttons in Again/Hard/Good/Easy order', () => {
    render(<RatingBar onRate={vi.fn()} />)
    const btns = ratingButtons()
    expect(btns).toHaveLength(4)
    btns.forEach((b, i) => expect(b).toHaveTextContent(labels[i]))
  })

  test('each button shows its keyboard digit (1..4) as a caption', () => {
    render(<RatingBar onRate={vi.fn()} />)
    for (const digit of ['1', '2', '3', '4']) {
      expect(screen.getByText(digit)).toBeInTheDocument()
    }
  })

  test.each([
    ['Again', 1], ['Hard', 2], ['Good', 3], ['Easy', 4],
  ] as const)('clicking %s calls onRate(%i)', async (label, rating) => {
    const onRate = vi.fn()
    render(<RatingBar onRate={onRate} />)
    await userEvent.click(screen.getByRole('button', { name: new RegExp(label, 'i') }))
    expect(onRate).toHaveBeenCalledOnce()
    expect(onRate).toHaveBeenCalledWith(rating)
  })

  test('disabled prop blocks clicks on every rating button', async () => {
    const onRate = vi.fn()
    render(<RatingBar onRate={onRate} disabled />)
    for (const label of labels) {
      await userEvent.click(
        screen.getByRole('button', { name: new RegExp(label, 'i') }),
      )
    }
    expect(onRate).not.toHaveBeenCalled()
    // Only rating buttons are gated by `disabled`. The info-icon stays
    // active — explanation should remain reachable while submit is in
    // flight.
    ratingButtons().forEach((b) => expect(b).toBeDisabled())
  })

  test('every button has type="button" so it cannot submit a parent form', () => {
    render(<RatingBar onRate={vi.fn()} />)
    screen.getAllByRole('button').forEach((b) =>
      expect(b).toHaveAttribute('type', 'button'),
    )
  })

  test('outcome buttons use Anki-convention semantic tokens (red/warn/good-muted/good)', () => {
    render(<RatingBar onRate={vi.fn()} />)
    const get = (name: RegExp) => screen.getByRole('button', { name })
    expect(get(/again/i).className).toMatch(/var\(--color-danger\)/)
    expect(get(/hard/i).className).toMatch(/var\(--color-warn\)/)
    // Good = same hue as Easy (success), reduced chroma — keeps the
    // positive-feedback signal but lets Easy stand out as the bright pole.
    expect(get(/good/i).className).toMatch(/var\(--color-good-muted\)/)
    expect(get(/easy/i).className).toMatch(/var\(--color-good\)/)
  })

  test('each button exposes its rating via aria-label for screen readers', () => {
    render(<RatingBar onRate={vi.fn()} />)
    for (const [label, rating] of [
      ['Again', 1], ['Hard', 2], ['Good', 3], ['Easy', 4],
    ] as const) {
      const btn = screen.getByRole('button', { name: new RegExp(label, 'i') })
      const aria = btn.getAttribute('aria-label') ?? ''
      expect(aria.toLowerCase()).toContain(label.toLowerCase())
      expect(aria).toContain(String(rating))
    }
  })

  // T5.10.5 round-2 Issue 2: per-button title remains as the
  // refresher-hint affordance. Per-button visible captions were
  // dropped (cluttered the row); discovery moved to a single
  // info-icon + tooltip — see the block below.
  test.each([
    ['Again', 'Show this card again soon'],
    ['Hard', 'You struggled but recalled it'],
    ['Good', 'You recalled it with some effort'],
    ['Easy', 'Knew it cold, schedule further out'],
  ] as const)('%s exposes its meaning via the title attribute', (label, title) => {
    render(<RatingBar onRate={vi.fn()} />)
    const btn = screen.getByRole('button', { name: new RegExp(label, 'i') })
    expect(btn).toHaveAttribute('title', title)
  })

  // T5.10.5 round-2 Issue 1: discovery moved from per-button text
  // captions to a single info-icon next to a visible "Rate this
  // card" label. Tooltip lists all four rating meanings — primary
  // discovery surface; per-button title remains the secondary
  // refresher.
  describe('rating-help tooltip', () => {
    test('renders a visible "Rate this card" label above the buttons', () => {
      render(<RatingBar onRate={vi.fn()} />)
      // role="group" + visible label = screen-readable affordance
      // without the buttons themselves having to encode it.
      expect(screen.getByText(/rate this card/i)).toBeInTheDocument()
    })

    test('renders an info-icon button next to the label', () => {
      render(<RatingBar onRate={vi.fn()} />)
      const icon = screen.getByRole('button', {
        name: /what do these ratings mean/i,
      })
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('type', 'button')
    })

    test('icon has aria-describedby pointing to the tooltip element', () => {
      render(<RatingBar onRate={vi.fn()} />)
      const icon = screen.getByRole('button', {
        name: /what do these ratings mean/i,
      })
      const tooltipId = icon.getAttribute('aria-describedby')
      expect(tooltipId).toBeTruthy()
      const tooltip = document.getElementById(tooltipId!)
      expect(tooltip).not.toBeNull()
      expect(tooltip).toHaveAttribute('role', 'tooltip')
    })

    test('tooltip content includes all four rating explanations', () => {
      render(<RatingBar onRate={vi.fn()} />)
      const icon = screen.getByRole('button', {
        name: /what do these ratings mean/i,
      })
      const tooltipId = icon.getAttribute('aria-describedby')!
      const tooltip = document.getElementById(tooltipId)!
      const text = tooltip.textContent ?? ''
      expect(text.toLowerCase()).toContain("you didn't recall")
      expect(text.toLowerCase()).toContain('struggled but recalled')
      expect(text.toLowerCase()).toContain('with some effort')
      expect(text.toLowerCase()).toContain('knew it cold')
      // All four rating words appear too.
      for (const w of ['Again', 'Hard', 'Good', 'Easy']) {
        expect(text).toContain(w)
      }
    })

    test('tooltip is hidden by default and shown on hover', async () => {
      const user = userEvent.setup()
      render(<RatingBar onRate={vi.fn()} />)
      const icon = screen.getByRole('button', {
        name: /what do these ratings mean/i,
      })
      const tooltipId = icon.getAttribute('aria-describedby')!
      const tooltip = document.getElementById(tooltipId)!
      expect(tooltip).toHaveAttribute('data-open', 'false')
      await user.hover(icon)
      expect(tooltip).toHaveAttribute('data-open', 'true')
      await user.unhover(icon)
      expect(tooltip).toHaveAttribute('data-open', 'false')
    })

    test('tooltip opens on focus and closes on blur', async () => {
      render(<RatingBar onRate={vi.fn()} />)
      const icon = screen.getByRole('button', {
        name: /what do these ratings mean/i,
      })
      const tooltipId = icon.getAttribute('aria-describedby')!
      const tooltip = document.getElementById(tooltipId)!
      expect(tooltip).toHaveAttribute('data-open', 'false')
      // fireEvent + act → React processes the state update before the
      // next assertion. icon.focus() alone races with React's batched
      // re-render in jsdom.
      act(() => { fireEvent.focus(icon) })
      expect(tooltip).toHaveAttribute('data-open', 'true')
      act(() => { fireEvent.blur(icon) })
      expect(tooltip).toHaveAttribute('data-open', 'false')
    })

    test('clicking the icon opens the tooltip (touch fallback)', async () => {
      // On touch devices there is no hover. A tap focuses the icon
      // (browsers do this for buttons) which is what triggers open;
      // we just pin the user-observable result here.
      const user = userEvent.setup()
      render(<RatingBar onRate={vi.fn()} />)
      const icon = screen.getByRole('button', {
        name: /what do these ratings mean/i,
      })
      const tooltipId = icon.getAttribute('aria-describedby')!
      const tooltip = document.getElementById(tooltipId)!
      await user.click(icon)
      expect(tooltip).toHaveAttribute('data-open', 'true')
    })
  })
})
