/**
 * LinkButton — TanStack `<Link>` styled identically to `<Button>`.
 *
 * Use when navigation should look + feel like a button (i.e. it's a
 * primary action, not inline prose). For prose-style hyperlinks inside
 * paragraphs, use a plain `<Link>` with the underline style instead.
 *
 * Variants/sizes mirror Button so the visual rhythm matches in mixed
 * action rows (e.g. LessonActions: primary Button + ghost LinkButton).
 */
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'sm'

interface LinkButtonProps extends LinkProps {
  variant?: Variant
  size?: Size
  children: ReactNode
  className?: string
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

export function LinkButton({
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      className={[
        'inline-flex items-center justify-center gap-2 rounded font-medium',
        'transition-[color,background-color,border-color,filter] duration-120',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'focus-visible:outline-[color:var(--color-border-strong)]',
        VARIANT[variant],
        SIZE[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Link>
  )
}
