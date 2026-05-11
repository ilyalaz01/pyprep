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
 */
import type { Rating } from '../lib/session-queue'

interface RatingBarProps {
  onRate: (rating: Rating) => void
  disabled?: boolean
}

interface Choice {
  rating: Rating
  label: string
  digit: string
  /** One-word at-a-glance hint (T5.10.5): teaches FSRS semantics
   *  without an Anki-style minute table that would mislead. */
  caption: string
  /** Native browser tooltip on hover/focus — fuller phrasing of
   *  the same idea as `caption`. */
  title: string
  variant: string
}

const CHOICES: readonly Choice[] = [
  {
    rating: 1, label: 'Again', digit: '1',
    caption: 'soon',
    title: 'Show this card again soon',
    variant:
      'border border-[color:var(--color-danger)] ' +
      'text-[color:var(--color-danger)] ' +
      'hover:bg-[color:var(--color-danger)]/10',
  },
  {
    rating: 2, label: 'Hard', digit: '2',
    caption: 'tougher',
    title: 'You struggled but recalled it',
    variant:
      'border border-[color:var(--color-warn)] ' +
      'text-[color:var(--color-warn)] ' +
      'hover:bg-[color:var(--color-warn)]/10',
  },
  {
    rating: 3, label: 'Good', digit: '3',
    caption: 'default',
    title: 'You recalled it with some effort',
    variant:
      'border border-[color:var(--color-good-muted)] ' +
      'text-[color:var(--color-good-muted)] ' +
      'hover:bg-[color:var(--color-good-muted)]/10',
  },
  {
    rating: 4, label: 'Easy', digit: '4',
    caption: 'knew it',
    title: 'Knew it cold, schedule further out',
    variant:
      'border border-[color:var(--color-good)] ' +
      'text-[color:var(--color-good)] ' +
      'hover:bg-[color:var(--color-good)]/10',
  },
] as const

export function RatingBar({ onRate, disabled = false }: RatingBarProps) {
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Rate this card">
      {CHOICES.map((c) => (
        <button
          key={c.rating}
          type="button"
          disabled={disabled}
          onClick={() => onRate(c.rating)}
          aria-label={`${c.label} (key ${c.digit})`}
          title={c.title}
          className={[
            'flex flex-col items-center justify-center gap-0.5 rounded',
            'h-16 px-3 text-sm font-medium bg-transparent',
            'transition-[color,background-color,border-color] ' +
              'duration-120 ease-(--ease-out-quart)',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
            'focus-visible:outline-[color:var(--color-border-strong)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            c.variant,
          ].join(' ')}
        >
          <span>{c.label}</span>
          <span className="text-[10px] text-[color:var(--color-fg-subtle)]">
            {c.caption}
          </span>
          <span
            aria-hidden="true"
            className="font-mono text-[10px] text-[color:var(--color-fg-subtle)]"
          >
            {c.digit}
          </span>
        </button>
      ))}
    </div>
  )
}
