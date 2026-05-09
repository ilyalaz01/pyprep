/**
 * Fetch wrapper contract:
 *  - Attaches `Authorization: Bearer <token>` when token is set.
 *  - Throws typed APIError on non-2xx, parsed from the JSON body
 *    `{error, detail}` shape that the api/errors.py registry produces.
 *  - On 401: clears the token AND triggers a redirect to /login,
 *    EXCEPT when already on /login (avoid redirect loops).
 *  - 204 returns undefined without trying to parse JSON.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { setToken, getToken } from './auth'
import { APIError } from './errors'
import { call } from './http'

const ORIGINAL_LOCATION = window.location

function mockLocation(pathname: string): { assign: ReturnType<typeof vi.fn> } {
  const assign = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...ORIGINAL_LOCATION, pathname, assign },
  })
  return { assign }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: ORIGINAL_LOCATION,
  })
})

describe('http.call', () => {
  test('attaches Authorization: Bearer when token present', async () => {
    setToken('eyJ.test.token')
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    await call<{ ok: boolean }>('/api/x')
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer eyJ.test.token')
  })

  test('omits Authorization when no token', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    await call('/api/x')
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBeNull()
  })

  test('non-2xx throws APIError parsed from body {error, detail}', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'email_exists', detail: 'a@b.com' }), {
        status: 409,
      }),
    )
    await expect(call('/api/auth/register', { method: 'POST' })).rejects.toMatchObject({
      status: 409,
      code: 'email_exists',
      detail: 'a@b.com',
    })
  })

  test('non-2xx with non-JSON body still throws APIError', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' }),
    )
    await expect(call('/api/x')).rejects.toBeInstanceOf(APIError)
  })

  test('401 clears token and redirects to /login', async () => {
    setToken('eyJ.expired.token')
    const { assign } = mockLocation('/home')
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'invalid_token', detail: '' }), {
        status: 401,
      }),
    )
    await expect(call('/api/sessions')).rejects.toBeInstanceOf(APIError)
    expect(getToken()).toBeNull()
    expect(assign).toHaveBeenCalledWith('/login')
  })

  test('401 on /login does NOT redirect (avoid loop)', async () => {
    setToken('eyJ.bad.token')
    const { assign } = mockLocation('/login')
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'invalid_credentials', detail: '' }), {
        status: 401,
      }),
    )
    await expect(call('/api/auth/login', { method: 'POST' })).rejects.toBeInstanceOf(APIError)
    expect(getToken()).toBeNull()
    expect(assign).not.toHaveBeenCalled()
  })

  test('204 returns undefined without parsing JSON', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const out = await call<undefined>('/api/x', { method: 'DELETE' })
    expect(out).toBeUndefined()
  })

  test('JSON body sets Content-Type automatically', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    await call('/api/x', { method: 'POST', body: JSON.stringify({ a: 1 }) })
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
  })
})
