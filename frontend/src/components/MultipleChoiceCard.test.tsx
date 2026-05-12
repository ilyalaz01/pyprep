import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  parseCard, type MultipleChoiceCard as MCCardT,
} from '../lib/card-types'
import { expectAnswerHidden } from '../test/expect-answer-hidden'
import { MultipleChoiceCard } from './MultipleChoiceCard'

const fixture = {
  id: 'm1-s0-c5', type: 'multiple_choice',
  topic: 'LEGB resolution order', difficulty: 2, tags: ['scope'],
  question: 'In what order does Python resolve a name reference?',
  options: ['L→G→E→B', 'L→E→G→B', 'B→G→E→L', 'L→M→C→B'],
  correct_index: 1,
  option_explanations: [
    'Wrong order — Enclosing comes before Global.',
    'Correct. LEGB is the canonical mnemonic.',
    'Reverse order — Built-in is the last fallback.',
    'Module/Class isn\'t the canonical Python rule.',
  ],
} as const

const card = parseCard(fixture) as MCCardT

describe('MultipleChoiceCard — pre-submit masking', () => {
  test('renders the question and every option as a button', () => {
    render(<MultipleChoiceCard card={card} onRate={vi.fn()} />)
    expect(screen.getByText(card.question)).toBeInTheDocument()
    for (const opt of card.options) {
      expect(screen.getByRole('button', { name: new RegExp(opt) }))
        .toBeInTheDocument()
    }
  })

  test('does NOT leak option_explanations into the DOM before submit', () => {
    const { container } = render(
      <MultipleChoiceCard card={card} onRate={vi.fn()} />,
    )
    expectAnswerHidden(card, container)
  })

  test('does NOT render the RatingBar before submit', () => {
    render(<MultipleChoiceCard card={card} onRate={vi.fn()} />)
    expect(
      screen.queryByRole('button', { name: /again/i }),
    ).not.toBeInTheDocument()
  })

  test('correct_index is NOT encoded in DOM attributes — option markup is identical regardless of which is correct', () => {
    const { unmount, container: c1 } = render(
      <MultipleChoiceCard card={card} onRate={vi.fn()} />,
    )
    const attrs1 = Array.from(c1.querySelectorAll('button[data-mc-option]'))
      .map((b) => `${b.className}|${b.getAttribute('aria-pressed') ?? ''}|${b.getAttribute('data-correct') ?? ''}`)
    unmount()

    const otherCard = parseCard({ ...fixture, correct_index: 3 }) as MCCardT
    const { container: c2 } = render(
      <MultipleChoiceCard card={otherCard} onRate={vi.fn()} />,
    )
    const attrs2 = Array.from(c2.querySelectorAll('button[data-mc-option]'))
      .map((b) => `${b.className}|${b.getAttribute('aria-pressed') ?? ''}|${b.getAttribute('data-correct') ?? ''}`)

    expect(attrs2).toEqual(attrs1)
  })
})

describe('MultipleChoiceCard — post-submit reveal', () => {
  async function pick(label: string) {
    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(label) }),
    )
  }

  test('clicking an option transitions to the submitted state', async () => {
    render(<MultipleChoiceCard card={card} onRate={vi.fn()} />)
    await pick('L→E→G→B')
    // Once submitted, options become read-only.
    for (const opt of card.options) {
      expect(screen.getByRole('button', { name: new RegExp(opt) })).toBeDisabled()
    }
  })

  test('each option explanation appears near its option after submit', async () => {
    render(<MultipleChoiceCard card={card} onRate={vi.fn()} />)
    await pick('L→E→G→B')
    for (const exp of card.option_explanations) {
      expect(screen.getByText(exp)).toBeInTheDocument()
    }
  })

  test('the correct option is marked as correct after submit', async () => {
    render(<MultipleChoiceCard card={card} onRate={vi.fn()} />)
    await pick('L→G→E→B') // wrong: index 0
    const correctBtn = screen.getByRole('button', { name: /L→E→G→B/ })
    expect(correctBtn).toHaveAttribute('data-correct', 'true')
  })

  test('the user\'s chosen-but-wrong option is marked as chosen', async () => {
    render(<MultipleChoiceCard card={card} onRate={vi.fn()} />)
    await pick('L→G→E→B')
    const chosen = screen.getByRole('button', { name: /L→G→E→B/ })
    expect(chosen).toHaveAttribute('data-chosen', 'true')
    expect(chosen).toHaveAttribute('data-correct', 'false')
  })

  test('the RatingBar appears after submit (ADR-015 self-rate)', async () => {
    render(<MultipleChoiceCard card={card} onRate={vi.fn()} />)
    await pick('L→E→G→B')
    for (const label of ['Again', 'Hard', 'Good', 'Easy']) {
      expect(
        screen.getByRole('button', { name: new RegExp(label, 'i') }),
      ).toBeInTheDocument()
    }
  })

  test('rating click forwards rating + outcome=true (correct answer)', async () => {
    const onRate = vi.fn()
    render(<MultipleChoiceCard card={card} onRate={onRate} />)
    await pick('L→E→G→B') // correct option
    await userEvent.click(screen.getByRole('button', { name: /easy/i }))
    // P7-fix: outcome (correctness) flows alongside rating.
    expect(onRate).toHaveBeenCalledExactlyOnceWith(4, true)
  })

  // P7-fix regression guard: a wrong MC pick + Good rating must report
  // outcome=false. Pre-fix the rating-as-proxy approach would have
  // showed this as correct on the stats accuracy tile.
  test('wrong answer + Good rating: outcome=false (ADR-015 / P7-fix)', async () => {
    const onRate = vi.fn()
    render(<MultipleChoiceCard card={card} onRate={onRate} />)
    await pick('L→G→E→B') // WRONG option
    await userEvent.click(screen.getByRole('button', { name: /good/i }))
    expect(onRate).toHaveBeenCalledExactlyOnceWith(3, false)
  })

  test('correct submission still requires self-rating (no auto-advance per ADR-015)', async () => {
    const onRate = vi.fn()
    render(<MultipleChoiceCard card={card} onRate={onRate} />)
    await pick('L→E→G→B') // correct
    expect(onRate).not.toHaveBeenCalled() // RatingBar present, but no auto-fire
    expect(screen.getByRole('button', { name: /good/i })).toBeInTheDocument()
  })
})
