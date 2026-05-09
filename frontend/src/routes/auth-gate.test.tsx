/**
 * Auth gate — `_auth` parent route's beforeLoad hook redirects to
 * /login when no token, lets through with token. The `from` search
 * param preserves the original target for post-login navigation.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { setToken } from '../lib/auth'
import { renderAt } from '../test/router-fixture'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          single_user: false, version: '1.00', single_user_email: null,
        }),
        { status: 200 },
      ),
    ),
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('auth gate', () => {
  test('no token + visiting / → redirected to /login', async () => {
    const { router } = renderAt('/')
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login')
    })
  })

  test('no token + visiting /home → redirected to /login with ?from=/home', async () => {
    const { router } = renderAt('/home')
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login')
      expect(router.state.location.search).toMatchObject({ from: expect.stringContaining('/home') })
    })
  })

  test('token present + visiting /home → renders HomePage', async () => {
    setToken('eyJ.test.token')
    renderAt('/home')
    expect(await screen.findByRole('heading', { name: /home/i })).toBeInTheDocument()
  })

  test('token present + visiting / → redirected to /home', async () => {
    setToken('eyJ.test.token')
    const { router } = renderAt('/')
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/home')
    })
  })
})
