import { describe, expect, test } from 'vitest'
import { APIError } from './errors'

describe('APIError', () => {
  test('carries status / code / detail and a readable message', () => {
    const e = new APIError(409, 'email_exists', 'duplicate@example.com')
    expect(e).toBeInstanceOf(Error)
    expect(e.status).toBe(409)
    expect(e.code).toBe('email_exists')
    expect(e.detail).toBe('duplicate@example.com')
    expect(e.name).toBe('APIError')
    expect(e.message).toContain('409')
    expect(e.message).toContain('email_exists')
  })

  test('instanceof works across re-throw boundaries', () => {
    try {
      throw new APIError(401, 'invalid_token', '')
    } catch (e) {
      expect(e).toBeInstanceOf(APIError)
    }
  })
})
