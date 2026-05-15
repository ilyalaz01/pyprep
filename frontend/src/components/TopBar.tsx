/**
 * TopBar — persistent app chrome at the top of every authed route.
 *
 *   [PyPrep wordmark→/home]    [Stats→/stats · user email · Sign out]
 *
 * No sidebar in MVP-1 (PRODUCT.md "one screen, one task" — chrome stays
 * thin). 56px tall. --color-bg-elevated background, 1px bottom hairline
 * in --color-border.
 *
 * Wordmark is a link to /home (standard pattern). "Stats" link exposes
 * the analytics route (Batch 5 Phase 10.5 — TopBar is the only
 * universally-mounted surface, so it owns persistent app navigation).
 * No /modules link: Modules surface prominently on /home and
 * wordmark→/home is one click.
 */
import { Link, useNavigate } from '@tanstack/react-router'

import { Button } from './Button'
import { clearToken } from '../lib/auth'
import { useCurrentUser } from '../lib/use-current-user'

export function TopBar() {
  const navigate = useNavigate()
  const user = useCurrentUser()

  function onSignOut(): void {
    clearToken()
    void navigate({ to: '/login' })
  }

  return (
    <header
      className={[
        'h-14 px-6 flex items-center gap-6',
        'bg-[color:var(--color-bg-elevated)]',
        'border-b border-[color:var(--color-border)]',
      ].join(' ')}
    >
      <Link
        to="/home"
        className="text-base font-semibold tracking-tight hover:text-[color:var(--color-fg)] transition-colors duration-120"
      >
        PyPrep
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <Link
          to="/stats"
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors duration-120"
        >
          Stats
        </Link>
        {user && (
          <span className="text-xs text-[color:var(--color-fg-muted)]">
            {user.email}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
