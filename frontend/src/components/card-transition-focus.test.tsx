/**
 * P6.5/P2-2 — card-transition focus management.
 *
 * Every card-type renderer must focus its primary actionable element
 * on mount. The session loop remounts each card via `key={card.id}`
 * (ADR-016); on every transition, focus must land on the next card's
 * primary control so keyboard-only users don't get dropped to body.
 *
 * Primary control per type:
 *   flip            → "Reveal answer" button
 *   multiple_choice → first option button
 *   code_trap       → first option button
 *   fill_in         → first blank <input>
 *   code_task       → CodeMirror editor (test mock: the textarea)
 */
import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { parseCard } from '../lib/card-types'
import {
  codeTaskDetailedRaw,
  codeTrapRaw,
  fillInRaw,
  flipRaw,
  mcRaw,
} from '../test/card-fixtures'
import { CardRenderer } from './CardRenderer'

// CodeMirrorEditor + pyodide are async/heavy in jsdom; same mock shape
// as CodeTaskCard.test.tsx. The autoFocus prop pass-through is the
// contract this test pins (real editor calls view.focus()).
vi.mock('../pyodide/loader', () => ({
  bootPyodideWorker: vi.fn(() => Promise.resolve()),
  getColdStartMetrics: vi.fn(),
  getPyodideWorker: vi.fn(() => null),
  invalidateWorker: vi.fn(),
}))
vi.mock('../pyodide/runner', () => ({
  runCodeTask: vi.fn(() => Promise.resolve({
    ok: false, tests: [], stdout: '',
    stderr: '', timed_out: false, total_duration_ms: 0,
  })),
}))
vi.mock('./CodeMirrorEditor', () => ({
  CodeMirrorEditor: ({ initialDoc, onChange, autoFocus }: {
    initialDoc: string
    onChange: (v: string) => void
    onRun: () => void
    autoFocus?: boolean
  }) => (
    <textarea
      role="textbox"
      data-testid="codemirror-mock"
      defaultValue={initialDoc}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

describe('Card-transition focus (P2-2)', () => {
  test('FlipCard focuses Reveal answer on mount', () => {
    render(<CardRenderer card={parseCard(flipRaw)} onRate={vi.fn()} />)
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /reveal answer/i }),
    )
  })

  test('MultipleChoiceCard focuses first option on mount', () => {
    render(<CardRenderer card={parseCard(mcRaw)} onRate={vi.fn()} />)
    const options = screen.getAllByRole('button')
    const optionButtons = options.filter(
      (b) => b.getAttribute('data-mc-option') !== null,
    )
    expect(optionButtons.length).toBeGreaterThan(0)
    expect(document.activeElement).toBe(optionButtons[0])
  })

  test('CodeTrapCard focuses first option on mount', () => {
    render(<CardRenderer card={parseCard(codeTrapRaw)} onRate={vi.fn()} />)
    const optionButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('data-mc-option') !== null,
    )
    expect(optionButtons.length).toBeGreaterThan(0)
    expect(document.activeElement).toBe(optionButtons[0])
  })

  test('FillInCard focuses first blank on mount', () => {
    const { container } = render(
      <CardRenderer card={parseCard(fillInRaw)} onRate={vi.fn()} />,
    )
    const firstBlank = container.querySelector('input[data-blank-index="0"]')
    expect(firstBlank).not.toBeNull()
    expect(document.activeElement).toBe(firstBlank)
  })

  test('CodeTaskCard focuses the editor on mount', () => {
    render(<CardRenderer card={parseCard(codeTaskDetailedRaw)} onRate={vi.fn()} />)
    expect(document.activeElement).toBe(screen.getByTestId('codemirror-mock'))
  })

  test('focus follows transition between two flip cards (key={card.id})', () => {
    const cardA = parseCard({ ...flipRaw, id: 'm1-s0-c1' })
    const cardB = parseCard({ ...flipRaw, id: 'm1-s0-c99', question: 'Different question.' })
    const { rerender } = render(<CardRenderer card={cardA} onRate={vi.fn()} />)
    const revealA = screen.getByRole('button', { name: /reveal answer/i })
    expect(document.activeElement).toBe(revealA)

    rerender(<CardRenderer card={cardB} onRate={vi.fn()} />)
    const revealB = screen.getByRole('button', { name: /reveal answer/i })
    // key={card.id} forces fresh mount; the new Reveal button is a
    // different DOM node, and focus must follow.
    expect(revealB).not.toBe(revealA)
    expect(document.activeElement).toBe(revealB)
  })

  test('focus follows transition across card types (flip → MC)', () => {
    const { rerender } = render(<CardRenderer card={parseCard(flipRaw)} onRate={vi.fn()} />)
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /reveal answer/i }),
    )
    rerender(<CardRenderer card={parseCard(mcRaw)} onRate={vi.fn()} />)
    const firstOption = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('data-mc-option') !== null,
    )[0]
    expect(document.activeElement).toBe(firstOption)
  })
})
