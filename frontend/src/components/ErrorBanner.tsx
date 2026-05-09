/**
 * ErrorBanner — full-form-width error message, used above the form for
 * credential errors and other "the whole submission failed" cases.
 * Per-field validation errors use FormField's inline error slot instead.
 *
 * `role="alert"` for screen readers; carries an icon glyph plus the
 * danger-tinted background, so the signal is not color-only.
 */
import type { ReactNode } from 'react'

interface ErrorBannerProps {
  children: ReactNode
}

export function ErrorBanner({ children }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-2 rounded px-3 py-2 text-sm',
        'border border-[color:var(--color-danger)]',
        'bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg)]',
      ].join(' ')}
    >
      <span aria-hidden="true" className="text-[color:var(--color-danger)]">
        ▲
      </span>
      <span>{children}</span>
    </div>
  )
}
