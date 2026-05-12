import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  parseCard, type CodeTrapCard as CodeTrapCardT,
} from '../lib/card-types'
import { expectAnswerHidden } from '../test/expect-answer-hidden'
import { CodeTrapCard } from './CodeTrapCard'

const fixture = {
  id: 'm1-s0-c2', type: 'code_trap',
  topic: 'Mutable default argument', difficulty: 2, tags: ['mutability'],
  code_snippet: 'def add(x, items=[]):\n    items.append(x)\n    return items',
  question: 'What does add(1); add(2); add(3) print on three calls?',
  options: ['[1] [2] [3]', '[1] [1, 2] [1, 2, 3]', 'TypeError', '[]'],
  correct_index: 1,
  explanation_md: 'The default `items=[]` is evaluated once at definition time and shared across calls.',
} as const

const card = parseCard(fixture) as CodeTrapCardT

describe('CodeTrapCard — pre-submit', () => {
  test('the trap code snippet IS visible (it is the question)', () => {
    const { container } = render(<CodeTrapCard card={card} onRate={vi.fn()} />)
    expect(container.textContent).toContain('items.append(x)')
  })

  test('the question text is shown below the code block', () => {
    render(<CodeTrapCard card={card} onRate={vi.fn()} />)
    expect(screen.getByText(card.question)).toBeInTheDocument()
  })

  test('every option renders as a button', () => {
    render(<CodeTrapCard card={card} onRate={vi.fn()} />)
    for (const opt of card.options) {
      expect(
        screen.getByRole('button', { name: new RegExp(opt.replace(/[[\],\s]/g, '\\$&')) }),
      ).toBeInTheDocument()
    }
  })

  test('explanation_md is NOT in the DOM (expectAnswerHidden masking pin)', () => {
    const { container } = render(<CodeTrapCard card={card} onRate={vi.fn()} />)
    expectAnswerHidden(card, container)
  })

  test('correct_index is NOT encoded in pre-submit DOM attributes', () => {
    const { unmount, container: c1 } = render(
      <CodeTrapCard card={card} onRate={vi.fn()} />,
    )
    const fp1 = Array.from(c1.querySelectorAll('button[data-mc-option]'))
      .map((b) => `${b.className}|${b.getAttribute('data-correct') ?? ''}|${b.getAttribute('data-chosen') ?? ''}`)
    unmount()

    const otherCard = parseCard({ ...fixture, correct_index: 3 }) as CodeTrapCardT
    const { container: c2 } = render(
      <CodeTrapCard card={otherCard} onRate={vi.fn()} />,
    )
    const fp2 = Array.from(c2.querySelectorAll('button[data-mc-option]'))
      .map((b) => `${b.className}|${b.getAttribute('data-correct') ?? ''}|${b.getAttribute('data-chosen') ?? ''}`)

    expect(fp2).toEqual(fp1)
  })

  test('RatingBar is NOT rendered before submit', () => {
    render(<CodeTrapCard card={card} onRate={vi.fn()} />)
    expect(
      screen.queryByRole('button', { name: /again/i }),
    ).not.toBeInTheDocument()
  })
})

describe('CodeTrapCard — post-submit', () => {
  async function pickByText(label: string) {
    await userEvent.click(
      screen.getByRole('button', {
        name: new RegExp(label.replace(/[[\],\s]/g, '\\$&')),
      }),
    )
  }

  test('clicking an option locks the choices and reveals correctness', async () => {
    render(<CodeTrapCard card={card} onRate={vi.fn()} />)
    await pickByText('[1] [1, 2] [1, 2, 3]')
    for (const opt of card.options) {
      const btn = screen.getByRole('button', {
        name: new RegExp(opt.replace(/[[\],\s]/g, '\\$&')),
      })
      expect(btn).toBeDisabled()
    }
    const correct = screen.getByRole('button', {
      name: /\[1\] \[1, 2\] \[1, 2, 3\]/,
    })
    expect(correct).toHaveAttribute('data-correct', 'true')
    expect(correct).toHaveAttribute('data-chosen', 'true')
  })

  test('the single explanation_md surfaces after submit', async () => {
    render(<CodeTrapCard card={card} onRate={vi.fn()} />)
    await pickByText('TypeError')
    expect(screen.getByText(/evaluated once at definition time/i))
      .toBeInTheDocument()
  })

  test('RatingBar appears and forwards rating clicks (ADR-015 self-rate)', async () => {
    const onRate = vi.fn()
    render(<CodeTrapCard card={card} onRate={onRate} />)
    await pickByText('[1] [1, 2] [1, 2, 3]') // correct, but still requires self-rate
    expect(onRate).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /hard/i }))
    // P7-fix: outcome=true for the correct pick.
    expect(onRate).toHaveBeenCalledExactlyOnceWith(2, true)
  })

  test('chosen-but-wrong option is marked wrong; correct option still highlighted', async () => {
    render(<CodeTrapCard card={card} onRate={vi.fn()} />)
    await pickByText('TypeError') // wrong: index 2
    const wrong = screen.getByRole('button', { name: /TypeError/ })
    expect(wrong).toHaveAttribute('data-chosen', 'true')
    expect(wrong).toHaveAttribute('data-correct', 'false')
    const correct = screen.getByRole('button', {
      name: /\[1\] \[1, 2\] \[1, 2, 3\]/,
    })
    expect(correct).toHaveAttribute('data-correct', 'true')
    expect(correct).toHaveAttribute('data-chosen', 'false')
  })
})
