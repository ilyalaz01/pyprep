/**
 * Section — labeled content surface wrapped in subtle card chrome.
 *
 * Container chrome: bg-elevated + low-contrast border + rounded-lg + p-6.
 * Matches CardShell's elevation rhythm so dashboard sections, stats
 * sections, and the in-session card share the same visual surface
 * vocabulary. Per Tier 1.3 design review: containers exist for grouping
 * clarity, not decoration — no drop shadow, no heavy border, restraint
 * mandated.
 *
 * Header (uppercase eyebrow + optional action) sits at the top of the
 * container; content (mt-3) follows.
 */
import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, action, children }: SectionProps) {
  return (
    <section
      className={[
        'bg-[color:var(--color-bg-elevated)]',
        'border border-[color:var(--color-border)]',
        'rounded-lg p-6',
      ].join(' ')}
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-[color:var(--color-fg-subtle)] uppercase tracking-wide">
          {title}
        </h2>
        {action}
      </header>
      <div className="mt-3">{children}</div>
    </section>
  )
}
