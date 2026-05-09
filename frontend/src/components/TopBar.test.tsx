/**
 * TopBar — tested through the router fixture so `useNavigate` resolves.
 * Pins the wordmark, single-user-mode badge conditional, the logged-in
 * email display, and the Sign-out click → clear token + navigate /login.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { getToken, setToken } from '../lib/auth'
import { renderAt } from '../test/router-fixture'

const ME = { id: 'u1', email: 'me@example.com', created_at: '2026-05-09T00:00:00Z' }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

function mockRoutes(routes: Record<string, () => Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString()
      for (const [path, builder] of Object.entries(routes)) {
        if (url.includes(path)) return builder()
      }
      return new Response('not mocked: ' + url, { status: 500 })
    }),
  )
}

beforeEach(() => setToken('eyJ.test.token'))
afterEach(() => vi.unstubAllGlobals())

describe('TopBar', () => {
  test('renders the PyPrep wordmark on every authed route', async () => {
    mockRoutes({
      '/api/config': () =>
        jsonResponse({ single_user: false, version: '1.00', single_user_email: null }),
      '/api/auth/me': () => jsonResponse(ME),
    })
    renderAt('/home')
    expect(await screen.findByText('PyPrep')).toBeInTheDocument()
  })

  test('shows the single-user-mode badge when config.single_user=true', async () => {
    mockRoutes({
      '/api/config': () =>
        jsonResponse({
          single_user: true, version: '1.00', single_user_email: 'owner@local.dev',
        }),
      '/api/auth/me': () => jsonResponse({ ...ME, email: 'owner@local.dev' }),
    })
    renderAt('/home')
    expect(await screen.findByText(/single-user mode/i)).toBeInTheDocument()
  })

  test('does NOT show the badge in multi-user mode', async () => {
    mockRoutes({
      '/api/config': () =>
        jsonResponse({ single_user: false, version: '1.00', single_user_email: null }),
      '/api/auth/me': () => jsonResponse(ME),
    })
    renderAt('/home')
    await screen.findByText('PyPrep')
    expect(screen.queryByText(/single-user mode/i)).not.toBeInTheDocument()
  })

  test('shows the current user email once /me resolves', async () => {
    mockRoutes({
      '/api/config': () =>
        jsonResponse({ single_user: false, version: '1.00', single_user_email: null }),
      '/api/auth/me': () => jsonResponse(ME),
    })
    renderAt('/home')
    expect(await screen.findByText('me@example.com')).toBeInTheDocument()
  })

  test('Sign out clears the token and navigates to /login', async () => {
    mockRoutes({
      '/api/config': () =>
        jsonResponse({ single_user: false, version: '1.00', single_user_email: null }),
      '/api/auth/me': () => jsonResponse(ME),
    })
    const { router } = renderAt('/home')
    await screen.findByText('PyPrep')
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    await waitFor(() => expect(getToken()).toBeNull())
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})
