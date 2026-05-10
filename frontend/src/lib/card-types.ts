/**
 * Card-type discriminated union + Zod parser.
 *
 * Closes the `card.raw: dict[str, Any]` type-system hole in NextCard
 * by parsing once at the boundary into one of five tightly-typed
 * shapes. Mirrors content/schema/card.schema.json — that JSON Schema
 * is the source of truth for content authoring; this file is the
 * source of truth for runtime parsing in the SPA.
 *
 * Pre-reveal renderers MUST consume the *Front variants (e.g.
 * FlipCardFront omits `answer`) so masking is enforced at the type
 * layer — wrong code that surfaces an answer field fails tsc, not
 * just integration tests. Use expectAnswerHidden(card, dom) in
 * card renderer tests as a defense-in-depth runtime check.
 */
import { z } from 'zod'

const Base = z.object({
  id: z.string().regex(/^m[0-9]+-s[0-9]+-c[0-9]+$/),
  topic: z.string().max(120),
  difficulty: z.number().int().min(1).max(5),
  tags: z.array(z.string()).min(1),
  module_id: z.number().int().min(1).optional(),
  sphere_id: z.string().regex(/^m[0-9]+-s[0-9]+$/).optional(),
  topic_ru: z.string().max(160).optional(),
  source: z.string().optional(),
})

const FlipCardSchema = Base.extend({
  type: z.literal('flip'),
  question: z.string().min(5),
  answer: z.string().min(5),
  answer_explanation_md: z.string().optional(),
})

const MultipleChoiceCardSchema = Base.extend({
  type: z.literal('multiple_choice'),
  question: z.string().min(5),
  options: z.array(z.string()).min(2).max(6),
  correct_index: z.number().int().min(0),
  option_explanations: z.array(z.string()),
})

const CodeTrapCardSchema = Base.extend({
  type: z.literal('code_trap'),
  code_snippet: z.string().min(5),
  question: z.string().min(5),
  options: z.array(z.string()).min(2).max(6),
  correct_index: z.number().int().min(0),
  explanation_md: z.string().min(20),
})

const FillInCardSchema = Base.extend({
  type: z.literal('fill_in'),
  code_snippet_with_blanks: z.string().regex(/___/),
  accepted_answers: z.array(z.array(z.string())),
  explanation_md: z.string().optional(),
})

const CodeTaskCardSchema = Base.extend({
  type: z.literal('code_task'),
  prompt_md: z.string().min(20),
  starter_code: z.string(),
  solution_code: z.string().min(5),
  tests: z.string().min(20),
  allowlist: z.array(z.string()).optional(),
})

export const CardSchema = z.discriminatedUnion('type', [
  FlipCardSchema, MultipleChoiceCardSchema, CodeTrapCardSchema,
  FillInCardSchema, CodeTaskCardSchema,
])

export type FlipCard = z.infer<typeof FlipCardSchema>
export type MultipleChoiceCard = z.infer<typeof MultipleChoiceCardSchema>
export type CodeTrapCard = z.infer<typeof CodeTrapCardSchema>
export type FillInCard = z.infer<typeof FillInCardSchema>
export type CodeTaskCard = z.infer<typeof CodeTaskCardSchema>
export type Card = z.infer<typeof CardSchema>

/** Answer-hidden views for pre-reveal renderers. Type-layer masking. */
export type FlipCardFront = Omit<FlipCard, 'answer' | 'answer_explanation_md'>
export type MultipleChoiceCardFront = Omit<
  MultipleChoiceCard, 'correct_index' | 'option_explanations'
>
export type CodeTrapCardFront = Omit<
  CodeTrapCard, 'correct_index' | 'explanation_md'
>
export type FillInCardFront = Omit<
  FillInCard, 'accepted_answers' | 'explanation_md'
>
export type CodeTaskCardFront = Omit<
  CodeTaskCard, 'solution_code' | 'tests'
>

/** Thrown by parseCard on schema violation. Carries Zod issues for diagnostics. */
export class CardSchemaError extends Error {
  readonly issues: readonly z.core.$ZodIssue[]
  constructor(issues: readonly z.core.$ZodIssue[]) {
    super(`invalid card: ${issues[0]?.message ?? 'unknown schema error'}`)
    this.name = 'CardSchemaError'
    this.issues = issues
  }
}

/** Parse a raw NextCard.raw payload into a typed Card. Throws on violation. */
export function parseCard(raw: unknown): Card {
  const result = CardSchema.safeParse(raw)
  if (!result.success) throw new CardSchemaError(result.error.issues)
  return result.data
}
