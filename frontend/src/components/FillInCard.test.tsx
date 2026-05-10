import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  parseCard, type FillInCard as FillInCardT,
} from '../lib/card-types'
import { expectAnswerHidden } from '../test/expect-answer-hidden'
import { FillInCard } from './FillInCard'

const fixture = {
  id: 'm1-s0-c4', type: 'fill_in',
  topic: 'Mutable-default fix pattern', difficulty: 2, tags: ['mutability'],
  code_snippet_with_blanks: 'def add_user(name, tags=___):\n    if tags ___ ___:\n        tags = ___\n    return tags',
  accepted_answers: [
    ['None'], ['is'], ['None'], ['[]', 'list()'],
  ],
  explanation_md: 'Use a None sentinel and create the empty container inside the function body.',
} as const

const card = parseCard(fixture) as FillInCardT

describe('FillInCard — pre-submit', () => {
  test('renders one input widget per blank, in document order', () => {
    render(<FillInCard card={card} onRate={vi.fn()} />)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(card.accepted_answers.length)
    inputs.forEach((el, i) =>
      expect(el).toHaveAttribute('data-blank-index', String(i)),
    )
  })

  test('snippet text surrounding the blanks IS visible', () => {
    const { container } = render(<FillInCard card={card} onRate={vi.fn()} />)
    expect(container.textContent).toContain('def add_user(name, tags=')
    expect(container.textContent).toContain('return tags')
  })

  test('accepted_answers + explanation_md NOT in DOM (expectAnswerHidden pin)', () => {
    const { container } = render(<FillInCard card={card} onRate={vi.fn()} />)
    expectAnswerHidden(card, container)
  })

  test('no per-blank correctness marker or remediation row before submit', () => {
    // Structural masking pin (compensates for skipping the substring
    // check on accepted_answers — tokens like "is" and "[]" collide
    // with snippet text by design).
    render(<FillInCard card={card} onRate={vi.fn()} />)
    for (const inp of screen.getAllByRole('textbox')) {
      expect(inp).not.toHaveAttribute('data-correct')
    }
    expect(screen.queryAllByTestId('blank-remediation')).toHaveLength(0)
  })

  test('Check button is visible; RatingBar is not', () => {
    render(<FillInCard card={card} onRate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /check/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /again/i })).not.toBeInTheDocument()
  })
})

describe('FillInCard — post-submit', () => {
  function fill(values: (string | null)[]) {
    // fireEvent.change skips userEvent's bracket/key descriptor parsing,
    // which is necessary because some accepted answers contain '[]'.
    const inputs = screen.getAllByRole('textbox')
    for (let i = 0; i < values.length; i++) {
      const v = values[i]
      if (v === null) continue
      fireEvent.change(inputs[i], { target: { value: v } })
    }
  }
  async function check() {
    await userEvent.click(screen.getByRole('button', { name: /check/i }))
  }

  test('all-correct submission marks every blank correct, no remediation text', async () => {
    render(<FillInCard card={card} onRate={vi.fn()} />)
    fill(['None', 'is', 'None', '[]'])
    await check()
    for (const inp of screen.getAllByRole('textbox')) {
      expect(inp).toHaveAttribute('data-correct', 'true')
      expect(inp).toBeDisabled()
    }
    // No remediation rows when everything is right.
    expect(screen.queryByText(/correct:/i)).not.toBeInTheDocument()
  })

  test('wrong blanks show "Correct: <answers joined by or>" remediation', async () => {
    render(<FillInCard card={card} onRate={vi.fn()} />)
    fill(['None', 'wrong', 'wrong', 'wrong'])
    await check()
    const remediation = screen.getAllByTestId('blank-remediation')
    expect(remediation).toHaveLength(3)
    expect(within(remediation[2]).getByText(/correct:.*\[\].*or.*list\(\)/i))
      .toBeInTheDocument()
  })

  test('case-insensitive + trimmed input still counts as correct', async () => {
    render(<FillInCard card={card} onRate={vi.fn()} />)
    fill(['  none  ', 'IS', 'NONE', 'LIST()'])
    await check()
    for (const inp of screen.getAllByRole('textbox')) {
      expect(inp).toHaveAttribute('data-correct', 'true')
    }
  })

  test('empty input is graded wrong (does not block submit)', async () => {
    render(<FillInCard card={card} onRate={vi.fn()} />)
    await check() // never typed anything
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach((inp) =>
      expect(inp).toHaveAttribute('data-correct', 'false'),
    )
  })

  test('explanation_md surfaces after submit', async () => {
    render(<FillInCard card={card} onRate={vi.fn()} />)
    fill(['None', 'is', 'None', '[]'])
    await check()
    expect(screen.getByText(/None sentinel/i)).toBeInTheDocument()
  })

  test('RatingBar appears + forwards rating clicks (ADR-015 self-rate)', async () => {
    const onRate = vi.fn()
    render(<FillInCard card={card} onRate={onRate} />)
    fill(['None', 'is', 'None', '[]'])
    await check()
    expect(onRate).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /good/i }))
    expect(onRate).toHaveBeenCalledExactlyOnceWith(3)
  })

  test('Check button hides after submit (no double-fire)', async () => {
    render(<FillInCard card={card} onRate={vi.fn()} />)
    fill(['None', 'is', 'None', '[]'])
    await check()
    expect(screen.queryByRole('button', { name: /check/i })).not.toBeInTheDocument()
  })
})

describe('FillInCard — keyboard', () => {
  test('Enter on the last blank triggers Check', () => {
    render(<FillInCard card={card} onRate={vi.fn()} />)
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[3], { target: { value: '[]' } })
    fireEvent.keyDown(inputs[3], { key: 'Enter' })
    // Submit happened — inputs are disabled.
    inputs.forEach((inp) => expect(inp).toBeDisabled())
  })

  test('Enter on a non-last blank does NOT trigger Check', () => {
    render(<FillInCard card={card} onRate={vi.fn()} />)
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'None' } })
    fireEvent.keyDown(inputs[0], { key: 'Enter' })
    expect(screen.getByRole('button', { name: /check/i })).toBeInTheDocument()
    inputs.forEach((inp) => expect(inp).not.toBeDisabled())
  })
})
