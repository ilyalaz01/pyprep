/**
 * FlipCard — the simplest card type. Question on the front; user
 * clicks Reveal (or hits Space, wired by SessionPage in T5.12); the
 * answer + optional answer_explanation_md cross-fades in below the
 * question; RatingBar takes over.
 *
 * The reveal is a crossfade + 2px upward shift, NOT a 3D rotateY
 * flip — see DESIGN.md "no Duolingo affordance" note. Implemented
 * via a key-based remount so the entering element starts hidden and
 * transitions to visible on its first paint.
 *
 * Pre-reveal masking is enforced two ways: TypeScript via
 * FlipCardFront in card-types.ts (consumed by future code that needs
 * it), and runtime via expectAnswerHidden in renderer tests.
 */
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { FlipCard as FlipCardT } from '../lib/card-types'
import type { Rating } from '../lib/session-queue'
import { Button } from './Button'
import { RatingBar } from './RatingBar'

interface FlipCardProps {
  card: FlipCardT
  // P7-fix: flip cards have no objective outcome. Pass-through type
  // matches the rest of the family but FlipCard never supplies an
  // outcome — accuracy aggregation skips undefined values.
  onRate: (rating: Rating, outcome?: boolean) => void
}

export function FlipCard({ card, onRate }: FlipCardProps) {
  const [revealed, setRevealed] = useState(false)
  // P6.5/P2-2: keyboard continuity. Each card mounts fresh via
  // CardRenderer's key={card.id} (ADR-016); focus the Reveal button so
  // a user pressing Space lands on the right control without an
  // intermediate tab traversal.
  const revealRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { revealRef.current?.focus() }, [])
  return (
    <div className="flex flex-col gap-6">
      <p
        className={[
          'text-lg leading-relaxed',
          revealed
            ? 'text-[color:var(--color-fg-muted)]'
            : 'text-[color:var(--color-fg)]',
          'transition-colors duration-120 ease-(--ease-out-quart)',
        ].join(' ')}
      >
        {card.question}
      </p>

      {!revealed ? (
        <div className="flex justify-center">
          <Button ref={revealRef} variant="primary" onClick={() => setRevealed(true)}>
            Reveal answer
          </Button>
        </div>
      ) : (
        <div className="animate-fade-up flex flex-col gap-5">
          <p
            className={[
              'text-base leading-relaxed',
              'text-[color:var(--color-fg)]',
            ].join(' ')}
          >
            {card.answer}
          </p>
          {card.answer_explanation_md ? (
            <div
              className={[
                'prose text-sm',
                'border-t border-[color:var(--color-border)] pt-4',
                'text-[color:var(--color-fg-muted)]',
              ].join(' ')}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {card.answer_explanation_md}
              </ReactMarkdown>
            </div>
          ) : null}
          <RatingBar onRate={onRate} />
        </div>
      )}
    </div>
  )
}
