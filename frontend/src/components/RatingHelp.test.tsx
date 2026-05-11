import { describe, expect, test } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RatingHelp } from './RatingHelp'

describe('RatingHelp', () => {
  test('renders a visible "Rate this card" label', () => {
    render(<RatingHelp />)
    expect(screen.getByText(/rate this card/i)).toBeInTheDocument()
  })

  test('renders an info-icon button', () => {
    render(<RatingHelp />)
    const icon = screen.getByRole('button', {
      name: /what do these ratings mean/i,
    })
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('type', 'button')
  })

  test('icon has aria-describedby pointing to the tooltip element', () => {
    render(<RatingHelp />)
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
    render(<RatingHelp />)
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
    for (const w of ['Again', 'Hard', 'Good', 'Easy']) {
      expect(text).toContain(w)
    }
  })

  test('tooltip is hidden by default and shown on hover', async () => {
    const user = userEvent.setup()
    render(<RatingHelp />)
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

  test('tooltip opens on focus and closes on blur', () => {
    render(<RatingHelp />)
    const icon = screen.getByRole('button', {
      name: /what do these ratings mean/i,
    })
    const tooltipId = icon.getAttribute('aria-describedby')!
    const tooltip = document.getElementById(tooltipId)!
    expect(tooltip).toHaveAttribute('data-open', 'false')
    // fireEvent + act → React processes the state update before the
    // next assertion. icon.focus() alone races React's batched rerender
    // in jsdom.
    act(() => { fireEvent.focus(icon) })
    expect(tooltip).toHaveAttribute('data-open', 'true')
    act(() => { fireEvent.blur(icon) })
    expect(tooltip).toHaveAttribute('data-open', 'false')
  })

  test('clicking the icon opens the tooltip (touch fallback)', async () => {
    const user = userEvent.setup()
    render(<RatingHelp />)
    const icon = screen.getByRole('button', {
      name: /what do these ratings mean/i,
    })
    const tooltipId = icon.getAttribute('aria-describedby')!
    const tooltip = document.getElementById(tooltipId)!
    await user.click(icon)
    expect(tooltip).toHaveAttribute('data-open', 'true')
  })
})
