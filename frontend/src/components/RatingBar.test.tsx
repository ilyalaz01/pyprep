import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RatingBar } from './RatingBar'

const labels = ['Again', 'Hard', 'Good', 'Easy'] as const

describe('RatingBar', () => {
  test('renders four buttons in Again/Hard/Good/Easy order', () => {
    render(<RatingBar onRate={vi.fn()} />)
    const btns = screen.getAllByRole('button')
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

  test('disabled prop blocks clicks on every button', async () => {
    const onRate = vi.fn()
    render(<RatingBar onRate={onRate} disabled />)
    for (const label of labels) {
      await userEvent.click(
        screen.getByRole('button', { name: new RegExp(label, 'i') }),
      )
    }
    expect(onRate).not.toHaveBeenCalled()
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled())
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
})
