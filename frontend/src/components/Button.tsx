/**
 * Button — primary | secondary | ghost.
 *
 * No shadows. Focus ring via 2px outline at offset 2px (theme token
 * --color-border-strong). 120ms transition on hover/focus only —
 * NOT on layout properties (DESIGN.md motion law).
 *
 * Each variant uses theme tokens — no magic Tailwind colors.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)] ' +
    'hover:brightness-110 active:brightness-95',
  secondary:
    'bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg)] ' +
    'border border-[color:var(--color-border)] ' +
    'hover:border-[color:var(--color-border-strong)]',
  ghost:
    'bg-transparent text-[color:var(--color-fg-muted)] ' +
    'hover:text-[color:var(--color-fg)]',
}

const SIZE: Record<Size, string> = {
  md: 'h-9 px-4 text-sm',
  sm: 'h-7 px-3 text-xs',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded font-medium',
        'transition-[color,background-color,border-color,filter] duration-120',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'focus-visible:outline-[color:var(--color-border-strong)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT[variant],
        SIZE[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
