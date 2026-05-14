import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  test('renders with role="progressbar" and aria-valuenow reflecting value', () => {
    render(<ProgressBar value={0.5} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toBeInTheDocument()
    expect(bar).toHaveAttribute('aria-valuenow', '50')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  test('clamps value above 1 to 100 and below 0 to 0', () => {
    const { rerender } = render(<ProgressBar value={1.5} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    rerender(<ProgressBar value={-0.2} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  test('applies ariaLabel for screen-reader context', () => {
    render(<ProgressBar value={0.25} ariaLabel="Card 1 of 4" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Card 1 of 4')
  })

  test('applies className on the outer track element', () => {
    render(<ProgressBar value={0.1} className="flex-1" />)
    expect(screen.getByRole('progressbar').className).toContain('flex-1')
  })

  test('uses theme tokens — no magic colors', () => {
    const { container } = render(<ProgressBar value={0.75} />)
    expect(container.innerHTML).toMatch(/var\(--color-/)
  })
})
