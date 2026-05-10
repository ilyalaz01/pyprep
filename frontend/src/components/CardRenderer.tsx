/**
 * CardRenderer — switch on Card.type, mount the matching renderer.
 *
 * key={card.id} sits on the type-specific component (NOT on
 * CardRenderer itself) per ADR-016. The reason: switching between
 * two FlipCards or two MultipleChoiceCards in adjacent positions
 * would NOT remount if the key were on CardRenderer (same parent
 * component type). Keying on the leaf forces a fresh mount per
 * card.id even when consecutive cards share a type.
 *
 * Exhaustiveness: the switch returns from every branch; the
 * trailing assertNever pins compile-time exhaustiveness so
 * adding a sixth card type to the discriminated union forces a
 * tsc error here, not a silent fall-through.
 */
import type { Card } from '../lib/card-types'
import type { Rating } from '../lib/session-queue'
import { CodeTaskCard } from './CodeTaskCard'
import { CodeTrapCard } from './CodeTrapCard'
import { FillInCard } from './FillInCard'
import { FlipCard } from './FlipCard'
import { MultipleChoiceCard } from './MultipleChoiceCard'

interface CardRendererProps {
  card: Card
  onRate: (rating: Rating) => void
}

export function CardRenderer({ card, onRate }: CardRendererProps) {
  switch (card.type) {
    case 'flip':
      return <FlipCard key={card.id} card={card} onRate={onRate} />
    case 'multiple_choice':
      return <MultipleChoiceCard key={card.id} card={card} onRate={onRate} />
    case 'code_trap':
      return <CodeTrapCard key={card.id} card={card} onRate={onRate} />
    case 'fill_in':
      return <FillInCard key={card.id} card={card} onRate={onRate} />
    case 'code_task':
      return <CodeTaskCard key={card.id} card={card} onRate={onRate} />
    default:
      return assertNever(card)
  }
}

function assertNever(c: never): never {
  throw new Error(`unknown card type: ${(c as { type: string }).type}`)
}
