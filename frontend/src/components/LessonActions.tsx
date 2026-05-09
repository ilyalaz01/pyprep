/**
 * LessonActions — bottom row, two buttons.
 *
 * No "next lesson" auto-advance: spheres are independent, not a sequence.
 */
import { Button } from './Button'
import { LinkButton } from './LinkButton'

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
      <LinkButton
        variant="ghost"
        to="/modules/$moduleId"
        params={{ moduleId: String(moduleId) }}
      >
        Back to module
      </LinkButton>
    </div>
  )
}
