/**
 * CardShell — the consistent chrome around every card-type renderer.
 *
 * Same shape regardless of card type so the user's gaze settles in
 * the same place on every advance: position eyebrow + sphere_id mono
 * caption at top, topic title below, difficulty dot meter to the
 * right, content slot in the body.
 *
 * SessionPage composes <CardShell card position><CardRenderer/></CardShell>
 * and applies key={card.id} on the inner renderer for the ADR-016
 * per-card React isolation rule.
 */
import type { ReactNode } from 'react'

interface CardShellProps {
  card: {
    id: string
    topic: string
    difficulty: number
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
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p
            className={[
              'font-mono text-xs uppercase tracking-wider',
              'text-[color:var(--color-fg-subtle)]',
            ].join(' ')}
          >
            <span>Card {position.index} of {position.total}</span>
            {card.sphere_id ? (
              <>
                <span aria-hidden="true" className="px-2">·</span>
                <span>{card.sphere_id}</span>
              </>
            ) : null}
          </p>
          <h2
            className={[
              'mt-1 text-xl font-semibold',
              'text-[color:var(--color-fg)] tracking-tight',
            ].join(' ')}
          >
            {card.topic}
          </h2>
        </div>
        <DifficultyMeter level={card.difficulty} />
      </header>
      <div>{children}</div>
    </article>
  )
}

function DifficultyMeter({ level }: { level: number }) {
  const total = 5
  return (
    <div
      role="img"
      aria-label={`Difficulty ${level} of ${total}`}
      className="flex shrink-0 items-center gap-1 pt-1"
    >
      {Array.from({ length: total }, (_, i) => {
        const filled = i < level
        return (
          <span
            key={i}
            data-testid="difficulty-dot"
            data-filled={filled}
            className={[
              'inline-block h-1.5 w-1.5 rounded-full',
              filled
                ? 'bg-[color:var(--color-fg-muted)]'
                : 'bg-[color:var(--color-border)]',
            ].join(' ')}
          />
        )
      })}
    </div>
  )
}
