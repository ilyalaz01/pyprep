/**
 * Deterministic Fisher-Yates shuffle keyed by a string seed.
 *
 * P7.T7.10 / N034: MC and CodeTrap renderers shuffle their option
 * arrays on AGAIN re-presentation (attempt_index > 0) so the user's
 * recall is recognition, not position memory ("the answer was the
 * third one"). Same seed → same output; required so a re-render
 * within the same attempt doesn't reshuffle on every keystroke.
 *
 * Seed convention: `${card.id}#${attemptIndex}`. attemptIndex=0
 * callers should skip the shuffle entirely (return the identity
 * permutation); this helper accepts any seed but is intended for the
 * attempt>0 path.
 */

/** Return a permutation of [0..length) deterministic in `seed`. */
export function seededIndices(length: number, seed: string): number[] {
  const out: number[] = []
  for (let i = 0; i < length; i++) out.push(i)
  let h = fnv1a(seed)
  // Fisher-Yates from the end. PRNG: Lehmer-style multiply-add; the
  // exact constants don't matter for a 4-6 element shuffle as long
  // as the sequence is non-trivial and stable across runs/browsers.
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h, 1664525) + 1013904223
    h = h >>> 0
    const j = h % (i + 1)
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

/** FNV-1a 32-bit hash. Public domain, well-distributed for short strings. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
