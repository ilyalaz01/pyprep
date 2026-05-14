/**
 * icons — hand-rolled inline SVG icon set.
 *
 * Path data lifted from Lucide (MIT-licensed). Each icon renders an
 * <svg> at size 16 (props.size overrideable), stroke="currentColor",
 * stroke-width=2, stroke-linecap+linejoin=round. Color inherits from
 * CSS via `color:` / `text-` Tailwind utilities.
 *
 * Why not lucide-react: 4 icons doesn't justify a dependency (~12 KB
 * gzip, peer-maintenance surface). ADR-025 spirit (hand-rolled SVG,
 * no chart libraries) extends naturally to a small icon vocabulary.
 * Migration to lucide-react if vocabulary grows past ~10 icons is
 * zero-cost (same paths).
 *
 * Icons currently exported: Check, Clock, Calendar, Sparkles —
 * used by OverviewCards tiles.
 *
 * Anti-Duolingo discipline: NO Flame icon (codified). If a future need
 * for Flame surfaces, surface to owner for explicit design review
 * before adding — it conflicts with established streak-discipline
 * (OverviewCards JSDoc).
 */
import type { SVGProps } from 'react'

interface IconProps {
  size?: number
  className?: string
  'aria-hidden'?: boolean
}

function base(size: number, className: string | undefined, ariaHidden: boolean): SVGProps<SVGSVGElement> {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': ariaHidden,
  }
}

export function Check({ size = 16, className, 'aria-hidden': aria = true }: IconProps) {
  return (
    <svg {...base(size, className, aria)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function Clock({ size = 16, className, 'aria-hidden': aria = true }: IconProps) {
  return (
    <svg {...base(size, className, aria)}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function Calendar({ size = 16, className, 'aria-hidden': aria = true }: IconProps) {
  return (
    <svg {...base(size, className, aria)}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}

export function Sparkles({ size = 16, className, 'aria-hidden': aria = true }: IconProps) {
  return (
    <svg {...base(size, className, aria)}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  )
}
