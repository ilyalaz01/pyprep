/**
 * Banner — full-form-width status message. Variants: info | error | success.
 *
 * Used above forms or routes for "the whole submission failed / state
 * has changed" cases. Per-field validation lives in FormField.
 *
 * `role="alert"` on error so screen readers announce. info/success use
 * `role="status"` (polite). Each variant carries an icon glyph in
 * addition to color tinting — color is never the sole signal.
 */
import type { ReactNode } from 'react'

export type BannerVariant = 'info' | 'error' | 'success'

interface BannerProps {
  variant?: BannerVariant
  children: ReactNode
}

const VARIANT: Record<BannerVariant, { glyph: string; border: string; ring: string; role: 'alert' | 'status' }> = {
  info:    { glyph: 'i', border: '--color-border-strong', ring: '--color-fg-muted', role: 'status' },
  error:   { glyph: '▲', border: '--color-danger',        ring: '--color-danger',   role: 'alert' },
  success: { glyph: '✓', border: '--color-good',          ring: '--color-good',     role: 'status' },
}

export function Banner({ variant = 'info', children }: BannerProps) {
  const v = VARIANT[variant]
  return (
    <div
      role={v.role}
      className={[
        'flex items-start gap-2 rounded px-3 py-2 text-sm',
        'bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg)]',
        `border border-[color:var(${v.border})]`,
      ].join(' ')}
    >
      <span aria-hidden="true" className={`text-[color:var(${v.ring})]`}>
        {v.glyph}
      </span>
      <span>{children}</span>
    </div>
  )
}
