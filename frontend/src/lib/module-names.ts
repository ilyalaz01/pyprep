/**
 * MODULE_NAMES — human labels for the 4 PyPrep modules.
 *
 * Source of truth: PRD §7. The backend `/api/modules` endpoint only
 * lists modules that have content, so the SPA has to know the full
 * roll-call independently. Used by:
 *   - ModulesList (home dashboard, "no content yet" rows for 2-4)
 *   - ModuleDetailPage (h1 — eyebrow stays "MODULE N" as the address)
 *
 * Adding a new module? Add the row here, then add it to `content/`
 * and `/api/modules` will pick it up automatically.
 */
export const MODULE_NAMES: Record<number, string> = {
  1: 'Python Core & OOP',
  2: 'Automation, Scripting & Infrastructure',
  3: 'Testing & QA',
  4: 'Linux, Docker, SQL & Git',
}
