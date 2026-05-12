/**
 * MultipleChoiceCard — first card type with hidden-answer state.
 *
 * Pre-submit: question + options as buttons. The correct_index and
 * option_explanations live in props but never reach the DOM until
 * the user clicks an option. Tested explicitly: per-option markup
 * is byte-identical regardless of which option is correct (no
 * data-correct, no aria-pressed leak).
 *
 * Post-submit: every option reveals its correctness marker + the
 * matching option_explanations[i] text. Per ADR-015 the user still
 * self-rates with the RatingBar — correctness is shown, intent is
 * the user's to declare.
 */
import { useEffect, useRef, useState } from 'react'

import type { MultipleChoiceCard as MCCardT } from '../lib/card-types'
import type { Rating } from '../lib/session-queue'
import { RatingBar } from './RatingBar'

interface Props {
  card: MCCardT
  onRate: (rating: Rating) => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

export function MultipleChoiceCard({ card, onRate }: Props) {
  const [chosen, setChosen] = useState<number | null>(null)
  const submitted = chosen !== null
  // P6.5/P2-2: focus first option on mount so keyboard users can
  // arrow/tab through choices without an intermediate hop.
  const firstOptionRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { firstOptionRef.current?.focus() }, [])
  return (
    <div className="flex flex-col gap-5">
      <p className="text-lg leading-relaxed text-[color:var(--color-fg)]">
        {card.question}
      </p>
      <ul className="flex flex-col gap-2" role="list">
        {card.options.map((opt, i) => {
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
                ref={i === 0 ? firstOptionRef : undefined}
                type="button"
                data-mc-option=""
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
                  {LETTERS[i]}
                </span>
                <span className="flex-1 text-sm text-[color:var(--color-fg)]">
                  {opt}
                </span>
              </button>
              {submitted ? (
                <p
                  className={[
                    'animate-fade-up mt-1 ml-9 text-xs leading-relaxed',
                    'text-[color:var(--color-fg-muted)]',
                  ].join(' ')}
                >
                  {card.option_explanations[i] ?? ''}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
      {submitted ? (
        <div className="animate-fade-up">
          <RatingBar onRate={onRate} />
        </div>
      ) : null}
    </div>
  )
}
