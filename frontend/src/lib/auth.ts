/**
 * JWT storage — localStorage per ADR-011 (single-user MVP-1 trade-off).
 * Single source of truth: every read/write goes through these three
 * functions. Migration to httpOnly cookie + CSRF lands when going
 * public-multi-user (ADR-011 review trigger).
 */
const KEY = 'pyprep:jwt'

export function getToken(): string | null {
  return localStorage.getItem(KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(KEY)
}
