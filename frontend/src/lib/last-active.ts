/**
 * Last-active sphere — local-only signal for the home "Continue where
 * you left off" section. Tracked client-side rather than server-side
 * because (a) there's no business reason for the server to care which
 * sphere a user opened most recently, and (b) cross-device drift is a
 * non-concern in single-user MVP-1.
 *
 * T5 (session lifecycle) will write here whenever a session starts.
 * For now (T4.4) the SPA reads it; absence → the section is omitted.
 */
const KEY = 'pyprep:last-active'

export interface LastActive {
  module_id: number
  sphere_id: string
  /** ISO-8601 timestamp at the moment the user last opened the sphere. */
  ts: string
}

export function getLastActive(): LastActive | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as LastActive
    if (
      typeof parsed.module_id === 'number' &&
      typeof parsed.sphere_id === 'string' &&
      typeof parsed.ts === 'string'
    ) {
      return parsed
    }
  } catch {
    /* fall through */
  }
  return null
}

export function setLastActive(value: Omit<LastActive, 'ts'>): void {
  localStorage.setItem(
    KEY,
    JSON.stringify({ ...value, ts: new Date().toISOString() }),
  )
}

export function clearLastActive(): void {
  localStorage.removeItem(KEY)
}
