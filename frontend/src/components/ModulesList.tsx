/**
 * ModulesList — tight one-line-per-module list.
 *
 * NOT a card grid. PyPrep has 4 total modules; a card grid for 4 items
 * reads as filler. List shape keeps visual weight on the data.
 *
 * Module names are hard-coded from PRD §7 (Modules 1-4). Modules with
 * content render with sphere/card counts and are clickable; modules
 * without content render dimmed and inert ("visible-but-not-yet"
 * contract). Backend `/api/modules` only lists modules that have
 * content; the SPA provides the full roll-call.
 */
import { Link } from '@tanstack/react-router'

import type { ModulesList as ModulesListData } from '../lib/types'

const MODULE_NAMES: Record<number, string> = {
  1: 'Python Core & OOP',
  2: 'Automation, Scripting & Infrastructure',
  3: 'Testing & QA',
  4: 'Linux, Docker, SQL & Git',
}

interface ModulesListProps {
  data: ModulesListData | null
}

export function ModulesList({ data }: ModulesListProps) {
  const byId = new Map((data?.modules ?? []).map((m) => [m.module_id, m]))
  return (
    <ul className="divide-y divide-[color:var(--color-border)]">
      {Object.entries(MODULE_NAMES).map(([idStr, name]) => {
        const id = Number(idStr)
        const summary = byId.get(id)
        return (
          <li key={id}>
            <ModuleRow
              moduleId={id}
              name={name}
              spheres={summary?.sphere_ids.length ?? 0}
              cards={summary?.card_count ?? 0}
              hasContent={summary !== undefined}
            />
          </li>
        )
      })}
    </ul>
  )
}

interface ModuleRowProps {
  moduleId: number
  name: string
  spheres: number
  cards: number
  hasContent: boolean
}

function ModuleRow({ moduleId, name, spheres, cards, hasContent }: ModuleRowProps) {
  const meta = hasContent
    ? `${spheres} sphere${spheres === 1 ? '' : 's'} · ${cards} card${cards === 1 ? '' : 's'}`
    : 'no content yet (Phase 9)'

  if (!hasContent) {
    return (
      <div
        aria-disabled="true"
        className="flex items-baseline justify-between py-3 text-[color:var(--color-fg-subtle)]"
      >
        <span className="text-sm">
          <span className="font-medium">Module {moduleId}:</span> {name}
        </span>
        <span className="text-xs">{meta}</span>
      </div>
    )
  }

  return (
    <Link
      to="/modules/$moduleId"
      params={{ moduleId: String(moduleId) }}
      className={[
        'flex items-baseline justify-between py-3 -mx-2 px-2 rounded',
        'text-[color:var(--color-fg)] hover:bg-[color:var(--color-surface-2)]',
        'transition-colors duration-120',
      ].join(' ')}
    >
      <span className="text-sm">
        <span className="font-medium">Module {moduleId}:</span> {name}
      </span>
      <span className="text-xs text-[color:var(--color-fg-muted)]">
        {meta} <span aria-hidden="true" className="ml-1">→</span>
      </span>
    </Link>
  )
}
