/**
 * /home — landing route after login. T4.3 ships the welcome + empty
 * state shell; T4.4 will replace the empty state with the real review
 * queue / streak / weakness widgets.
 */
import { useCurrentUser } from '../lib/use-current-user'

export function HomePage() {
  const user = useCurrentUser()

  return (
    <section className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        {user && (
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Signed in as <span className="text-[color:var(--color-fg)]">{user.email}</span>
          </p>
        )}
      </header>

      <div className="rounded border border-dashed border-[color:var(--color-border)] px-6 py-10">
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          Modules and today's review queue will appear here once T4.4 lands.
        </p>
      </div>
    </section>
  )
}
