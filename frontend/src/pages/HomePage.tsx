/**
 * /home — landing route after login.
 *
 * T4.4 ships the real layout: dashboard sections (continue / review queue
 * / weakness) + modules list (4 entries, dimmed when content unavailable).
 * Visual weight stays on the data; chrome is intentionally thin.
 */
import { useQuery } from '@tanstack/react-query'

import { HomeDashboard } from '../components/HomeDashboard'
import { ModulesList } from '../components/ModulesList'
import { Section } from '../components/Section'
import { api } from '../lib/api'
import { useCurrentUser } from '../lib/use-current-user'

export function HomePage() {
  const user = useCurrentUser()
  const modules = useQuery({ queryKey: ['modules'], queryFn: api.modules.list })

  return (
    <section className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        {user && (
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Signed in as <span className="text-[color:var(--color-fg)]">{user.email}</span>
          </p>
        )}
      </header>

      <HomeDashboard />

      <Section title="Modules">
        <ModulesList data={modules.data ?? null} />
      </Section>
    </section>
  )
}
