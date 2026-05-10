/**
 * HomeDashboard — three sections, conditional renders.
 *
 * Skip semantics tested explicitly because they implement PRODUCT.md
 * principle 1 (don't show empty motivational chrome).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'

import { setLastActive, clearLastActive } from '../lib/last-active'
import { HomeDashboard } from './HomeDashboard'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

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

/**
 * Wrap HomeDashboard in a minimal in-memory router so its <Link> calls
 * (T4.5.3: Continue link) can resolve. We don't render the real lesson
 * route — the stub component is enough to satisfy type-checked targets.
 */
function renderDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRoute({ component: () => <Outlet /> })
  const indexRoute = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <HomeDashboard />,
  })
  const lessonStub = createRoute({
    getParentRoute: () => root,
    path: '/modules/$moduleId/lesson/$sphereId',
    component: () => null,
  })
  const tree = root.addChildren([indexRoute, lessonStub])
  const router = createRouter({
    routeTree: tree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => clearLastActive())
afterEach(() => vi.unstubAllGlobals())

describe('HomeDashboard — Continue section', () => {
  test('renders when last-active history exists', async () => {
    setLastActive({ module_id: 1, sphere_id: 'm1-s0' })
    mockRoutes({
      '/api/review/queue': () => jsonResponse({ card_ids: [], sphere_id: null }),
      '/api/stats/me': () =>
        jsonResponse({ reviews_total: 0, retention: 0, streak: 0, xp: 0, orphan_review_count: 0 }),
    })
    renderDashboard()
    expect(await screen.findByText(/continue where you left off/i)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Module 1.*m1-s0/ })
    expect(link).toHaveAttribute('href', '/modules/1/lesson/m1-s0')
  })

  test('skipped entirely when no last-active history (no empty state)', async () => {
    mockRoutes({
      '/api/review/queue': () => jsonResponse({ card_ids: [], sphere_id: null }),
      '/api/stats/me': () =>
        jsonResponse({ reviews_total: 0, retention: 0, streak: 0, xp: 0, orphan_review_count: 0 }),
    })
    renderDashboard()
    await screen.findByText(/today's review queue/i) // wait for first section
    expect(screen.queryByText(/continue where you left off/i)).not.toBeInTheDocument()
  })
})

describe('HomeDashboard — Review queue', () => {
  test('shows count and Review-now action when queue has cards', async () => {
    mockRoutes({
      '/api/review/queue': () =>
        jsonResponse({ card_ids: ['c1', 'c2', 'c3'], sphere_id: null }),
      '/api/stats/me': () =>
        jsonResponse({ reviews_total: 0, retention: 0, streak: 0, xp: 0, orphan_review_count: 0 }),
    })
    renderDashboard()
    expect(await screen.findByText(/3 cards due today/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /review now/i })).toBeInTheDocument()
  })

  test('singular card', async () => {
    mockRoutes({
      '/api/review/queue': () => jsonResponse({ card_ids: ['c1'], sphere_id: null }),
      '/api/stats/me': () =>
        jsonResponse({ reviews_total: 0, retention: 0, streak: 0, xp: 0, orphan_review_count: 0 }),
    })
    renderDashboard()
    expect(await screen.findByText(/1 card due today/i)).toBeInTheDocument()
  })

  test('empty queue: encouraging-not-shaming copy, no Review-now button', async () => {
    mockRoutes({
      '/api/review/queue': () => jsonResponse({ card_ids: [], sphere_id: null }),
      '/api/stats/me': () =>
        jsonResponse({ reviews_total: 0, retention: 0, streak: 0, xp: 0, orphan_review_count: 0 }),
    })
    renderDashboard()
    expect(await screen.findByText(/nothing due right now/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /review now/i })).not.toBeInTheDocument()
  })
})

describe('HomeDashboard — Weakness section', () => {
  test('skipped when reviews_total < 10 (insufficient signal)', async () => {
    mockRoutes({
      '/api/stats/me/weakness': () => jsonResponse({ top: [] }),
      '/api/review/queue': () => jsonResponse({ card_ids: [], sphere_id: null }),
      '/api/stats/me': () =>
        jsonResponse({ reviews_total: 5, retention: 0.6, streak: 0, xp: 0, orphan_review_count: 0 }),
    })
    renderDashboard()
    await screen.findByText(/today's review queue/i)
    expect(screen.queryByText(/weakness/i)).not.toBeInTheDocument()
  })

  test('renders sphere + retention% when reviews_total >= 10', async () => {
    mockRoutes({
      // NB: more-specific paths MUST come first — `/api/stats/me` is a
      // substring of `/api/stats/me/weakness`, and the matcher is
      // first-hit-wins.
      '/api/stats/me/weakness': () =>
        jsonResponse({
          top: [
            { sphere_id: 'm1-s4', reviews_total: 8, retention: 0.5, weakness: 0.42 },
            { sphere_id: 'm1-s5', reviews_total: 6, retention: 0.66, weakness: 0.31 },
          ],
        }),
      '/api/review/queue': () => jsonResponse({ card_ids: [], sphere_id: null }),
      '/api/stats/me': () =>
        jsonResponse({ reviews_total: 25, retention: 0.7, streak: 0, xp: 0, orphan_review_count: 0 }),
    })
    renderDashboard()
    expect(await screen.findByText(/top 3 weakness areas/i)).toBeInTheDocument()
    // The weakness query is `enabled` only after the overview query
    // resolves with reviews_total>=10, so the data lands a tick later
    // than the section header. Use findBy* for the row contents.
    expect(await screen.findByText('m1-s4')).toBeInTheDocument()
    expect(screen.getByText(/50% retention/)).toBeInTheDocument()
    expect(screen.getByText('m1-s5')).toBeInTheDocument()
    expect(screen.getByText(/66% retention/)).toBeInTheDocument()
  })

  test('eligible but empty top: shows "keep practicing" copy', async () => {
    mockRoutes({
      '/api/stats/me/weakness': () => jsonResponse({ top: [] }),
      '/api/review/queue': () => jsonResponse({ card_ids: [], sphere_id: null }),
      '/api/stats/me': () =>
        jsonResponse({ reviews_total: 25, retention: 1.0, streak: 0, xp: 0, orphan_review_count: 0 }),
    })
    renderDashboard()
    await waitFor(() =>
      expect(screen.getByText(/no weak spheres yet/i)).toBeInTheDocument(),
    )
  })
})
