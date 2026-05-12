/**
 * Typed endpoint surface — stats namespace.
 * Split from api.test.ts after P7.T7.2 added per-module + daily
 * endpoints to keep both files under the 150-LOC gate.
 * Pins URL/method shape against the OpenAPI contract.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './api'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

function mockJson(body: unknown, status = 200): void {
  ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  )
}

function lastUrl(): string {
  const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
  return calls[calls.length - 1]?.[0] as string
}

describe('api.stats', () => {
  test('me hits /api/stats/me and types include total_seconds (ADR-027)', async () => {
    mockJson({
      reviews_total: 0, retention: 0, streak: 0, xp: 0,
      orphan_review_count: 0, total_seconds: 0,
    })
    const r = await api.stats.me()
    expect(lastUrl()).toContain('/api/stats/me')
    expect(r.total_seconds).toBe(0)
  })

  test('weakness hits /api/stats/me/weakness?n=N', async () => {
    mockJson({ top: [] })
    await api.stats.weakness(5)
    expect(lastUrl()).toContain('/api/stats/me/weakness?n=5')
  })

  // P7.T7.2 — per-module + daily endpoints.
  test('perModule hits /api/stats/me/per-module', async () => {
    mockJson({ modules: [] })
    const r = await api.stats.perModule()
    expect(lastUrl()).toContain('/api/stats/me/per-module')
    expect(r.modules).toEqual([])
  })

  test.each([
    [undefined, 'days=30'],
    [7, 'days=7'],
    [90, 'days=90'],
  ])('daily(%s) hits /api/stats/me/daily?%s', async (days, query) => {
    mockJson({ days: [] })
    await api.stats.daily(days)
    expect(lastUrl()).toContain(`/api/stats/me/daily?${query}`)
  })
})
