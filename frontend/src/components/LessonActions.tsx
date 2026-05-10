/**
 * LessonActions — bottom row, two buttons.
 *
 * No "next lesson" auto-advance: spheres are independent, not a sequence.
 *
 * T4.5.2: empty-cards state shows a visible inline note next to the
 * disabled button instead of a `title=` tooltip — keyboard- and touch-
 * users can read it too.
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
    <div className="mt-12 pt-8 border-t border-[color:var(--color-border)] flex flex-wrap items-center gap-x-3 gap-y-2">
      <Button
        variant="primary"
        // TODO(phase-5): swap to <LinkButton to="/review"> when route exists.
        // eslint-disable-next-line no-restricted-syntax
        onClick={() => (window.location.href = `/review?sphere=${sphereId}`)}
        disabled={!hasCards}
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
      {!hasCards && (
        <p className="basis-full text-xs text-[color:var(--color-fg-muted)]">
          No cards in this sphere yet.
        </p>
      )}
    </div>
  )
}
