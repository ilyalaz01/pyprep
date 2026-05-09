/**
 * Boot smoke check — run once at app start. Hits /api/health and warns
 * to console if `db_ok=false`. Non-fatal: the app still renders so the
 * user sees the broken state in the UI later, but the developer console
 * gets the early signal.
 */
import { api } from './api'

export async function smoke(): Promise<void> {
  try {
    const h = await api.health()
    if (!h.db_ok) {
      console.warn('[pyprep] /api/health: db_ok=false', h)
    }
  } catch (e) {
    console.warn('[pyprep] /api/health unreachable', e)
  }
}
