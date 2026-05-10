import { describe, expect, test } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { CardShell } from './CardShell'

const baseCard = {
  id: 'm1-s0-c1',
  topic: 'Mutable vs immutable built-in types',
  difficulty: 3 as const,
  sphere_id: 'm1-s0',
}

describe('CardShell', () => {
  test('renders the eyebrow with 1-indexed position + sphere_id', () => {
    render(
      <CardShell card={baseCard} position={{ index: 7, total: 20 }}>
        <div>body</div>
      </CardShell>,
    )
    expect(screen.getByText(/card 7 of 20/i)).toBeInTheDocument()
    expect(screen.getByText('m1-s0')).toBeInTheDocument()
  })

  test('renders the topic as the visible title', () => {
    render(
      <CardShell card={baseCard} position={{ index: 1, total: 1 }}>
        <div>body</div>
      </CardShell>,
    )
    expect(
      screen.getByRole('heading', { name: /mutable vs immutable built-in types/i }),
    ).toBeInTheDocument()
  })

  test('renders five difficulty dots — exactly `difficulty` of them are filled', () => {
    render(
      <CardShell card={baseCard} position={{ index: 1, total: 1 }}>
        <div>body</div>
      </CardShell>,
    )
    const meter = screen.getByRole('img', { name: /difficulty 3 of 5/i })
    const dots = within(meter).getAllByTestId('difficulty-dot')
    expect(dots).toHaveLength(5)
    expect(dots.filter((d) => d.dataset.filled === 'true')).toHaveLength(3)
  })

  test('renders children in the main content slot', () => {
    render(
      <CardShell card={baseCard} position={{ index: 1, total: 1 }}>
        <div data-testid="slot-content">hello card body</div>
      </CardShell>,
    )
    expect(screen.getByTestId('slot-content')).toHaveTextContent('hello card body')
  })

  test('uses theme tokens — no magic colors', () => {
    const { container } = render(
      <CardShell card={baseCard} position={{ index: 1, total: 1 }}>
        <div>body</div>
      </CardShell>,
    )
    expect(container.innerHTML).toMatch(/var\(--color-/)
  })

  test('omits the sphere_id caption when not provided on the card', () => {
    render(
      <CardShell
        card={{ ...baseCard, sphere_id: undefined }}
        position={{ index: 1, total: 1 }}
      >
        <div>body</div>
      </CardShell>,
    )
    expect(screen.queryByText('m1-s0')).not.toBeInTheDocument()
    // Position eyebrow still renders.
    expect(screen.getByText(/card 1 of 1/i)).toBeInTheDocument()
  })
})
