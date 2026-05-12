/**
 * Typed API client — one function per backend route, hand-typed against
 * the OpenAPI surface at `/api/openapi.json`. Types live in `./types.ts`.
 *
 * Hand-typing > codegen at MVP scale (16 endpoints, small contract):
 * compile-time errors fire the moment the backend contract drifts, with
 * no build step in the loop. Re-evaluate at Phase 10 if endpoint count
 * grows past ~30.
 *
 * Auth tags reflect `PLAN.md` §7: PUBLIC = no Authorization header
 * required (config, modules, health); Bearer = `Authorization: Bearer
 * <jwt>` required (everything else).
 */
import { call } from './http'
import type {
  AccessToken, AnswerResult, Config, Daily, Health, Lesson, MockPrompt,
  ModuleDetail, ModulesList, NextCard, Overview, PerModule, ReviewQueue,
  Session, SessionMode, SessionSummary, User, Weakness,
} from './types'

function qs(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.set(k, String(v))
  }
  const s = u.toString()
  return s ? `?${s}` : ''
}

const post = (body?: unknown): RequestInit => ({
  method: 'POST',
  body: body === undefined ? null : JSON.stringify(body),
})

export const api = {
  health: () => call<Health>('/api/health'),
  config: () => call<Config>('/api/config'),

  auth: {
    register: (email: string, password: string) =>
      call<User>('/api/auth/register', post({ email, password })),
    login: (email: string, password: string) =>
      call<AccessToken>('/api/auth/login', post({ email, password })),
    refresh: () => call<AccessToken>('/api/auth/refresh', post()),
    me: () => call<User>('/api/auth/me'),
  },

  modules: {
    list: () => call<ModulesList>('/api/modules'),
    get: (id: number) => call<ModuleDetail>(`/api/modules/${id}`),
    lesson: (id: number, sphereId: string) =>
      call<Lesson>(`/api/modules/${id}/lesson/${sphereId}`),
  },

  sessions: {
    start: (body: { mode: SessionMode; sphere_id?: string; limit?: number }) =>
      call<Session>('/api/sessions', post(body)),
    next: (id: string, after?: string) =>
      call<NextCard>(`/api/sessions/${id}/next${qs({ after })}`),
    answer: (
      id: string,
      body: { card_id: string; rating: 1 | 2 | 3 | 4; response_ms: number; idempotency_key?: string },
    ) => call<AnswerResult>(`/api/sessions/${id}/answer`, post(body)),
    finish: (id: string) =>
      call<SessionSummary>(`/api/sessions/${id}/finish`, post()),
  },

  review: {
    queue: (params: { sphere_id?: string; limit?: number } = {}) =>
      call<ReviewQueue>(`/api/review/queue${qs(params)}`),
  },

  stats: {
    me: () => call<Overview>('/api/stats/me'),
    weakness: (n = 3) => call<Weakness>(`/api/stats/me/weakness${qs({ n })}`),
    // P7.T7.2 — both wrappers over existing SDK methods. `days` cap is
    // 90 per the handler-side Query(le=90); UI default is 30.
    perModule: () => call<PerModule>('/api/stats/me/per-module'),
    daily: (days = 30) => call<Daily>(`/api/stats/me/daily${qs({ days })}`),
  },

  mock: {
    prompt: (body: {
      modules?: number[]; spheres?: string[]; difficulty_min?: number;
      difficulty_max?: number; count?: number; duration_minutes?: number;
      weakness_focus?: boolean; seed?: number
    }) => call<MockPrompt>('/api/mock/prompt', post(body)),
  },
}
