/**
 * CodeTaskCard — fifth and largest card type. Composes the
 * CodeMirror 6 editor (CodeMirrorEditor wrapper, dark-permanent
 * theme, no autocomplete) with prompt + Run-tests + Results panel.
 *
 * Phase 5 ships against the Pyodide stub (frontend/src/pyodide/
 * runner.ts). The Results panel surfaces stub.stderr verbatim so
 * the user gets a clean "Phase 6 will run this" guidance instead
 * of a fake green check. Phase 6 swaps the runner body, NOT the
 * call shape — this card needs no edits when Pyodide lands.
 *
 * Per-card keymap: Cmd/Ctrl-Enter inside the editor triggers Run
 * (CodeMirror keymap extension, NOT global). T5.12 keymap stays
 * clean (Space / 1-4 / Esc only).
 *
 * Pre-Run masking: solution_code + tests are in props but never in
 * the DOM. expectAnswerHidden pins this; structural pin checks no
 * [data-testid="hidden-tests"] / "solution" elements anywhere.
 *
 * RatingBar appears AFTER the first Run click (engagement signal)
 * and stays — even if the user re-runs. Per ADR-015 the user self-
 * rates, which on code-task is extra valuable: "passed first try"
 * vs "stuck for 10 minutes" vs "peeked at the answer" all map to
 * different ratings the runner outcome cannot infer.
 */
import { useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { CodeTaskCard as CodeTaskCardT } from '../lib/card-types'
import type { Rating } from '../lib/session-queue'
import { bootPyodideWorker } from '../pyodide/loader'
import { runCodeTask, type RunResult } from '../pyodide/runner'
import { Button } from './Button'
import { CodeMirrorEditor } from './CodeMirrorEditor'
import { RatingBar } from './RatingBar'

interface Props {
  card: CodeTaskCardT
  onRate: (rating: Rating) => void
}

export function CodeTaskCard({ card, onRate }: Props) {
  const [code, setCode] = useState(card.starter_code)
  const [result, setResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const isEmpty = code.trim().length === 0

  // T6.3 lazy boot trigger (FR-SBX-1): the first code-task card the
  // user sees in a session kicks off Pyodide load in the background.
  // Singleton per ADR-018 — subsequent mounts are no-ops. The Run
  // path still uses the runner stub in T6.3; T6.5 swaps it for the
  // worker-driven path.
  useEffect(() => { void bootPyodideWorker() }, [])

  const run = useCallback(async () => {
    if (isEmpty || running) return
    setRunning(true)
    try {
      const r = await runCodeTask(code, card.tests, card.allowlist ?? [])
      setResult(r)
    } finally {
      setRunning(false)
    }
  }, [code, card.tests, card.allowlist, isEmpty, running])

  return (
    <div className="flex flex-col gap-5">
      <div className="prose text-[color:var(--color-fg)] text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{card.prompt_md}</ReactMarkdown>
      </div>

      <div
        className={[
          'rounded overflow-hidden',
          'border border-[color:var(--color-border)]',
        ].join(' ')}
      >
        <CodeMirrorEditor
          initialDoc={card.starter_code}
          onChange={setCode}
          onRun={run}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {isEmpty ? (
          <span
            id="run-empty-note"
            className="text-xs text-[color:var(--color-fg-subtle)]"
          >
            Editor is empty
          </span>
        ) : null}
        <Button
          variant="primary"
          onClick={run}
          disabled={isEmpty || running}
          aria-describedby={isEmpty ? 'run-empty-note' : undefined}
        >
          {running ? 'Running…' : 'Run tests'}
        </Button>
      </div>

      {result ? (
        <div
          data-testid="run-results"
          className={[
            'animate-fade-up flex flex-col gap-2 rounded p-4',
            'border border-[color:var(--color-border)]',
            'bg-[color:var(--color-bg)]',
            'text-sm font-mono',
          ].join(' ')}
        >
          {result.stderr ? (
            <p className="text-[color:var(--color-fg-muted)] whitespace-pre-wrap">
              {result.stderr}
            </p>
          ) : null}
          {result.stdout ? (
            <pre className="text-[color:var(--color-fg)] whitespace-pre-wrap">
              {result.stdout}
            </pre>
          ) : null}
          {result.tests.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {result.tests.map((t) => (
                <li
                  key={t.name}
                  className={
                    t.passed
                      ? 'text-[color:var(--color-good)]'
                      : 'text-[color:var(--color-danger)]'
                  }
                >
                  {t.passed ? '✓' : '✗'} {t.name}
                  {t.message ? `: ${t.message}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <div className="animate-fade-up">
          <RatingBar onRate={onRate} />
        </div>
      ) : null}
    </div>
  )
}
