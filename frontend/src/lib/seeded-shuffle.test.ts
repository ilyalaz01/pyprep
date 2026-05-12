// P7.T7.10 / N034 — deterministic shuffle for MC option re-presentation.
import { describe, expect, test } from 'vitest'

import { seededIndices } from './seeded-shuffle'

describe('seededIndices', () => {
  test('returns a permutation of [0..length)', () => {
    const out = seededIndices(6, 'card-1#1')
    expect(out.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5])
  })

  test('same seed → identical output (stable per attempt)', () => {
    const a = seededIndices(4, 'card-1#1')
    const b = seededIndices(4, 'card-1#1')
    expect(a).toEqual(b)
  })

  test('different seed → different output (almost always)', () => {
    // For 4 elements there are 24 permutations; identity collision
    // for two distinct seeds is improbable enough that the test is
    // useful as a regression alarm.
    const a = seededIndices(4, 'card-1#1')
    const b = seededIndices(4, 'card-1#2')
    expect(a).not.toEqual(b)
  })

  test('length=0 returns []', () => {
    expect(seededIndices(0, 'x')).toEqual([])
  })

  test('length=1 returns [0] regardless of seed', () => {
    expect(seededIndices(1, 'a')).toEqual([0])
    expect(seededIndices(1, 'b')).toEqual([0])
  })

  test('produces non-identity permutation for typical MC sizes', () => {
    // Pin at least one seed that shuffles a 4-element array; otherwise
    // the entire feature is a no-op. If you tweak the hash constants,
    // pick a new seed that exhibits the property.
    const out = seededIndices(4, 'card-1#1')
    expect(out).not.toEqual([0, 1, 2, 3])
  })
})
