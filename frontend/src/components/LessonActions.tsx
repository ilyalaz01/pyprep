/**
 * LessonActions — bottom row, two buttons.
 *
 * No "next lesson" auto-advance: spheres are independent, not a sequence.
 *
 * T4.5.2: empty-cards state shows a visible inline note next to the
 * disabled affordance instead of a `title=` tooltip — keyboard- and
 * touch-users can read it too. T5.10 wires the session route, so the
 * "Start review session" affordance is now a LinkButton when cards
 * are present and a disabled <Button> when not (LinkButton has no
 * disabled state — Link is either navigable or it isn't).
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
      {hasCards ? (
        <LinkButton
          variant="primary"
          to="/modules/$moduleId/sphere/$sphereId/session"
          params={{ moduleId: String(moduleId), sphereId }}
        >
          Start review session
        </LinkButton>
      ) : (
        <Button
          variant="primary"
          disabled
          aria-describedby="lesson-actions-empty-note"
        >
          Start review session
        </Button>
      )}
      <LinkButton
        variant="ghost"
        to="/modules/$moduleId"
        params={{ moduleId: String(moduleId) }}
      >
        Back to module
      </LinkButton>
      {!hasCards && (
        <p
          id="lesson-actions-empty-note"
          className="basis-full text-xs text-[color:var(--color-fg-muted)]"
        >
          No cards in this sphere yet.
        </p>
      )}
    </div>
  )
}
