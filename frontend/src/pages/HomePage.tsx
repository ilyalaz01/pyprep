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

export function HomePage() {
  const modules = useQuery({ queryKey: ['modules'], queryFn: api.modules.list })

  return (
    <section className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      </header>

      <HomeDashboard />

      <Section title="Modules">
        <ModulesList data={modules.data ?? null} />
      </Section>
    </section>
  )
}
