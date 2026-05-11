/**
 * RatingBar — the four FSRS rating buttons (Again / Hard / Good / Easy)
 * shown at the bottom of every card after the user has revealed the
 * answer. Mapping pinned by ADR-015: 1=Again, 2=Hard, 3=Good, 4=Easy.
 *
 * Token-pinned outcome colors follow the Anki convention:
 * Again→danger, Hard→warn, Good→good-muted, Easy→good. Two saturation
 * levels of green (good / good-muted) keep restraint without losing
 * positive-feedback semantics — see the index.css comment on
 * --color-good-muted.
 *
 * Keyboard digits 1-4 are rendered as captions; the actual key
 * handling lives at the session-page level (T5.12) so the same
 * keymap can also drive Reveal/Advance.
 *
 * T5.10.5 round-2: discovery affordance moved to the RatingHelp
 * component (visible label + info-icon + tooltip) so this file stays
 * under the 150-LOC budget. Per-button `title` remains as the
 * refresher-hint.
 */
import type { Rating } from '../lib/session-queue'
import { RatingHelp } from './RatingHelp'

interface RatingBarProps {
  onRate: (rating: Rating) => void
  disabled?: boolean
}

interface Choice {
  rating: Rating
  label: string
  digit: string
  /** Native browser tooltip on hover/focus — refresher-hint for
   *  users who know which button they want. Primary discovery is
   *  the icon-tooltip in RatingHelp. */
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

export function RatingBar({ onRate, disabled = false }: RatingBarProps) {
  return (
    <div role="group" aria-label="Rate this card" className="space-y-2">
      <RatingHelp />
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
