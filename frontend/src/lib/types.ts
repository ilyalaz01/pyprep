/**
 * API response/request types — hand-typed against the backend OpenAPI
 * surface at `/api/openapi.json`. Kept separate from `api.ts` so the
 * endpoint surface stays under the 150-LOC budget and types group by
 * domain rather than by route.
 */

// --- Health (PUBLIC) ----------------------------------------------------
export interface Health {
  status: string
  version: string
  db_ok: boolean
}

// --- Config (PUBLIC, ADR-014) ------------------------------------------
export interface Config {
  single_user: boolean
  version: string
  /** Populated only when single_user=true; null in multi-user deployments. */
  single_user_email: string | null
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
export interface ModuleSummary {
  module_id: number
  sphere_ids: string[]
  /** Sum of cards across all spheres in this module. */
  card_count: number
}
export interface ModulesList { modules: ModuleSummary[] }
export interface SphereSummary {
  sphere_id: string
  card_count: number
  lesson_present: boolean
  lesson_title: string | null
}
export interface ModuleDetail {
  module_id: number
  sphere_ids: string[]
  spheres: SphereSummary[]
}
export interface Lesson {
  sphere_id: string
  module_id: number
  lesson_md: string  // body only — frontmatter parsed into the lesson_* fields
  card_count: number
  lesson_title: string | null
  lesson_estimated_minutes: number | null
  lesson_tags: string[]
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
  /** Total cards authored for the sphere; null when no sphere_id was set
   *  (global review mode). T5.10 fix lets SessionPage tell "no cards yet"
   *  from "caught up for today" when queue comes back empty. */
  total_cards_in_sphere: number | null
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
  // P7.T7.1 / ADR-027: wall-clock session time, integer seconds.
  // Sum of (ended_at - started_at) across finished sessions; abandoned
  // sessions (ended_at IS NULL) excluded.
  total_seconds: number
}
export interface SphereStats {
  sphere_id: string
  reviews_total: number
  retention: number
  weakness: number
  lesson_title: string | null
}
export interface Weakness { top: SphereStats[] }

// P7.T7.2 — per-module + 30-day rolling chart.
export interface ModuleStats {
  module_id: number
  reviews_total: number
  retention: number
}
export interface PerModule { modules: ModuleStats[] }

export interface DailyStat {
  // ISO date string (YYYY-MM-DD); Pydantic serializes dt.date this way.
  date: string
  reviews_total: number
  retention: number
}
export interface Daily { days: DailyStat[] }

// --- Mock prompt --------------------------------------------------------
export interface MockPrompt {
  text: string
  cards_used: string[]
  estimated_minutes: number
}
