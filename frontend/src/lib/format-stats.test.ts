/**
 * P7.T7.5 — formatters for OverviewCards. Pure-function unit tests
 * pin the framing decisions: anti-Duolingo (no emoji, no shame copy),
 * singular/plural, time-unit thresholds, value clamps.
 */
import { describe, expect, test } from 'vitest'

import {
  formatReviews, formatStreak, formatTime, formatXp,
} from './format-stats'

describe('formatTime', () => {
  test.each([
    [0, '0s'],
    [1, '1s'],
    [59, '59s'],
    [60, '1m'],
    [90, '1m 30s'],
    [120, '2m'],
    [3599, '59m 59s'],
    [3600, '1h'],
    [3725, '1h 2m'],
    [86_400, '24h'],
  ])('%i seconds → "%s"', (input, expected) => {
    expect(formatTime(input)).toBe(expected)
  })

  test('clamps negative input to 0', () => {
    expect(formatTime(-5)).toBe('0s')
  })
})

describe('formatStreak', () => {
  test('singular vs plural day label', () => {
    expect(formatStreak(0)).toEqual({ value: '0', units: 'days' })
    expect(formatStreak(1)).toEqual({ value: '1', units: 'day' })
    expect(formatStreak(2)).toEqual({ value: '2', units: 'days' })
    expect(formatStreak(365)).toEqual({ value: '365', units: 'days' })
  })

  test('clamps negative input to 0', () => {
    expect(formatStreak(-3)).toEqual({ value: '0', units: 'days' })
  })
})

// formatAccuracy was removed per P7-fix (Accuracy tile dropped from
// OverviewCards — ADR-015 / N040). SessionSummary has its own
// per-session accuracy formatter that operates on { correct, total }
// rather than a retention fraction.

describe('formatXp', () => {
  test('rounds fractional XP to integer', () => {
    expect(formatXp(0)).toBe('0')
    expect(formatXp(4.5)).toBe('5')
    expect(formatXp(45)).toBe('45')
  })

  test('clamps negative input to 0', () => {
    expect(formatXp(-10)).toBe('0')
  })
})

describe('formatReviews', () => {
  test('singular vs plural', () => {
    expect(formatReviews(1)).toEqual({ value: '1', units: 'review' })
    expect(formatReviews(0)).toEqual({ value: '0', units: 'reviews' })
    expect(formatReviews(12)).toEqual({ value: '12', units: 'reviews' })
  })
})

describe('anti-Duolingo guards (P7 brief §C)', () => {
  test('no emoji or flame in any formatter output', () => {
    const all = [
      formatTime(3725), formatStreak(3).value, formatStreak(3).units,
      formatXp(45),
      formatReviews(12).value, formatReviews(12).units,
    ].join(' ')
    // Banned glyphs: flame, sparkle, party, trophy, medal — common
    // gamification chrome that DESIGN.md anti-references forbid.
    for (const banned of ['🔥', '✨', '🎉', '🏆', '🥇']) {
      expect(all).not.toContain(banned)
    }
  })
})
