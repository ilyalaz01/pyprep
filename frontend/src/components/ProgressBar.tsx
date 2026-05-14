/**
 * ProgressBar — slim horizontal bar indicating a 0..1 progress value.
 *
 * Generic primitive. Used by CardShell (session position); Tier 1.4 will
 * reuse it for retention bars on /home and /stats. Single fill color +
 * single track color, no gradients, no multi-color stages (gamification
 * creep). Parent controls visual width via className; ProgressBar fills
 * 100% of its parent on the width axis.
 *
 * Accessibility: role="progressbar" + aria-valuenow as 0..100. Pass
 * `ariaLabel` for screen-reader context when the parent has no adjacent
 * visible text labeling the bar.
 */

interface ProgressBarProps {
  value: number
  ariaLabel?: string
  className?: string
}

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

export function ProgressBar({ value, ariaLabel, className }: ProgressBarProps) {
  const pct = Math.round(clamp01(value) * 100)
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={[
        'w-full h-1 rounded-sm overflow-hidden',
        'bg-[color:var(--color-border)]',
        className ?? '',
      ].join(' ').trim()}
    >
      <div
        className={[
          'h-full bg-[color:var(--color-accent)]',
          'transition-[width] duration-150 ease-(--ease-out-quart)',
        ].join(' ')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
