/**
 * FormField — label + input + optional inline error message.
 *
 * Pairs with Input. Error text is small, --color-danger, with an
 * implicit icon glyph (▲) so the signal is not color-only — DESIGN.md
 * accessibility requirement.
 */
import type { ReactNode } from 'react'

interface FormFieldProps {
  id: string
  label: string
  error?: string | null
  hint?: string | null
  children: ReactNode
}

export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-[color:var(--color-fg-muted)]"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs text-[color:var(--color-danger)]"
        >
          <span aria-hidden="true">▲</span>
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-[color:var(--color-fg-subtle)]">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
