/**
 * Input — single-line text input. Focus ring matches Button.
 *
 * `invalid` (boolean) outlines with --color-danger. Pair with FormField
 * for label + per-field error message.
 */
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ invalid = false, className = '', ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={[
        'block w-full h-9 px-3 rounded text-sm',
        'bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg)]',
        'border',
        invalid
          ? 'border-[color:var(--color-danger)]'
          : 'border-[color:var(--color-border)]',
        'placeholder:text-[color:var(--color-fg-subtle)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        invalid
          ? 'focus-visible:outline-[color:var(--color-danger)]'
          : 'focus-visible:outline-[color:var(--color-border-strong)]',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'transition-[border-color,outline-color] duration-120',
        className,
      ].join(' ')}
      {...rest}
    />
  )
}
