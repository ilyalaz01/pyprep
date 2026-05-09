/**
 * /modules/:moduleId — sphere list for one module.
 *
 * Same one-line-per-row pattern as the home ModulesList; different data
 * (spheres within the module instead of modules within the program).
 * Each sphere row links to its lesson reader.
 */
import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { Banner } from '../components/Banner'
import { Section } from '../components/Section'
import { api } from '../lib/api'

export function ModuleDetailPage() {
  const { moduleId } = useParams({ from: '/_auth/modules/$moduleId' })
  const id = Number(moduleId)
  const detail = useQuery({
    queryKey: ['modules', id],
    queryFn: () => api.modules.get(id),
    retry: false,
  })

  if (detail.isError) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-10">
        <Banner variant="error">
          Module {id} not found. <Link to="/home" className="underline">Back to home</Link>
        </Banner>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-[color:var(--color-fg-subtle)]">
          Module {id}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {detail.data?.module_id ? `Module ${detail.data.module_id}` : 'Module'}
        </h1>
      </header>

      <Section title="Spheres">
        {detail.data ? (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {detail.data.spheres.map((s) => (
              <li key={s.sphere_id}>
                <Link
                  to="/modules/$moduleId/lesson/$sphereId"
                  params={{ moduleId: String(id), sphereId: s.sphere_id }}
                  className={[
                    'flex items-baseline justify-between py-3 -mx-2 px-2 rounded',
                    'text-[color:var(--color-fg)] hover:bg-[color:var(--color-surface-2)]',
                    'transition-colors duration-120',
                  ].join(' ')}
                >
                  <span className="text-sm font-medium">{s.sphere_id}</span>
                  <span className="text-xs text-[color:var(--color-fg-muted)]">
                    {s.card_count} card{s.card_count === 1 ? '' : 's'}
                    {s.lesson_present ? ' · lesson available' : ''}
                    <span aria-hidden="true" className="ml-1">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[color:var(--color-fg-muted)]">Loading…</p>
        )}
      </Section>
    </section>
  )
}
