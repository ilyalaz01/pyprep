/**
 * Token storage helpers — single source of truth for the JWT location
 * (localStorage per ADR-011). Tests pin the contract so a future "let
 * me also store it in a cookie" PR shows up as a test diff.
 */
import { describe, expect, test } from 'vitest'
import { clearToken, getToken, setToken } from './auth'

describe('auth token storage', () => {
  test('returns null when nothing is set', () => {
    expect(getToken()).toBeNull()
  })

  test('round-trips a token through localStorage', () => {
    setToken('eyJ.test.token')
    expect(getToken()).toBe('eyJ.test.token')
  })

  test('clearToken removes the value', () => {
    setToken('eyJ.test.token')
    clearToken()
    expect(getToken()).toBeNull()
  })

  test('uses a namespaced localStorage key (no collision with other apps)', () => {
    setToken('eyJ.test.token')
    const keys = Object.keys(localStorage)
    expect(keys.some((k) => k.startsWith('pyprep:'))).toBe(true)
  })
})
