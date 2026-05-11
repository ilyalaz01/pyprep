/**
 * RatingHelp — the "Rate this card" visible label paired with an
 * info-icon that opens a tooltip listing all four FSRS rating
 * meanings. Extracted from RatingBar so the rating buttons file
 * stays under the 150-LOC budget.
 *
 * Discovery affordance for new users. Per-button `title` on each
 * RatingBar button remains as the secondary refresher-hint.
 *
 * aria-describedby on the icon points at the tooltip element using
 * the T4.5.2 FormField pattern — screen readers announce tooltip
 * text when focus reaches the icon. The tooltip stays in the DOM
 * at all times; visibility is gated via `data-open` for testability
 * and `invisible` + `opacity-0` for the sighted-user experience.
 */
import { useId, useState } from 'react'

interface RatingExplanation {
  label: string
  body: string
}

const EXPLANATIONS: readonly RatingExplanation[] = [
  { label: 'Again', body: "shown again soon, you didn't recall it" },
  { label: 'Hard',  body: 'you struggled but recalled it' },
  { label: 'Good',  body: 'recalled with some effort (default)' },
  { label: 'Easy',  body: 'knew it cold, schedule further out' },
] as const

export function RatingHelp() {
  const tooltipId = useId()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const open = hovered || focused
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-[color:var(--color-fg-muted)]">
        Rate this card
      </span>
      <span className="relative inline-flex">
        <button
          type="button"
          aria-label="What do these ratings mean?"
          aria-describedby={tooltipId}
          aria-expanded={open}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={[
            'inline-flex h-4 w-4 items-center justify-center rounded-full',
            'text-[10px] font-medium leading-none',
            'bg-[color:var(--color-fg-subtle)] text-[color:var(--color-bg-elevated)]',
            'transition-opacity duration-120 ease-(--ease-out-quart)',
            'hover:opacity-90',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
            'focus-visible:outline-[color:var(--color-border-strong)]',
          ].join(' ')}
        >
          ?
        </button>
        <span
          id={tooltipId}
          role="tooltip"
          data-open={open ? 'true' : 'false'}
          className={[
            'absolute left-0 top-full z-10 mt-2 w-72 max-w-[80vw]',
            'rounded border p-3 text-xs leading-relaxed',
            'border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]',
            'text-[color:var(--color-fg-muted)]',
            'shadow-sm pointer-events-none',
            'transition-opacity duration-120 ease-(--ease-out-quart)',
            open ? 'opacity-100' : 'opacity-0 invisible',
          ].join(' ')}
        >
          <ul className="space-y-1">
            {EXPLANATIONS.map((e) => (
              <li key={e.label}>
                <span className="font-semibold text-[color:var(--color-fg)]">
                  {e.label}
                </span>
                {': '}{e.body}
              </li>
            ))}
          </ul>
        </span>
      </span>
    </div>
  )
}
