/**
 * `call<T>` — typed fetch wrapper for the PyPrep backend.
 *
 * - Attaches `Authorization: Bearer <jwt>` when a token is in localStorage.
 * - Sets `Content-Type: application/json` automatically when a body is sent.
 * - On non-2xx: parses the `{error, detail}` envelope and throws APIError.
 * - On 401: clears the token and triggers `window.location.assign('/login')`,
 *   except when already on `/login` (avoid redirect loops). Then still
 *   throws APIError so the caller's promise rejects.
 * - On 204: resolves to `undefined` without trying to parse JSON.
 *
 * BASE comes from `VITE_API_BASE_URL`; defaults to `http://localhost:8000`
 * for dev. In production with ADR-012 (FastAPI StaticFiles), set it to ''
 * for same-origin calls.
 */
import { clearToken, getToken } from './auth'
import { APIError } from './errors'

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

interface ErrorBody {
  error?: string
  detail?: string
}

export async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    clearToken()
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
  }

  if (!res.ok) {
    const body: ErrorBody = await res.json().catch(() => ({
      error: 'http_error',
      detail: res.statusText,
    }))
    throw new APIError(res.status, body.error ?? 'http_error', body.detail ?? '')
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
