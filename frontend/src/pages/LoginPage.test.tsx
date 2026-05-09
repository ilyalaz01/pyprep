/**
 * LoginPage — happy path, credential errors, validation errors, and
 * single-user mode (email pre-filled + disabled).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { getToken } from '../lib/auth'
import { renderAt } from '../test/router-fixture'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

const CONFIG_MULTI = { single_user: false, version: '1.00', single_user_email: null }
const CONFIG_SINGLE = { single_user: true, version: '1.00', single_user_email: 'owner@local.dev' }

function mockFetch(routes: Record<string, () => Response>) {
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

beforeEach(() => {
  // Default: multi-user config
  mockFetch({ '/api/config': () => jsonResponse(CONFIG_MULTI) })
})
afterEach(() => vi.unstubAllGlobals())

describe('LoginPage — happy path', () => {
  test('fills form, submits, sets token, navigates to /home', async () => {
    mockFetch({
      '/api/config': () => jsonResponse(CONFIG_MULTI),
      '/api/auth/login': () =>
        jsonResponse({
          access_token: 'eyJ.h.s', token_type: 'bearer', expires_at: '2026-05-16',
        }),
    })
    const { router } = renderAt('/login')
    await userEvent.type(await screen.findByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'hunter2!extra')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(getToken()).toBe('eyJ.h.s'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/home'))
  })

  test('honors ?from search param for post-login redirect', async () => {
    mockFetch({
      '/api/config': () => jsonResponse(CONFIG_MULTI),
      '/api/auth/login': () =>
        jsonResponse({
          access_token: 'eyJ.t', token_type: 'bearer', expires_at: '2026-05-16',
        }),
    })
    const { router } = renderAt('/login?from=%2Fmodules%2F1')
    await userEvent.type(await screen.findByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'hunter2!extra')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/modules/1'))
  })
})

describe('LoginPage — error surfaces', () => {
  test('invalid credentials → ErrorBanner with friendly text', async () => {
    mockFetch({
      '/api/config': () => jsonResponse(CONFIG_MULTI),
      '/api/auth/login': () =>
        jsonResponse({ error: 'invalid_credentials', detail: '' }, 401),
    })
    renderAt('/login')
    await userEvent.type(await screen.findByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/email or password is incorrect/i)
  })

  test('422 invalid_email → inline field error, no banner', async () => {
    // Note: input is `type="email"`; we use a syntactically-valid value
    // here so HTML5 native validation lets the submit through. The
    // server-side rejection (mocked 422) is what we're exercising.
    mockFetch({
      '/api/config': () => jsonResponse(CONFIG_MULTI),
      '/api/auth/login': () =>
        jsonResponse({ error: 'invalid_email', detail: '' }, 422),
    })
    renderAt('/login')
    await userEvent.type(await screen.findByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'hunter2!extra')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/invalid email/i)
    const emailInput = screen.getByLabelText(/email/i)
    await waitFor(() => expect(emailInput).toHaveAttribute('aria-invalid', 'true'))
  })
})

describe('LoginPage — single-user mode', () => {
  test('email pre-filled and disabled when /api/config says single_user=true', async () => {
    mockFetch({ '/api/config': () => jsonResponse(CONFIG_SINGLE) })
    renderAt('/login')
    const email = await screen.findByLabelText(/email/i)
    await waitFor(() => expect(email).toBeDisabled())
    expect(email).toHaveValue('owner@local.dev')
  })

  test('single-user submit uses pre-filled email, not the (disabled) input value', async () => {
    let captured: string | null = null
    mockFetch({
      '/api/config': () => jsonResponse(CONFIG_SINGLE),
      '/api/auth/login': () =>
        jsonResponse({
          access_token: 'eyJ.x', token_type: 'bearer', expires_at: '2026-05-16',
        }),
    })
    // Spy on fetch to capture body
    const spy = fetch as unknown as ReturnType<typeof vi.fn>
    spy.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/config')) return jsonResponse(CONFIG_SINGLE)
      if (url.includes('/api/auth/login')) {
        captured = init?.body ? JSON.parse(init.body as string).email : null
        return jsonResponse({
          access_token: 'eyJ.x', token_type: 'bearer', expires_at: '2026-05-16',
        })
      }
      return new Response('not mocked: ' + url, { status: 500 })
    })
    renderAt('/login')
    await screen.findByLabelText(/email/i)
    await userEvent.type(screen.getByLabelText(/password/i), 'owner-password-12345')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(captured).toBe('owner@local.dev'))
  })
})
