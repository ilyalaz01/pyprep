/**
 * TopBar — persistent app chrome at the top of every authed route.
 *
 *   [PyPrep wordmark]    [Single-user badge?]    [user email · Sign out]
 *
 * No sidebar in MVP-1 (PRODUCT.md "one screen, one task" — chrome stays
 * thin). 56px tall. --color-bg-elevated background, 1px bottom hairline
 * in --color-border.
 */
import { useNavigate } from '@tanstack/react-router'

import { Button } from './Button'
import { clearToken } from '../lib/auth'
import { useConfig } from '../lib/use-config'
import { useCurrentUser } from '../lib/use-current-user'

export function TopBar() {
  const navigate = useNavigate()
  const config = useConfig()
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
      <div className="font-semibold text-base tracking-tight">PyPrep</div>

      {config?.single_user && (
        <span className="text-xs text-[color:var(--color-fg-subtle)]">
          Single-user mode
        </span>
      )}

      <div className="ml-auto flex items-center gap-3">
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
