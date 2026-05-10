import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { parseCard, type FlipCard as FlipCardT } from '../lib/card-types'
import { expectAnswerHidden } from '../test/expect-answer-hidden'
import { FlipCard } from './FlipCard'

const flipFixture = {
  id: 'm1-s0-c1', type: 'flip',
  topic: 'Mutable vs immutable built-in types', difficulty: 1,
  tags: ['mutability'],
  question: 'Which of Python\'s built-in types are mutable?',
  answer: 'Mutable: list, dict, set, bytearray. Immutable: int, str, tuple, frozenset.',
  answer_explanation_md: 'Hashability follows from immutability — only immutable objects are dict keys.',
} as const

const card = parseCard(flipFixture) as FlipCardT

describe('FlipCard — pre-reveal', () => {
  test('renders the question prominently', () => {
    render(<FlipCard card={card} onRate={vi.fn()} />)
    expect(screen.getByText(card.question)).toBeInTheDocument()
  })

  test('exposes a Reveal affordance the user can click', () => {
    render(<FlipCard card={card} onRate={vi.fn()} />)
    expect(
      screen.getByRole('button', { name: /reveal/i }),
    ).toBeInTheDocument()
  })

  test('does NOT leak the answer or explanation into the DOM (masking)', () => {
    const { container } = render(<FlipCard card={card} onRate={vi.fn()} />)
    expectAnswerHidden(card, container)
  })

  test('does NOT render the RatingBar before reveal', () => {
    render(<FlipCard card={card} onRate={vi.fn()} />)
    expect(
      screen.queryByRole('button', { name: /again/i }),
    ).not.toBeInTheDocument()
  })
})

describe('FlipCard — post-reveal', () => {
  async function reveal() {
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }))
  }

  test('clicking Reveal surfaces the answer', async () => {
    render(<FlipCard card={card} onRate={vi.fn()} />)
    await reveal()
    expect(screen.getByText(card.answer)).toBeInTheDocument()
  })

  test('surfaces the optional answer_explanation_md when present', async () => {
    render(<FlipCard card={card} onRate={vi.fn()} />)
    await reveal()
    expect(screen.getByText(card.answer_explanation_md!)).toBeInTheDocument()
  })

  test('hides the Reveal button once revealed (no double-fire)', async () => {
    render(<FlipCard card={card} onRate={vi.fn()} />)
    await reveal()
    expect(screen.queryByRole('button', { name: /reveal/i })).not.toBeInTheDocument()
  })

  test('renders the RatingBar after reveal', async () => {
    render(<FlipCard card={card} onRate={vi.fn()} />)
    await reveal()
    for (const label of ['Again', 'Hard', 'Good', 'Easy']) {
      expect(
        screen.getByRole('button', { name: new RegExp(label, 'i') }),
      ).toBeInTheDocument()
    }
  })

  test('forwards rating clicks through to onRate', async () => {
    const onRate = vi.fn()
    render(<FlipCard card={card} onRate={onRate} />)
    await reveal()
    await userEvent.click(screen.getByRole('button', { name: /good/i }))
    expect(onRate).toHaveBeenCalledExactlyOnceWith(3)
  })

  test('the question stays in view after reveal (context for self-rating)', async () => {
    render(<FlipCard card={card} onRate={vi.fn()} />)
    await reveal()
    expect(screen.getByText(card.question)).toBeInTheDocument()
  })
})

describe('FlipCard — flip with no explanation_md', () => {
  test('renders cleanly when answer_explanation_md is absent', async () => {
    const noExplain = parseCard({
      ...flipFixture, answer_explanation_md: undefined,
    }) as FlipCardT
    render(<FlipCard card={noExplain} onRate={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }))
    expect(screen.getByText(noExplain.answer)).toBeInTheDocument()
  })
})
