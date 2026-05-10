/**
 * expectAnswerHidden — runtime masking assertion for card renderer
 * tests. Walks a card's answer-shaped fields and asserts none of
 * them appear in the given DOM container's innerHTML.
 *
 * Defense in depth on top of the type-layer FlipCardFront /
 * MultipleChoiceCardFront / etc. masks: tsc protects against
 * accidentally passing the wrong shape; this protects against the
 * right shape rendering the wrong field by mistake.
 *
 * Used by every renderer test from T5.5 onward to assert that the
 * pre-reveal DOM does not leak the post-reveal payload.
 */
import type { Card } from '../lib/card-types'

function answerStrings(card: Card): string[] {
  switch (card.type) {
    case 'flip':
      return [card.answer, card.answer_explanation_md ?? ''].filter(Boolean)
    case 'multiple_choice':
      return [...card.option_explanations]
    case 'code_trap':
      return [card.explanation_md]
    case 'fill_in':
      return [
        ...card.accepted_answers.flat(),
        card.explanation_md ?? '',
      ].filter(Boolean)
    case 'code_task':
      return [card.solution_code, card.tests]
  }
}

export function expectAnswerHidden(card: Card, container: HTMLElement): void {
  const html = container.innerHTML
  for (const s of answerStrings(card)) {
    if (s && html.includes(s)) {
      throw new Error(
        `answer leaked: rendering for card ${card.id} (${card.type}) ` +
          `includes a hidden-answer string: "${s.slice(0, 60)}..."`,
      )
    }
  }
}
