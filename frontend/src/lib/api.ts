/**
 * Typed API client — one function per backend route, hand-typed against
 * the OpenAPI surface at `/api/openapi.json`.
 *
 * Hand-typing > codegen at MVP scale (15 endpoints, small contract):
 * compile-time errors fire the moment the backend contract drifts, with
 * no build step in the loop. Re-evaluate at Phase 10 if endpoint count
 * grows past ~30.
 *
 * Auth tags reflect `PLAN.md` §7: PUBLIC = no Authorization header
 * required (modules + health); Bearer = `Authorization: Bearer <jwt>`
 * required (everything else).
 */
import { call } from './http'

// --- Health (PUBLIC) ----------------------------------------------------
export interface Health {
  status: string
  version: string
  db_ok: boolean
}

// --- Auth ---------------------------------------------------------------
export interface User {
  id: string
  email: string
  created_at: string
}
export interface AccessToken {
  access_token: string
  token_type: 'bearer'
  expires_at: string
}

// --- Modules (PUBLIC) ---------------------------------------------------
export interface ModuleSummary { module_id: number; sphere_ids: string[] }
export interface ModulesList { modules: ModuleSummary[] }
export interface SphereSummary {
  sphere_id: string
  card_count: number
  lesson_present: boolean
}
export interface ModuleDetail {
  module_id: number
  sphere_ids: string[]
  spheres: SphereSummary[]
}
export interface Lesson {
  sphere_id: string
  module_id: number
  lesson_md: string
  card_count: number
}

// --- Sessions -----------------------------------------------------------
export type SessionMode = 'learn' | 'review' | 'mixed'
export interface Session {
  id: string
  user_id: string
  mode: string
  queue: string[]
  started_at: string
  ended_at: string | null
  cards_total: number
  cards_correct: number
}
export interface NextCard {
  card_id: string
  type: string
  topic: string
  difficulty: number
  sphere_id: string
  raw: Record<string, unknown>
}
export interface AnswerResult { next_due_at: string; new_state: string }
export interface SessionSummary {
  cards_total: number
  cards_correct: number
  retention: number
}

// --- Review queue -------------------------------------------------------
export interface ReviewQueue { card_ids: string[]; sphere_id: string | null }

// --- Stats --------------------------------------------------------------
export interface Overview {
  reviews_total: number
  retention: number
  streak: number
  xp: number
  orphan_review_count: number
}
export interface SphereStats {
  sphere_id: string
  reviews_total: number
  retention: number
  weakness: number
}
export interface Weakness { top: SphereStats[] }

// --- Mock prompt --------------------------------------------------------
export interface MockPrompt {
  text: string
  cards_used: string[]
  estimated_minutes: number
}

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

  auth: {
    register: (email: string, password: string) =>
      call<User>('/api/auth/register', post({ email, password })),
    login: (email: string, password: string) =>
      call<AccessToken>('/api/auth/login', post({ email, password })),
    refresh: () => call<AccessToken>('/api/auth/refresh', post()),
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
  },

  mock: {
    prompt: (body: {
      modules?: number[]; spheres?: string[]; difficulty_min?: number;
      difficulty_max?: number; count?: number; duration_minutes?: number;
      weakness_focus?: boolean; seed?: number
    }) => call<MockPrompt>('/api/mock/prompt', post(body)),
  },
}
