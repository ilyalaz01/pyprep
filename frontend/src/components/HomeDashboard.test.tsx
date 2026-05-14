/**
 * HomeDashboard — three sections, conditional renders.
 *
 * Skip semantics tested explicitly because they implement PRODUCT.md
 * principle 1 (don't show empty motivational chrome).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'

import { setLastActive, clearLastActive } from '../lib/last-active'
import { renderInMiniRouter } from '../test/mini-router'
import { HomeDashboard } from './HomeDashboard'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

const overview = (reviews_total: number, retention = 0) =>
  jsonResponse({ reviews_total, retention, streak: 0, xp: 0, orphan_review_count: 0 })
const queue = (...ids: string[]) =>
  jsonResponse({ card_ids: ids, sphere_id: null })

function mockRoutes(routes: Record<string, () => Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString()
      for (const [path, builder] of Object.entries(routes)) {
        if (url.includes(path)) return builder()
      }
      return new Response('not mocked: ' + url, { status: 500 })
    }),
  )
}

function renderDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderInMiniRouter(
    <QueryClientProvider client={qc}>
      <HomeDashboard />
    </QueryClientProvider>,
    [
      '/modules/$moduleId/lesson/$sphereId',
      '/modules/$moduleId/sphere/$sphereId/session',
      '/home',
    ],
  )
}

beforeEach(() => clearLastActive())
afterEach(() => vi.unstubAllGlobals())

describe('HomeDashboard — Continue section', () => {
  test('renders when last-active history exists', async () => {
    setLastActive({ module_id: 1, sphere_id: 'm1-s0' })
    mockRoutes({ '/api/review/queue': () => queue(), '/api/stats/me': () => overview(0) })
    renderDashboard()
    expect(await screen.findByText(/continue where you left off/i)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Module 1.*m1-s0/ })
    expect(link).toHaveAttribute('href', '/modules/1/lesson/m1-s0')
  })

  test('skipped entirely when no last-active history (no empty state)', async () => {
    mockRoutes({ '/api/review/queue': () => queue(), '/api/stats/me': () => overview(0) })
    renderDashboard()
    await screen.findByText(/today's review queue/i) // wait for first section
    expect(screen.queryByText(/continue where you left off/i)).not.toBeInTheDocument()
  })
})

describe('HomeDashboard — Review queue', () => {
  test.each([
    ['with last-active', true, '/modules/1/sphere/m1-s0/session'],
    ['without last-active', false, '/home'],
  ] as const)('Review-now LinkButton %s targets %s', async (_l, hasLA, href) => {
    if (hasLA) setLastActive({ module_id: 1, sphere_id: 'm1-s0' })
    mockRoutes({ '/api/review/queue': () => queue('c1', 'c2'), '/api/stats/me': () => overview(0) })
    renderDashboard()
    const link = await screen.findByRole('link', { name: /review now/i })
    expect(link).toHaveAttribute('href', href)
  })

  test('singular card', async () => {
    mockRoutes({ '/api/review/queue': () => queue('c1'), '/api/stats/me': () => overview(0) })
    renderDashboard()
    expect(await screen.findByText(/1 card due today/i)).toBeInTheDocument()
  })

  test('empty queue: encouraging-not-shaming copy, no Review-now button', async () => {
    mockRoutes({ '/api/review/queue': () => queue(), '/api/stats/me': () => overview(0) })
    renderDashboard()
    expect(await screen.findByText(/nothing due right now/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /review now/i })).not.toBeInTheDocument()
  })
})

describe('HomeDashboard — Weakness section', () => {
  test('skipped when reviews_total < 10 (insufficient signal)', async () => {
    mockRoutes({
      '/api/stats/me/weakness': () => jsonResponse({ top: [] }),
      '/api/review/queue': () => queue(),
      '/api/stats/me': () => overview(5, 0.6),
    })
    renderDashboard()
    await screen.findByText(/today's review queue/i)
    expect(screen.queryByText(/weakness/i)).not.toBeInTheDocument()
  })

  // Stats-S4 (Phase 10.5): /home renders the widget in mode="compact" —
  // single-line "Weakest: {title} {N}%" — to differentiate from /stats'
  // full top-N drill-down. /stats coverage stays in WeaknessWidget.test.tsx.
  test('renders compact preview "Weakest: {title} {N}%" when reviews_total >= 10', async () => {
    // NB: more-specific paths MUST come first — `/api/stats/me` is a
    // substring of `/api/stats/me/weakness`, and the matcher is first-hit-wins.
    mockRoutes({
      '/api/stats/me/weakness': () =>
        jsonResponse({
          top: [
            { sphere_id: 'm1-s4', reviews_total: 8, retention: 0.5, weakness: 0.42, lesson_title: null },
          ],
        }),
      '/api/review/queue': () => queue(),
      '/api/stats/me': () => overview(25, 0.7),
    })
    renderDashboard()
    expect(await screen.findByText(/^weakest area$/i)).toBeInTheDocument()
    expect(await screen.findByTestId('weakness-compact')).toBeInTheDocument()
    expect(screen.getByText(/weakest:/i)).toBeInTheDocument()
    expect(screen.getByText('m1-s4')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  test('compact preview shows lesson_title when available (not sphere_id)', async () => {
    mockRoutes({
      '/api/stats/me/weakness': () =>
        jsonResponse({
          top: [{
            sphere_id: 'm1-s4', reviews_total: 8, retention: 0.5, weakness: 0.42,
            lesson_title: 'Closures and decorators',
          }],
        }),
      '/api/review/queue': () => queue(),
      '/api/stats/me': () => overview(25, 0.7),
    })
    renderDashboard()
    expect(await screen.findByText(/closures and decorators/i)).toBeInTheDocument()
    // Compact preview hides the sphere_id when lesson_title is present.
    expect(screen.queryByText('m1-s4')).toBeNull()
  })

  test('eligible but empty top: shows "keep practicing" copy', async () => {
    mockRoutes({
      '/api/stats/me/weakness': () => jsonResponse({ top: [] }),
      '/api/review/queue': () => queue(),
      '/api/stats/me': () => overview(25, 1.0),
    })
    renderDashboard()
    await waitFor(() =>
      expect(screen.getByText(/no weak spheres yet/i)).toBeInTheDocument(),
    )
  })
})
