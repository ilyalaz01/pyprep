/**
 * APIError — thrown by the fetch wrapper on any non-2xx response.
 * Shape mirrors the backend error envelope (`{error, detail}`) produced
 * by `pyprep.api.errors.HTTPMapping`. Callers branch on `code`, not on
 * the human-readable `message`.
 */
export class APIError extends Error {
  readonly status: number
  readonly code: string
  readonly detail: string

  constructor(status: number, code: string, detail: string) {
    super(`[${status}] ${code}: ${detail}`)
    this.name = 'APIError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}
