/**
 * FillInCard — code snippet with N `___` placeholders. Each blank
 * renders as an inline <input> in the same prose flow so a snippet
 * like "tags=___" reads as one continuous expression rather than
 * a sentence above and a separate input below.
 *
 * Match policy (matchBlank): exact case-sensitive trimmed → case-
 * insensitive trimmed → wrong. No fuzzy matching, no Levenshtein —
 * Python interview answers are precise.
 *
 * Pre-submit DOM contract: snippet text visible (it's the question);
 * accepted_answers + explanation_md absent. After Check, each blank
 * gets a green/red border, wrong blanks reveal "Correct: a or b"
 * remediation, the explanation_md surfaces, and RatingBar takes over.
 *
 * Empty input is graded wrong, NOT blocked — letting the user submit
 * with skipped blanks is the cheapest path to "show me the answer."
 */
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { FillInCard as FillInCardT } from '../lib/card-types'
import { matchBlank } from '../lib/match-blank'
import type { Rating } from '../lib/session-queue'
import { Button } from './Button'
import { RatingBar } from './RatingBar'

interface Props {
  card: FillInCardT
  onRate: (rating: Rating) => void
}

export function FillInCard({ card, onRate }: Props) {
  const blanks = card.accepted_answers
  const [values, setValues] = useState<string[]>(() => blanks.map(() => ''))
  const [submitted, setSubmitted] = useState(false)
  const segments = card.code_snippet_with_blanks.split('___')
  const submit = () => setSubmitted(true)
  // P6.5/P2-2: focus first blank on mount so the keyboard user is
  // typing into the snippet immediately, no tab hop required.
  const firstBlankRef = useRef<HTMLInputElement>(null)
  useEffect(() => { firstBlankRef.current?.focus() }, [])

  return (
    <div className="flex flex-col gap-5">
      <pre
        className={[
          'whitespace-pre-wrap rounded p-4 text-sm font-mono leading-relaxed',
          'bg-[color:var(--color-bg)] text-[color:var(--color-fg)]',
          'border border-[color:var(--color-border)]',
        ].join(' ')}
      >
        {segments.map((seg, i) => {
          const isBlank = i < segments.length - 1
          const correct =
            submitted && isBlank && matchBlank(values[i] ?? '', blanks[i])
          return (
            <span key={i}>
              {seg}
              {isBlank ? (
                <input
                  ref={i === 0 ? firstBlankRef : undefined}
                  type="text"
                  data-blank-index={i}
                  data-correct={submitted ? String(correct) : undefined}
                  value={values[i] ?? ''}
                  onChange={(e) => {
                    const next = [...values]
                    next[i] = e.target.value
                    setValues(next)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && i === blanks.length - 1) {
                      e.preventDefault()
                      submit()
                    }
                  }}
                  disabled={submitted}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  className={[
                    'inline-block min-w-12 mx-1 px-1 font-mono text-sm align-baseline',
                    'bg-transparent border-b-2 outline-none',
                    !submitted
                      ? 'border-[color:var(--color-border-strong)] focus:border-[color:var(--color-accent)]'
                      : correct
                        ? 'border-[color:var(--color-good)] text-[color:var(--color-good)]'
                        : 'border-[color:var(--color-danger)] text-[color:var(--color-danger)]',
                  ].join(' ')}
                />
              ) : null}
            </span>
          )
        })}
      </pre>

      {submitted ? (
        <div className="animate-fade-up flex flex-col gap-4">
          {blanks.some((acc, i) => !matchBlank(values[i] ?? '', acc)) ? (
            <ul className="flex flex-col gap-1 text-xs">
              {blanks.map((acc, i) =>
                matchBlank(values[i] ?? '', acc) ? null : (
                  <li
                    key={i}
                    data-testid="blank-remediation"
                    className="text-[color:var(--color-fg-muted)] font-mono"
                  >
                    Blank {i + 1} (correct: {acc.join(' or ')})
                  </li>
                ),
              )}
            </ul>
          ) : null}
          {card.explanation_md ? (
            <div
              className={[
                'prose text-sm border-t pt-4',
                'border-[color:var(--color-border)]',
                'text-[color:var(--color-fg-muted)]',
              ].join(' ')}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {card.explanation_md}
              </ReactMarkdown>
            </div>
          ) : null}
          <RatingBar onRate={onRate} />
        </div>
      ) : (
        <div className="flex justify-end">
          <Button variant="primary" onClick={submit}>Check</Button>
        </div>
      )}
    </div>
  )
}
