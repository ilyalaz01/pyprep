/**
 * Section — header + content slot. Flat surface; no card chrome.
 *
 * Header style locked at the design-system level so dashboard sections
 * scan as a single rhythm. Per DESIGN.md "vary spacing": the header is
 * tight to its content (mt-3), and sections separate at the parent
 * level via space-y-8.
 */
import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, action, children }: SectionProps) {
  return (
    <section>
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
