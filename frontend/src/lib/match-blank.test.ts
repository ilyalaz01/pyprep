import { describe, expect, test } from 'vitest'
import { matchBlank } from './match-blank'

describe('matchBlank', () => {
  test('exact case-sensitive trimmed match', () => {
    expect(matchBlank('None', ['None'])).toBe(true)
    expect(matchBlank('  None  ', ['None'])).toBe(true)
  })
  test('case-insensitive trimmed match', () => {
    expect(matchBlank('none', ['None'])).toBe(true)
    expect(matchBlank('NONE', ['None'])).toBe(true)
  })
  test('mismatch', () => {
    expect(matchBlank('Some', ['None'])).toBe(false)
    expect(matchBlank('', ['None'])).toBe(false)
  })
  test('matches any of multiple accepted answers', () => {
    expect(matchBlank('[]', ['[]', 'list()'])).toBe(true)
    expect(matchBlank('list()', ['[]', 'list()'])).toBe(true)
    expect(matchBlank('LIST()', ['[]', 'list()'])).toBe(true)
    expect(matchBlank('dict()', ['[]', 'list()'])).toBe(false)
  })
})
