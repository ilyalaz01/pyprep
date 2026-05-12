/**
 * /stats — stats & weakness dashboard.
 *
 * T7.4 scaffolds the route with a four-branch state machine:
 *   loading  → SessionPage-style skeleton, aria-hidden
 *   error    → Banner alert + Retry button
 *   empty    → calm "Stats appear here…" + Start CTA (owner-clarified
 *              anti-Duolingo empty state — see Phase 7 brief §B)
 *   ready    → renders the dashboard (currently a placeholder; T7.5
 *              swaps in overview cards, T7.6 the per-module table,
 *              T7.7 the daily chart, T7.8 the weakness widget)
 *
 * The empty/ready branch divides on `overview.reviews_total === 0`.
 * The number itself is the honest signal: zero reviews means nothing
 * to aggregate; show the CTA. No shame copy, no streak guilt, no
 * "you haven't done anything yet" framing.
 */
import { useQuery } from '@tanstack/react-query'

import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { DailyChart } from '../components/DailyChart'
import { LinkButton } from '../components/LinkButton'
import { OverviewCards } from '../components/OverviewCards'
import { PerModuleTable } from '../components/PerModuleTable'
import { Section } from '../components/Section'
import { api } from '../lib/api'
import type { Overview } from '../lib/types'

export function StatsPage() {
  const overview = useQuery({
    queryKey: ['stats', 'me'], queryFn: api.stats.me,
  })
  return (
    <section className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
      </header>
      <StatsBody
        isLoading={overview.isLoading}
        isError={overview.isError}
        data={overview.data}
        error={overview.error}
        onRetry={() => void overview.refetch()}
      />
    </section>
  )
}

interface BodyProps {
  isLoading: boolean
  isError: boolean
  data: Overview | undefined
  error: Error | null
  onRetry: () => void
}

function StatsBody({ isLoading, isError, data, error, onRetry }: BodyProps) {
  if (isLoading) return <StatsSkeleton />
  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Banner variant="error">
          {error?.message ?? "Couldn't load stats."}
        </Banner>
        <Button variant="secondary" onClick={onRetry}>Retry</Button>
      </div>
    )
  }
  if (data.reviews_total === 0) return <StatsEmpty />
  return <StatsReady data={data} />
}

function StatsSkeleton() {
  return (
    <div data-testid="stats-skeleton" className="space-y-3" aria-hidden="true">
      <div className="h-4 w-2/3 bg-[color:var(--color-bg-elevated)] rounded" />
      <div className="h-4 w-full bg-[color:var(--color-bg-elevated)] rounded" />
      <div className="h-4 w-5/6 bg-[color:var(--color-bg-elevated)] rounded" />
    </div>
  )
}

function StatsEmpty() {
  // Anti-Duolingo discipline (PRODUCT.md principle 1): no shame copy,
  // no "you haven't done X yet", no missing-day guilt. Calm fact +
  // single CTA back to the surface where the user picks a sphere.
  return (
    <div data-testid="stats-empty" className="max-w-md space-y-6">
      <p className="text-sm text-[color:var(--color-fg)]">
        Stats appear here after your first session.
      </p>
      <LinkButton variant="primary" to="/home">
        Start a session
      </LinkButton>
    </div>
  )
}

function StatsReady({ data }: { data: Overview }) {
  // T7.5 OverviewCards · T7.6 PerModuleTable · T7.7 DailyChart.
  // T7.8 will add the weakness widget below.
  return (
    <div data-testid="stats-ready" className="space-y-10">
      <OverviewCards data={data} />
      <Section title="By module">
        <PerModuleTable />
      </Section>
      <Section title="Activity, last 30 days">
        <DailyChart />
      </Section>
    </div>
  )
}
