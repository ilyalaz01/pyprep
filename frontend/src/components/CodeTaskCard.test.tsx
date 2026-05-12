import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  parseCard, type CodeTaskCard as CodeTaskCardT,
} from '../lib/card-types'
import { expectAnswerHidden } from '../test/expect-answer-hidden'
import { codeTaskDetailedRaw } from '../test/card-fixtures'
import { CodeTaskCard } from './CodeTaskCard'
import * as runner from '../pyodide/runner'
import * as loader from '../pyodide/loader'

vi.mock('../pyodide/loader', () => ({
  bootPyodideWorker: vi.fn(() => Promise.resolve()),
  getColdStartMetrics: vi.fn(),
  getPyodideWorker: vi.fn(() => null),
  invalidateWorker: vi.fn(),
}))

// T6.5 wired runner.ts to a real worker. UI tests stub the runner
// so Results panel + RatingBar can be exercised without a worker.
vi.mock('../pyodide/runner', () => ({
  runCodeTask: vi.fn(() => Promise.resolve({
    ok: false, tests: [], stdout: '',
    stderr: 'Pyodide not yet wired — stub runner result',
    timed_out: false, total_duration_ms: 0,
  })),
}))

vi.mock('./CodeMirrorEditor', () => ({
  CodeMirrorEditor: ({ initialDoc, onChange, onRun }: {
    initialDoc: string
    onChange: (v: string) => void
    onRun: () => void
  }) => (
    <textarea
      role="textbox"
      data-testid="codemirror-mock"
      defaultValue={initialDoc}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault()
          onRun()
        }
      }}
    />
  ),
}))

const card = parseCard(codeTaskDetailedRaw) as CodeTaskCardT

describe('CodeTaskCard — pre-run masking', () => {
  test('prompt_md, starter_code, and Run tests button are visible', () => {
    const { container } = render(<CodeTaskCard card={card} onRate={vi.fn()} />)
    // prompt_md is markdown — backticks render as <code>, splitting
    // "Implement `make_counter(...)`..." across nodes. Match by full
    // text content rather than getByText (which is single-node).
    expect(container.textContent).toMatch(/Implement.*make_counter.*incremen/)
    expect(screen.getByTestId('codemirror-mock')).toHaveValue(card.starter_code)
    expect(screen.getByRole('button', { name: /run tests/i })).toBeInTheDocument()
  })

  test('expectAnswerHidden — solution_code + tests NOT in DOM', () => {
    const { container } = render(<CodeTaskCard card={card} onRate={vi.fn()} />)
    expectAnswerHidden(card, container)
  })

  test('structural pin: no [data-testid="hidden-tests"] or "solution" anywhere', () => {
    const { container } = render(<CodeTaskCard card={card} onRate={vi.fn()} />)
    expect(container.querySelector('[data-testid="hidden-tests"]')).toBeNull()
    expect(container.querySelector('[data-testid="solution"]')).toBeNull()
  })

  test('no Results panel and no RatingBar before Run', () => {
    render(<CodeTaskCard card={card} onRate={vi.fn()} />)
    expect(screen.queryByTestId('run-results')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /again/i })).not.toBeInTheDocument()
  })
})

describe('CodeTaskCard — Run tests', () => {
  test('clicking Run invokes runCodeTask with editor value + hidden_tests + allowlist', async () => {
    const spy = vi.spyOn(runner, 'runCodeTask')
    render(<CodeTaskCard card={card} onRate={vi.fn()} />)
    fireEvent.change(screen.getByTestId('codemirror-mock'), {
      target: { value: 'def make_counter(start=0):\n    return lambda: 1\n' },
    })
    await userEvent.click(screen.getByRole('button', { name: /run tests/i }))
    await waitFor(() => expect(spy).toHaveBeenCalledOnce())
    const args = spy.mock.calls[0]
    expect(args[0]).toContain('return lambda: 1')
    expect(args[1]).toBe(card.tests)
    expect(args[2]).toEqual(card.allowlist)
  })

  test('Results panel shows runResult.stderr after Run', async () => {
    render(<CodeTaskCard card={card} onRate={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /run tests/i }))
    await waitFor(() => expect(screen.getByTestId('run-results')).toBeInTheDocument())
    expect(screen.getByText(/Pyodide not yet wired/i)).toBeInTheDocument()
  })

  test('RatingBar appears after first Run (engagement signal — even on stub)', async () => {
    render(<CodeTaskCard card={card} onRate={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /run tests/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /again/i })).toBeInTheDocument(),
    )
  })

  test('rating click forwards to onRate (ADR-015 self-rate, not auto)', async () => {
    const onRate = vi.fn()
    render(<CodeTaskCard card={card} onRate={onRate} />)
    await userEvent.click(screen.getByRole('button', { name: /run tests/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /good/i })).toBeInTheDocument(),
    )
    expect(onRate).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /good/i }))
    // P7-fix: outcome=false because the stub runner returns ok:false.
    // The contract is that outcome = result.ok regardless of rating.
    expect(onRate).toHaveBeenCalledExactlyOnceWith(3, false)
  })

  test('Cmd-Enter in editor triggers Run (per-card keymap, not global)', async () => {
    const spy = vi.spyOn(runner, 'runCodeTask')
    spy.mockClear()
    render(<CodeTaskCard card={card} onRate={vi.fn()} />)
    fireEvent.keyDown(screen.getByTestId('codemirror-mock'), {
      key: 'Enter', metaKey: true,
    })
    await waitFor(() => expect(spy).toHaveBeenCalledOnce())
  })
})

describe('CodeTaskCard — empty editor', () => {
  test('Run tests is disabled and "Editor is empty" note is visible', () => {
    render(<CodeTaskCard card={card} onRate={vi.fn()} />)
    fireEvent.change(screen.getByTestId('codemirror-mock'), {
      target: { value: '   ' },
    })
    const btn = screen.getByRole('button', { name: /run tests/i })
    expect(btn).toBeDisabled()
    expect(screen.getByText(/editor is empty/i)).toBeInTheDocument()
  })
})

test('T6.3 lazy Pyodide boot: mount calls bootPyodideWorker (FR-SBX-1)', () => {
  vi.mocked(loader.bootPyodideWorker).mockClear()
  render(<CodeTaskCard card={card} onRate={vi.fn()} />)
  expect(loader.bootPyodideWorker).toHaveBeenCalledTimes(1)
})

describe('CodeTaskCard — ADR-016 per-card React isolation', () => {
  test('swapping card.id resets the editor to the new starter_code', () => {
    const cardB = parseCard({
      ...codeTaskDetailedRaw,
      id: 'm1-s0-c99',
      starter_code: 'def make_counter(start=0):\n    raise NotImplementedError\n',
    }) as CodeTaskCardT
    function Wrapper({ c }: { c: CodeTaskCardT }) {
      return <CodeTaskCard key={c.id} card={c} onRate={vi.fn()} />
    }
    const { rerender } = render(<Wrapper c={card} />)
    fireEvent.change(screen.getByTestId('codemirror-mock'), {
      target: { value: 'TYPED CONTENT — should be discarded' },
    })
    rerender(<Wrapper c={cardB} />)
    // Fresh mount via key={card.id} → editor seeded with cardB starter,
    // typed content from cardA does NOT survive.
    expect(screen.getByTestId('codemirror-mock')).toHaveValue(cardB.starter_code)
  })
})
