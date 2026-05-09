/**
 * LessonActions — bottom row, two buttons.
 *
 * No "next lesson" auto-advance: spheres are independent, not a sequence.
 */
import { Link } from '@tanstack/react-router'

import { Button } from './Button'

interface LessonActionsProps {
  moduleId: number
  sphereId: string
  cardCount: number
}

export function LessonActions({ moduleId, sphereId, cardCount }: LessonActionsProps) {
  const hasCards = cardCount > 0
  return (
    <div className="mt-12 pt-8 border-t border-[color:var(--color-border)] flex items-center gap-3">
      <Button
        variant="primary"
        onClick={() => (window.location.href = `/review?sphere=${sphereId}`)}
        disabled={!hasCards}
        title={hasCards ? undefined : 'No cards in this sphere yet.'}
      >
        Start review session
      </Button>
      <Link
        to="/modules/$moduleId"
        params={{ moduleId: String(moduleId) }}
        className={[
          'inline-flex items-center justify-center gap-2 h-9 px-4 rounded text-sm font-medium',
          'bg-transparent text-[color:var(--color-fg-muted)]',
          'hover:text-[color:var(--color-fg)]',
          'transition-colors duration-120',
        ].join(' ')}
      >
        Back to module
      </Link>
    </div>
  )
}
