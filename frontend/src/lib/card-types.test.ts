import { describe, expect, test } from 'vitest'

import {
  CardSchemaError,
  parseCard,
  type Card,
  type CodeTaskCard,
  type CodeTrapCard,
  type FillInCard,
  type FlipCard,
  type MultipleChoiceCard,
} from './card-types'
import { expectAnswerHidden } from '../test/expect-answer-hidden'

const base = {
  id: 'm1-s0-c1',
  topic: 'Mutability',
  difficulty: 1,
  tags: ['mutability'],
}

const flip = {
  ...base, type: 'flip',
  question: 'Which built-in types are mutable?',
  answer: 'list, dict, set, bytearray. The rest are immutable.',
  answer_explanation_md: 'Mutability affects identity and hashing.',
} as const

const mc = {
  ...base, id: 'm1-s0-c2', type: 'multiple_choice',
  question: 'In what order does Python resolve a name?',
  options: ['L→G→E→B', 'L→E→G→B', 'B→G→E→L', 'L→M→C→B'],
  correct_index: 1,
  option_explanations: ['wrong', 'right', 'wrong', 'wrong'],
} as const

const codeTrap = {
  ...base, id: 'm1-s0-c3', type: 'code_trap',
  code_snippet: 'def f(x, items=[]):\n    items.append(x)\n    return items',
  question: 'What does add(1); add(2) print?',
  options: ['[1] [2]', '[1] [1, 2]', 'TypeError', '[]'],
  correct_index: 1,
  explanation_md: 'The default list is evaluated once at definition time and shared across calls.',
} as const

const fillIn = {
  ...base, id: 'm1-s0-c4', type: 'fill_in',
  code_snippet_with_blanks: 'def f(x, items=___):\n    return items',
  accepted_answers: [['None', 'tuple()']],
  explanation_md: 'Use None sentinel.',
} as const

const codeTask = {
  ...base, id: 'm1-s0-c5', type: 'code_task',
  prompt_md: 'Implement make_counter(start=0) returning a closure that increments by 1.',
  starter_code: 'def make_counter(start=0):\n    pass',
  solution_code: 'def make_counter(start=0):\n    c = start\n    def step():\n        nonlocal c; c += 1; return c\n    return step',
  tests: 'def test_counts():\n    c = make_counter()\n    assert c() == 1\n    assert c() == 2',
  allowlist: ['pytest'],
} as const

describe('parseCard — valid shapes', () => {
  test.each([
    ['flip', flip], ['multiple_choice', mc], ['code_trap', codeTrap],
    ['fill_in', fillIn], ['code_task', codeTask],
  ] as const)('parses a %s card', (kind, raw) => {
    const got = parseCard(raw)
    expect(got.type).toBe(kind)
    expect(got.id).toBe(raw.id)
  })

  test('preserves optional shared fields (module_id, sphere_id, topic_ru, source)', () => {
    const got = parseCard({
      ...flip, module_id: 1, sphere_id: 'm1-s0',
      topic_ru: 'Изменяемость', source: 'PEP-8',
    }) as FlipCard
    expect(got.module_id).toBe(1)
    expect(got.sphere_id).toBe('m1-s0')
    expect(got.topic_ru).toBe('Изменяемость')
    expect(got.source).toBe('PEP-8')
  })

  test('discriminated union narrows correctly per type', () => {
    const got: Card = parseCard(mc)
    if (got.type === 'multiple_choice') {
      // TS narrowing — these accesses must compile for the union to work.
      const _typed: MultipleChoiceCard = got
      expect(_typed.options).toHaveLength(4)
      expect(_typed.correct_index).toBe(1)
    } else {
      throw new Error('discriminator did not narrow to multiple_choice')
    }
  })
})

describe('parseCard — schema violations throw CardSchemaError', () => {
  test('unknown card type', () => {
    expect(() => parseCard({ ...base, type: 'screencast' }))
      .toThrow(CardSchemaError)
  })

  test.each([
    ['flip without answer', { ...flip, answer: undefined }],
    ['mc without correct_index', { ...mc, correct_index: undefined }],
    ['code_trap without code_snippet', { ...codeTrap, code_snippet: undefined }],
    ['fill_in without accepted_answers', { ...fillIn, accepted_answers: undefined }],
    ['code_task without tests', { ...codeTask, tests: undefined }],
  ] as const)('rejects %s', (_label, bad) => {
    expect(() => parseCard(bad)).toThrow(CardSchemaError)
  })

  test('rejects wrong field type (options as string not array)', () => {
    expect(() => parseCard({ ...mc, options: 'L→E→G→B' }))
      .toThrow(CardSchemaError)
  })

  test('CardSchemaError carries the original Zod issues for diagnostics', () => {
    try {
      parseCard({ ...flip, answer: undefined })
      throw new Error('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(CardSchemaError)
      expect((e as CardSchemaError).issues.length).toBeGreaterThan(0)
    }
  })
})

describe('expectAnswerHidden — masking helper for renderer tests', () => {
  test('passes when DOM contains no answer-shaped strings', () => {
    const el = document.createElement('div')
    el.innerHTML = '<p>Question only — answer hidden until reveal.</p>'
    const card = parseCard(flip) as FlipCard
    expect(() => expectAnswerHidden(card, el)).not.toThrow()
  })

  test('throws when the DOM leaks the FlipCard answer', () => {
    const el = document.createElement('div')
    const card = parseCard(flip) as FlipCard
    el.innerHTML = `<p>${card.answer}</p>`
    expect(() => expectAnswerHidden(card, el)).toThrow(/answer leaked/i)
  })

  test('throws when the DOM leaks an MC option_explanations entry', () => {
    const el = document.createElement('div')
    const card = parseCard(mc) as MultipleChoiceCard
    el.innerHTML = `<p>${card.option_explanations[0]}</p>`
    expect(() => expectAnswerHidden(card, el)).toThrow(/answer leaked/i)
  })

  test('throws when the DOM leaks a CodeTask solution', () => {
    const el = document.createElement('div')
    const card = parseCard(codeTask) as CodeTaskCard
    el.innerHTML = `<pre>${card.solution_code}</pre>`
    expect(() => expectAnswerHidden(card, el)).toThrow(/answer leaked/i)
  })

  test('throws when the DOM leaks a fill-in explanation_md', () => {
    // accepted_answers are intentionally NOT substring-checked for
    // fill_in — short tokens like "is"/"[]" collide with the snippet
    // text. Renderer tests assert pre-submit masking structurally.
    const el = document.createElement('div')
    const card = parseCard(fillIn) as FillInCard
    el.innerHTML = `<p>${card.explanation_md}</p>`
    expect(() => expectAnswerHidden(card, el)).toThrow(/answer leaked/i)
  })

  test('throws when the DOM leaks the CodeTrap explanation', () => {
    const el = document.createElement('div')
    const card = parseCard(codeTrap) as CodeTrapCard
    el.innerHTML = `<p>${card.explanation_md}</p>`
    expect(() => expectAnswerHidden(card, el)).toThrow(/answer leaked/i)
  })
})
