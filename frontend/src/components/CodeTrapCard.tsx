/**
 * CodeTrapCard — a Python snippet that contains a subtle bug, plus
 * a multiple-choice "what does this print?" question. Same submit/
 * reveal/self-rate pattern as MultipleChoiceCard, but with one
 * shared explanation_md instead of per-option explanations.
 *
 * Pre-submit DOM contract (pinned by tests):
 *   - code_snippet IS visible (it is the question)
 *   - question text + option buttons visible
 *   - explanation_md is NOT in the DOM
 *   - correct_index is NOT encoded in any data-attr / class
 *
 * Post-submit reveals correctness markers + the explanation_md.
 * Per ADR-015, even a correct submission requires self-rating.
 *
 * Option-list shape duplicates MultipleChoiceCard's pattern by
 * design — two consumers don't justify a sub-primitive yet (per
 * the "three similar lines is better than a premature abstraction"
 * line). Extract <MCQuestion> only if a third consumer appears.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { CodeTrapCard as CodeTrapCardT } from '../lib/card-types'
import { seededIndices } from '../lib/seeded-shuffle'
import type { Rating } from '../lib/session-queue'
import { RatingBar } from './RatingBar'
import { ShikiCodeBlock } from './ShikiCodeBlock'

interface Props {
  card: CodeTrapCardT
  // P7-fix: outcome = chosen-index === correct_index.
  onRate: (rating: Rating, outcome?: boolean) => void
  // P7.T7.10 / N034: same shape as MultipleChoiceCard — shuffle
  // options on AGAIN re-presentation.
  attemptIndex?: number
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

export function CodeTrapCard({ card, onRate, attemptIndex = 0 }: Props) {
  const [chosen, setChosen] = useState<number | null>(null)
  const submitted = chosen !== null
  // P6.5/P2-2: focus first option on mount (see MultipleChoiceCard).
  const firstOptionRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { firstOptionRef.current?.focus() }, [])
  // P7.T7.10 / N034: shuffle on attemptIndex > 0; identity otherwise.
  const displayOrder = useMemo(
    () => attemptIndex > 0
      ? seededIndices(card.options.length, `${card.id}#${attemptIndex}`)
      : card.options.map((_, i) => i),
    [card.id, card.options, attemptIndex],
  )
  return (
    <div className="flex flex-col gap-5">
      <ShikiCodeBlock code={card.code_snippet} lang="python" />
      <p className="text-base leading-relaxed text-[color:var(--color-fg)]">
        {card.question}
      </p>
      <ul className="flex flex-col gap-2" role="list">
        {displayOrder.map((origIndex, pos) => {
          const opt = card.options[origIndex]!
          const i = origIndex
          const isCorrect = submitted && i === card.correct_index
          const isWrongChoice =
            submitted && i === chosen && i !== card.correct_index
          const stateClass = !submitted
            ? 'border-[color:var(--color-border)] hover:border-[color:var(--color-border-strong)]'
            : isCorrect
              ? 'border-[color:var(--color-good)] bg-[color:var(--color-good)]/8'
              : isWrongChoice
                ? 'border-[color:var(--color-danger)] bg-[color:var(--color-danger)]/8'
                : 'border-[color:var(--color-border)] opacity-70'
          return (
            <li key={i}>
              <button
                ref={pos === 0 ? firstOptionRef : undefined}
                type="button"
                data-mc-option=""
                data-original-index={i}
                data-chosen={submitted ? String(i === chosen) : undefined}
                data-correct={submitted ? String(isCorrect) : undefined}
                disabled={submitted}
                onClick={() => setChosen(i)}
                className={[
                  'w-full text-left rounded border px-4 py-3',
                  'flex items-start gap-3',
                  'transition-[color,background-color,border-color] ' +
                    'duration-120 ease-(--ease-out-quart)',
                  'focus-visible:outline focus-visible:outline-2 ' +
                    'focus-visible:outline-offset-2 ' +
                    'focus-visible:outline-[color:var(--color-border-strong)]',
                  'disabled:cursor-default',
                  stateClass,
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'font-mono text-xs pt-1',
                    'text-[color:var(--color-fg-subtle)]',
                  ].join(' ')}
                >
                  {LETTERS[pos]}
                </span>
                <span
                  className="flex-1 font-mono text-sm whitespace-pre-wrap text-[color:var(--color-fg)]"
                >
                  {opt}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {submitted ? (
        <div className="animate-fade-up flex flex-col gap-4">
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
          <RatingBar onRate={(r) => onRate(r, chosen === card.correct_index)} />
        </div>
      ) : null}
    </div>
  )
}
