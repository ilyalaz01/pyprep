/**
 * Typed endpoint surface — one function per backend route.
 * These tests pin the URL/method shape against the OpenAPI contract;
 * a backend change (e.g. /api/auth/login moves to /api/auth/sign-in)
 * trips a test diff rather than silently 404'ing in the SPA.
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

function lastCall(): { url: string; init: RequestInit } {
  const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
  const [url, init] = calls[calls.length - 1] as [string, RequestInit]
  return { url, init }
}

describe('api.health', () => {
  test('GET /api/health → {status, version, db_ok}', async () => {
    mockJson({ status: 'ok', version: '1.00', db_ok: true })
    const r = await api.health()
    expect(r).toEqual({ status: 'ok', version: '1.00', db_ok: true })
    const { url, init } = lastCall()
    expect(url).toContain('/api/health')
    expect((init.method ?? 'GET').toUpperCase()).toBe('GET')
  })
})

describe('api.config', () => {
  test('GET /api/config → {single_user, version, single_user_email}', async () => {
    mockJson({
      single_user: true,
      version: '1.00',
      single_user_email: 'owner@local.dev',
    })
    const r = await api.config()
    expect(r.single_user).toBe(true)
    expect(r.single_user_email).toBe('owner@local.dev')
  })

  test('multi-user mode returns single_user_email=null', async () => {
    mockJson({ single_user: false, version: '1.00', single_user_email: null })
    const r = await api.config()
    expect(r.single_user_email).toBeNull()
  })
})

describe('api.auth', () => {
  test('register POSTs /api/auth/register with body', async () => {
    mockJson({ id: 'u1', email: 'a@b.com', created_at: '2026-05-09T00:00:00Z' }, 201)
    await api.auth.register('a@b.com', 'hunter2!extra')
    const { url, init } = lastCall()
    expect(url).toContain('/api/auth/register')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'a@b.com',
      password: 'hunter2!extra',
    })
  })

  test('login returns {access_token, token_type, expires_at}', async () => {
    mockJson({
      access_token: 'eyJ.x.y',
      token_type: 'bearer',
      expires_at: '2026-05-16T00:00:00Z',
    })
    const r = await api.auth.login('a@b.com', 'hunter2!extra')
    expect(r.access_token).toBe('eyJ.x.y')
    expect(r.token_type).toBe('bearer')
  })

  test('refresh POSTs /api/auth/refresh with no body (token in header)', async () => {
    mockJson({ access_token: 'eyJ.r.x', token_type: 'bearer', expires_at: '2026-05-16' })
    await api.auth.refresh()
    const { url, init } = lastCall()
    expect(url).toContain('/api/auth/refresh')
    expect(init.method).toBe('POST')
    expect(init.body ?? null).toBeNull()
  })
})

describe('api.modules', () => {
  test('list returns {modules: [...]}', async () => {
    mockJson({ modules: [{ module_id: 1, sphere_ids: ['m1-s0'] }] })
    const r = await api.modules.list()
    expect(r.modules[0].module_id).toBe(1)
  })

  test('get hits /api/modules/{id}', async () => {
    mockJson({ module_id: 1, sphere_ids: ['m1-s0'], spheres: [] })
    await api.modules.get(1)
    expect(lastCall().url).toContain('/api/modules/1')
  })

  test('lesson hits /api/modules/{id}/lesson/{sphere_id}', async () => {
    mockJson({ sphere_id: 'm1-s0', module_id: 1, lesson_md: '# x', card_count: 3 })
    await api.modules.lesson(1, 'm1-s0')
    expect(lastCall().url).toContain('/api/modules/1/lesson/m1-s0')
  })
})

describe('api.review', () => {
  test('queue hits /api/review/queue with optional params', async () => {
    mockJson({ card_ids: [], sphere_id: null })
    await api.review.queue({ sphere_id: 'm1-s0', limit: 10 })
    const url = lastCall().url
    expect(url).toContain('/api/review/queue')
    expect(url).toContain('sphere_id=m1-s0')
    expect(url).toContain('limit=10')
  })
})

describe('api.sessions', () => {
  test('start POSTs /api/sessions with mode/sphere_id/limit', async () => {
    mockJson({
      id: 's1', user_id: 'u1', mode: 'learn', queue: ['c1'],
      started_at: '2026-05-09T00:00:00Z', ended_at: null,
      cards_total: 1, cards_correct: 0,
    }, 201)
    await api.sessions.start({ mode: 'learn', sphere_id: 'm1-s0', limit: 5 })
    const { url, init } = lastCall()
    expect(url).toContain('/api/sessions')
    expect(init.method).toBe('POST')
  })

  test('answer carries idempotency_key in body when provided', async () => {
    mockJson({ next_due_at: '2026-05-10', new_state: 'learning' })
    await api.sessions.answer('s1', {
      card_id: 'c1', rating: 3, response_ms: 1000,
      idempotency_key: 'k-' + '0'.repeat(30),
    })
    const body = JSON.parse(lastCall().init.body as string)
    expect(body.idempotency_key).toBe('k-' + '0'.repeat(30))
  })
})

describe('api.stats', () => {
  test('me hits /api/stats/me', async () => {
    mockJson({ reviews_total: 0, retention: 0, streak: 0, xp: 0, orphan_review_count: 0 })
    await api.stats.me()
    expect(lastCall().url).toContain('/api/stats/me')
  })
})

describe('api.mock', () => {
  test('prompt POSTs /api/mock/prompt with body', async () => {
    mockJson({ text: '...', cards_used: ['c1'], estimated_minutes: 30 })
    await api.mock.prompt({ modules: [1], count: 5, seed: 7 })
    const { url, init } = lastCall()
    expect(url).toContain('/api/mock/prompt')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string).seed).toBe(7)
  })
})
