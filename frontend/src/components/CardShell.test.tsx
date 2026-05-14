import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CardShell } from './CardShell'

const baseCard = {
  id: 'm1-s0-c1',
  topic: 'Mutable vs immutable built-in types',
  sphere_id: 'm1-s0',
}

describe('CardShell', () => {
  test('renders the eyebrow with 1-indexed position + sphere_id', () => {
    render(
      <CardShell card={baseCard} position={{ index: 7, total: 20 }}>
        <div>body</div>
      </CardShell>,
    )
    expect(screen.getByText('7/20')).toBeInTheDocument()
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

  // T5.10.5 Issue 1: the difficulty meter was dropped from the header.
  // Reasoning: visually identical to a horizontal progress-dots widget,
  // it sat next to the textual "Card N of M" counter and read like a
  // session-progress indicator. Beyond ambiguity, content-authored
  // difficulty pre-engagement is metacognitive prime-poisoning — the
  // user's own self-assessment after the card is the signal that
  // matters (see ADR-015). The field stays in the schema for content
  // tooling and Phase 7 stats, but no card-type renderer reads it.
  test('does not render a difficulty meter or any difficulty dots', () => {
    render(
      <CardShell card={baseCard} position={{ index: 1, total: 1 }}>
        <div>body</div>
      </CardShell>,
    )
    expect(screen.queryByRole('img', { name: /difficulty/i })).not.toBeInTheDocument()
    expect(screen.queryAllByTestId('difficulty-dot')).toHaveLength(0)
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
    expect(screen.getByText('1/1')).toBeInTheDocument()
  })
})
