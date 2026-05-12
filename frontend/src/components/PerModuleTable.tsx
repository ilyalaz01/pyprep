/**
 * PerModuleTable — one row per PyPrep module on /stats.
 *
 * Reuses the ModulesList aesthetic (divide-y rows, dimmed for
 * not-yet-applicable, click → /modules/$moduleId). Same one-line shape:
 * module label on the left, meta on the right. A thin 2px bar at the
 * bottom of each row encodes retention as width (monochrome — color
 * is never the sole signal; the % text on the right is the honest
 * number). Per DESIGN.md, no shadows, no rounded chrome.
 *
 * Backend `/api/stats/me/per-module` (T7.2) returns only the modules
 * the user has reviewed. Modules absent from the response render as
 * dimmed "no reviews yet" — same visible-but-not-yet contract as the
 * home ModulesList for empty modules.
 *
 * Self-contained query: PerModuleTable owns its own useQuery so
 * StatsPage's state machine stays driven by the overview signal.
 * Loading + error states inside this component are quiet (no banner
 * — a stats slice failing shouldn't dominate the page).
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { api } from '../lib/api'
import { MODULE_NAMES } from '../lib/module-names'
import type { ModuleStats } from '../lib/types'

export function PerModuleTable() {
  const q = useQuery({
    queryKey: ['stats', 'per-module'],
    queryFn: api.stats.perModule,
  })

  if (q.isLoading) return <PerModuleSkeleton />
  if (q.isError || !q.data) return <PerModuleQuiet message="Couldn't load module breakdown." />

  const byId = new Map(q.data.modules.map((m) => [m.module_id, m]))
  return (
    <ul
      data-testid="per-module-table"
      className="divide-y divide-[color:var(--color-border)]"
    >
      {Object.entries(MODULE_NAMES).map(([idStr, name]) => {
        const id = Number(idStr)
        return (
          <li key={id}>
            <PerModuleRow moduleId={id} name={name} stats={byId.get(id)} />
          </li>
        )
      })}
    </ul>
  )
}

interface RowProps {
  moduleId: number
  name: string
  stats: ModuleStats | undefined
}

function PerModuleRow({ moduleId, name, stats }: RowProps) {
  if (!stats || stats.reviews_total === 0) {
    // Dimmed, inert. Matches ModulesList's "no content yet" shape.
    return (
      <div
        data-tile={`module-${moduleId}`}
        aria-disabled="true"
        className="flex items-baseline justify-between py-3 text-[color:var(--color-fg-subtle)]"
      >
        <span className="text-sm">
          <span className="font-medium">Module {moduleId}:</span> {name}
        </span>
        <span className="text-xs">no reviews yet</span>
      </div>
    )
  }
  const pct = Math.round(Math.max(0, Math.min(1, stats.retention)) * 100)
  const reviews = stats.reviews_total
  const meta = `${reviews} ${reviews === 1 ? 'review' : 'reviews'} · ${pct}% retention`
  return (
    <Link
      to="/modules/$moduleId"
      params={{ moduleId: String(moduleId) }}
      data-tile={`module-${moduleId}`}
      className={[
        'block py-3 -mx-2 px-2 rounded',
        'text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-elevated)]',
        'transition-colors duration-120',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm">
          <span className="font-medium">Module {moduleId}:</span> {name}
        </span>
        <span className="text-xs tabular-nums text-[color:var(--color-fg-muted)]">
          {meta}
        </span>
      </div>
      <RetentionBar percent={pct} />
    </Link>
  )
}

function RetentionBar({ percent }: { percent: number }) {
  return (
    <div
      aria-hidden="true"
      className="mt-2 h-0.5 bg-[color:var(--color-border)] overflow-hidden rounded-sm"
    >
      <div
        className="h-full bg-[color:var(--color-fg-muted)]"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function PerModuleSkeleton() {
  return (
    <ul
      data-testid="per-module-skeleton"
      aria-hidden="true"
      className="divide-y divide-[color:var(--color-border)]"
    >
      {[1, 2, 3, 4].map((i) => (
        <li key={i} className="py-3">
          <div className="h-4 w-2/3 bg-[color:var(--color-bg-elevated)] rounded" />
        </li>
      ))}
    </ul>
  )
}

function PerModuleQuiet({ message }: { message: string }) {
  return (
    <p
      data-testid="per-module-quiet"
      className="text-sm text-[color:var(--color-fg-subtle)]"
    >
      {message}
    </p>
  )
}
