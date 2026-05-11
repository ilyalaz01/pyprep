/**
 * RatingBar — the four FSRS rating buttons (Again / Hard / Good / Easy)
 * shown at the bottom of every card after the user has revealed the
 * answer. Mapping pinned by ADR-015: 1=Again, 2=Hard, 3=Good, 4=Easy.
 *
 * Token-pinned outcome colors follow the Anki convention:
 * Again→danger (red), Hard→warn (yellow), Good→good-muted
 * (lower-saturation green), Easy→good (full-saturation green).
 * Two saturation levels of green keep restraint without losing
 * positive-feedback semantics — see the index.css comment on
 * --color-good-muted.
 *
 * Keyboard digits 1-4 are rendered as captions; the actual key
 * handling lives at the session-page level (T5.12) so the same
 * keymap can also drive Reveal/Advance.
 *
 * T5.10.5 round-2: discovery for new users moved from per-button
 * text captions (which cluttered the row) to a single info-icon next
 * to a visible "Rate this card" label. Tooltip lists all four
 * rating meanings; per-button `title` attribute remains as the
 * refresher-hint for users who already know what they want.
 * aria-describedby follows the T4.5.2 FormField pattern so screen
 * readers announce the tooltip text when focus reaches the icon.
 */
import { useId, useState } from 'react'

import type { Rating } from '../lib/session-queue'

interface RatingBarProps {
  onRate: (rating: Rating) => void
  disabled?: boolean
}

interface Choice {
  rating: Rating
  label: string
  digit: string
  /** Native browser tooltip on hover/focus — refresher-hint
   *  for users who already know which button they want. Primary
   *  discovery is the icon-tooltip below. */
  title: string
  variant: string
}

const CHOICES: readonly Choice[] = [
  {
    rating: 1, label: 'Again', digit: '1',
    title: 'Show this card again soon',
    variant:
      'border border-[color:var(--color-danger)] ' +
      'text-[color:var(--color-danger)] ' +
      'hover:bg-[color:var(--color-danger)]/10',
  },
  {
    rating: 2, label: 'Hard', digit: '2',
    title: 'You struggled but recalled it',
    variant:
      'border border-[color:var(--color-warn)] ' +
      'text-[color:var(--color-warn)] ' +
      'hover:bg-[color:var(--color-warn)]/10',
  },
  {
    rating: 3, label: 'Good', digit: '3',
    title: 'You recalled it with some effort',
    variant:
      'border border-[color:var(--color-good-muted)] ' +
      'text-[color:var(--color-good-muted)] ' +
      'hover:bg-[color:var(--color-good-muted)]/10',
  },
  {
    rating: 4, label: 'Easy', digit: '4',
    title: 'Knew it cold, schedule further out',
    variant:
      'border border-[color:var(--color-good)] ' +
      'text-[color:var(--color-good)] ' +
      'hover:bg-[color:var(--color-good)]/10',
  },
] as const

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

export function RatingBar({ onRate, disabled = false }: RatingBarProps) {
  const tooltipId = useId()
  const labelId = useId()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const open = hovered || focused

  return (
    <div role="group" aria-labelledby={labelId} className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          id={labelId}
          className="text-xs font-medium text-[color:var(--color-fg-muted)]"
        >
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
              open ? 'opacity-100' : 'opacity-0',
              open ? '' : 'invisible',
            ].join(' ')}
          >
            <ul className="space-y-1">
              {EXPLANATIONS.map((e) => (
                <li key={e.label}>
                  <span className="font-semibold text-[color:var(--color-fg)]">
                    {e.label}
                  </span>
                  {' — '}{e.body}
                </li>
              ))}
            </ul>
          </span>
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {CHOICES.map((c) => (
          <button
            key={c.rating}
            type="button"
            disabled={disabled}
            onClick={() => onRate(c.rating)}
            aria-label={`${c.label} (key ${c.digit})`}
            title={c.title}
            className={[
              'flex flex-col items-center justify-center gap-1 rounded',
              'h-14 px-3 text-sm font-medium bg-transparent',
              'transition-[color,background-color,border-color] ' +
                'duration-120 ease-(--ease-out-quart)',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
              'focus-visible:outline-[color:var(--color-border-strong)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              c.variant,
            ].join(' ')}
          >
            <span>{c.label}</span>
            <span
              aria-hidden="true"
              className="font-mono text-[10px] text-[color:var(--color-fg-subtle)]"
            >
              {c.digit}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
