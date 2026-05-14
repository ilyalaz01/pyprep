/**
 * CalendarHeatmap — GitHub-contributions-style activity grid.
 *
 * 13 weeks × 7 days. Rightmost column = current (partial) week, anchored
 * to the last date in `data`. Day rows: Sun top, Sat bottom. Cells
 * outside the data window render transparent (visually absent, not zero).
 *
 * Hand-rolled SVG per ADR-025 — no chart library. Saturation scale: 5
 * monochrome steps on --color-fg-muted, +1 zero step on --color-bg-elevated.
 * Anti-Duolingo discipline: no green/yellow/red gradient, no streak
 * gamification, no shame copy for empty days.
 */
import type { DailyStat } from '../lib/types'
import { formatShortDate, formatShortMonth } from '../lib/format-date'

const CELL = 10
const STRIDE = 12 // cell (10) + gap (2)
const COLS = 13
const ROWS = 7
const LABEL_GUTTER_X = 24
const VIEWBOX_W = LABEL_GUTTER_X + COLS * STRIDE
const VIEWBOX_H = ROWS * STRIDE + 14 // grid + month-label row

interface Props {
  data: DailyStat[]
  ariaLabel?: string
}

export function CalendarHeatmap({ data, ariaLabel }: Props) {
  if (data.length === 0) return null

  // Anchor the rightmost column to the last entry's date. Sourcing the
  // anchor from data (not new Date()) keeps the component deterministic
  // for tests and resilient to clock skew between client and server.
  const anchorIso = data[data.length - 1].date
  const anchor = new Date(`${anchorIso}T00:00:00Z`)
  const anchorRow = anchor.getUTCDay() // 0=Sun..6=Sat

  // Map data by ISO date for O(1) lookup as the grid walks.
  const byDate = new Map<string, DailyStat>()
  for (const d of data) byDate.set(d.date, d)

  const maxReviews = Math.max(0, ...data.map((d) => d.reviews_total))
  // step = ceil(max/4) with a floor of 1; fallback 1 if no data.
  const step = Math.max(1, Math.ceil((maxReviews || 4) / 4))

  // Build a flat list of cell descriptors so the JSX is a single map.
  const cells: CellDesc[] = []
  const monthLabels: { col: number; label: string }[] = []
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const delta = (COLS - 1 - col) * 7 + (anchorRow - row)
      const inWindow = delta >= 0 && delta < data.length
      const iso = inWindow ? isoMinusDays(anchor, delta) : null
      const stat = iso ? byDate.get(iso) ?? null : null
      cells.push({ col, row, iso, stat })
      // First Sun of a new month → label that column. Row 0 only.
      if (row === 0 && stat) {
        const dom = parseUTCDate(stat.date).getUTCDate()
        if (dom <= 7) monthLabels.push({ col, label: formatShortMonth(stat.date) })
      }
    }
  }

  const label =
    ariaLabel ??
    `Daily activity heatmap, ${data.length} days, max ${maxReviews} reviews on a single day`

  return (
    <svg
      data-testid="calendar-heatmap"
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      className="w-full h-auto block"
      role="img"
      aria-label={label}
    >
      {/* Day-of-week labels (Mon/Wed/Fri only — avoids crowding). */}
      {[1, 3, 5].map((row) => (
        <text
          key={row}
          x={0}
          y={row * STRIDE + CELL / 2 + 3}
          className="font-mono fill-[color:var(--color-fg-subtle)]"
          fontSize="8"
        >
          {dayShort(row)}
        </text>
      ))}

      {cells.map(({ col, row, iso, stat }) => (
        <Cell key={`${col}-${row}`} col={col} row={row} iso={iso} stat={stat} step={step} />
      ))}

      {monthLabels.map(({ col, label: m }) => (
        <text
          key={col}
          x={LABEL_GUTTER_X + col * STRIDE}
          y={ROWS * STRIDE + 10}
          className="font-mono fill-[color:var(--color-fg-subtle)]"
          fontSize="8"
        >
          {m}
        </text>
      ))}
    </svg>
  )
}

interface CellDesc {
  col: number
  row: number
  iso: string | null
  stat: DailyStat | null
}

function Cell({ col, row, iso, stat, step }: CellDesc & { step: number }) {
  const x = LABEL_GUTTER_X + col * STRIDE
  const y = row * STRIDE
  if (!iso) {
    return <rect x={x} y={y} width={CELL} height={CELL} rx={1} ry={1} fill="transparent" />
  }
  const count = stat?.reviews_total ?? 0
  const fill = count === 0 ? 'var(--color-bg-elevated)' : 'var(--color-fg-muted)'
  const opacity = count === 0 ? 1 : bucketOpacity(count, step)
  const title =
    count === 0
      ? `${formatShortDate(iso)}: no reviews`
      : `${formatShortDate(iso)}: ${count} ${count === 1 ? 'review' : 'reviews'}`
  return (
    <rect
      x={x}
      y={y}
      width={CELL}
      height={CELL}
      rx={1}
      ry={1}
      fill={fill}
      fillOpacity={opacity}
    >
      <title>{title}</title>
    </rect>
  )
}

function bucketOpacity(count: number, step: number): number {
  if (count <= step) return 0.25
  if (count <= 2 * step) return 0.5
  if (count <= 3 * step) return 0.75
  return 1
}

function isoMinusDays(anchor: Date, delta: number): string {
  const d = new Date(anchor)
  d.setUTCDate(d.getUTCDate() - delta)
  return d.toISOString().slice(0, 10)
}

function parseUTCDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

function dayShort(row: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][row]
}
