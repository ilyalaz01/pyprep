/**
 * Card-type raw fixtures shared across SessionPage / CardRenderer
 * integration tests. Each shape mirrors what /api/sessions/{id}/next
 * returns for that card type — minimum fields required to satisfy
 * parseCard()'s Zod schemas.
 */
import type { NextCard } from '../lib/types'

const baseRaw = { topic: 't', difficulty: 1, tags: ['x'] }

export const flipRaw = { ...baseRaw, id: 'm1-s0-c1', type: 'flip',
  question: 'Which built-in types are mutable?',
  answer: 'list, dict, set, bytearray are mutable; rest are immutable.' }

export const mcRaw = { ...baseRaw, id: 'm1-s0-c5', type: 'multiple_choice',
  question: 'Resolution order?',
  options: ['L→G', 'L→E→G→B', 'B→G→L', 'L→M→C→B'],
  correct_index: 1, option_explanations: ['', '', '', ''] }

export const codeTrapRaw = { ...baseRaw, id: 'm1-s0-c2', type: 'code_trap',
  code_snippet: 'def f(x, items=[]):\n    items.append(x); return items',
  question: 'What does f(1) print twice in a row?', correct_index: 1,
  options: ['[1] [1]', '[1] [1, 2]', 'Error', '[]'],
  explanation_md: 'The default is evaluated once at definition time and shared.' }

export const fillInRaw = { ...baseRaw, id: 'm1-s0-c3', type: 'fill_in',
  code_snippet_with_blanks: 'def f(x, items=___):\n    pass',
  accepted_answers: [['None']], explanation_md: 'Use None.' }

export const codeTaskRaw = { ...baseRaw, id: 'm1-s0-c4', type: 'code_task', difficulty: 3,
  prompt_md: 'Implement make_counter(start=0) returning a closure.',
  starter_code: 'def make_counter(start=0):\n    pass',
  solution_code: 'def make_counter(start=0):\n    c = start\n    def step(): nonlocal c; c += 1; return c\n    return step',
  tests: 'def test_counts_from_zero():\n    c = make_counter(); assert c() == 1', allowlist: ['pytest'] }

export const next = (raw: Record<string, unknown>): NextCard => ({
  card_id: raw.id as string, type: raw.type as string,
  topic: raw.topic as string, difficulty: raw.difficulty as number,
  sphere_id: 'm1-s0', raw,
})
