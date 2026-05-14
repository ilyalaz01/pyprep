/**
 * CardShell — the consistent chrome around every card-type renderer.
 *
 * Same shape regardless of card type so the user's gaze settles in
 * the same place on every advance: progress bar + compact "N/M" +
 * sphere_id mono caption on one row at top, topic title below. Right
 * side of the header is intentionally empty — the question itself is
 * the visual center, and decoration there competes with content.
 *
 * SessionPage composes <CardShell card position><CardRenderer/></CardShell>
 * and applies key={card.id} on the inner renderer for the ADR-016
 * per-card React isolation rule.
 *
 * T5.10.5: the content-authored difficulty meter that previously sat
 * in the header was dropped — visually identical to a horizontal
 * progress-dots widget, it read as a session-progress indicator next
 * to the textual "Card N of M" counter. Difficulty as a pre-engagement
 * cue is also metacognitive prime-poisoning per ADR-015 (the user's
 * post-attempt self-rating is the signal that matters). The schema
 * field is retained for content tooling + Phase 7 stats. The Tier 1.6
 * session ProgressBar that lives in the header now is *unambiguous*
 * session progress — what the textual counter was already saying.
 */
import type { ReactNode } from 'react'

import { ProgressBar } from './ProgressBar'

interface CardShellProps {
  card: {
    id: string
    topic: string
    sphere_id?: string
  }
  position: { index: number; total: number }
  children: ReactNode
}

export function CardShell({ card, position, children }: CardShellProps) {
  return (
    <article
      className={[
        'mx-auto w-full max-w-3xl rounded-lg',
        'bg-[color:var(--color-bg-elevated)]',
        'border border-[color:var(--color-border)]',
        'p-6 sm:p-8',
      ].join(' ')}
    >
      <header className="mb-5">
        <div className="mb-2 flex items-center gap-3">
          <ProgressBar
            value={position.index / position.total}
            ariaLabel={`Card ${position.index} of ${position.total}`}
            className="flex-1"
          />
          <p
            className={[
              'font-mono text-xs uppercase tracking-wider shrink-0',
              'text-[color:var(--color-fg-subtle)]',
            ].join(' ')}
          >
            <span>{position.index}/{position.total}</span>
            {card.sphere_id ? (
              <>
                <span aria-hidden="true" className="px-2">·</span>
                <span>{card.sphere_id}</span>
              </>
            ) : null}
          </p>
        </div>
        <h2
          className={[
            'text-xl font-semibold',
            'text-[color:var(--color-fg)] tracking-tight',
          ].join(' ')}
        >
          {card.topic}
        </h2>
      </header>
      <div>{children}</div>
    </article>
  )
}
