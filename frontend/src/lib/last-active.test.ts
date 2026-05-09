import { describe, expect, test, vi } from 'vitest'
import { clearLastActive, getLastActive, setLastActive } from './last-active'

describe('last-active', () => {
  test('returns null when nothing set', () => {
    expect(getLastActive()).toBeNull()
  })

  test('round-trips a value with auto-stamped ts', () => {
    vi.setSystemTime(new Date('2026-05-09T12:00:00Z'))
    setLastActive({ module_id: 1, sphere_id: 'm1-s0' })
    const got = getLastActive()
    expect(got?.module_id).toBe(1)
    expect(got?.sphere_id).toBe('m1-s0')
    expect(got?.ts).toBe('2026-05-09T12:00:00.000Z')
    vi.useRealTimers()
  })

  test('returns null on garbage payload (defensive parse)', () => {
    localStorage.setItem('pyprep:last-active', 'not-json')
    expect(getLastActive()).toBeNull()
  })

  test('returns null when shape is wrong', () => {
    localStorage.setItem('pyprep:last-active', JSON.stringify({ wrong: true }))
    expect(getLastActive()).toBeNull()
  })

  test('clear removes it', () => {
    setLastActive({ module_id: 1, sphere_id: 'm1-s0' })
    clearLastActive()
    expect(getLastActive()).toBeNull()
  })
})
