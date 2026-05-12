/**
 * P7.T7.8 — WeaknessWidget standalone tests.
 *
 * Parent-level rendering through HomeDashboard is covered by
 * HomeDashboard.test.tsx (unchanged after extraction). This file
 * pins the widget's own contract: loading/error/empty/ready states,
 * title prop, topN prop, and the /stats path where the widget is
 * always mounted (empty-state must render gracefully).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'

import { WeaknessWidget } from './WeaknessWidget'

const json = (b: unknown, s = 200): Response =>
  new Response(JSON.stringify(b), { status: s })

function stubFetch(body: unknown, opts: { fail?: boolean; pending?: boolean } = {}) {
  vi.stubGlobal('fetch', vi.fn(async () => {
    if (opts.pending) return new Promise<Response>(() => {})
    if (opts.fail) return new Response('boom', { status: 500 })
    return json(body)
  }))
}

function renderWidget(props: React.ComponentProps<typeof WeaknessWidget> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <WeaknessWidget {...props} />
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
afterEach(() => vi.unstubAllGlobals())

describe('WeaknessWidget — async states', () => {
  test('loading shows skeleton', () => {
    stubFetch(null, { pending: true })
    renderWidget()
    expect(screen.getByTestId('weakness-skeleton')).toBeInTheDocument()
  })

  test('error renders quiet inline note, not a page-level banner', async () => {
    stubFetch(null, { fail: true })
    renderWidget()
    expect(await screen.findByTestId('weakness-quiet')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('empty top: calm "keep practicing" copy', async () => {
    stubFetch({ top: [] })
    renderWidget()
    expect(await screen.findByTestId('weakness-empty')).toBeInTheDocument()
    expect(
      screen.getByText(/no weak spheres yet\. keep practicing\./i),
    ).toBeInTheDocument()
  })

  test('ready: rows with retention% on right', async () => {
    stubFetch({
      top: [
        { sphere_id: 'm1-s4', reviews_total: 8, retention: 0.5, weakness: 0.4, lesson_title: null },
        { sphere_id: 'm1-s5', reviews_total: 6, retention: 0.66, weakness: 0.3, lesson_title: 'Generators' },
      ],
    })
    renderWidget()
    await screen.findByTestId('weakness-list')
    expect(screen.getByText('m1-s4')).toBeInTheDocument()
    expect(screen.getByText(/50% retention/)).toBeInTheDocument()
    expect(screen.getByText('Generators')).toBeInTheDocument()
    expect(screen.getByText(/66% retention/)).toBeInTheDocument()
  })

  test('lesson_title primary + sphere_id caption when title available', async () => {
    stubFetch({
      top: [{
        sphere_id: 'm1-s4', reviews_total: 8, retention: 0.5,
        weakness: 0.4, lesson_title: 'Closures and decorators',
      }],
    })
    renderWidget()
    await screen.findByText(/closures and decorators/i)
    expect(screen.getByText('m1-s4')).toBeInTheDocument()
  })
})

describe('WeaknessWidget — props', () => {
  test('default section title is "Top 3 weakness areas"', async () => {
    stubFetch({ top: [] })
    renderWidget()
    expect(await screen.findByText(/top 3 weakness areas/i)).toBeInTheDocument()
  })

  test('custom title prop overrides default', async () => {
    stubFetch({ top: [] })
    renderWidget({ title: 'Where to focus' })
    expect(await screen.findByText(/where to focus/i)).toBeInTheDocument()
  })

  test('topN prop is reflected in the request URL', async () => {
    const spy = vi.fn(async () => json({ top: [] }))
    vi.stubGlobal('fetch', spy)
    renderWidget({ topN: 5 })
    await waitFor(() => expect(spy).toHaveBeenCalled())
    const firstCall = spy.mock.calls[0] as unknown as [string]
    expect(String(firstCall[0])).toContain('/api/stats/me/weakness')
    expect(String(firstCall[0])).toContain('n=5')
  })
})

describe('WeaknessWidget — anti-Duolingo discipline', () => {
  test('no shame copy on low-retention rows', async () => {
    stubFetch({
      top: [{
        sphere_id: 'm1-s0', reviews_total: 10, retention: 0.1,
        weakness: 0.9, lesson_title: 'Fundamentals',
      }],
    })
    const { container } = renderWidget()
    await screen.findByTestId('weakness-list')
    const text = container.textContent?.toLowerCase() ?? ''
    for (const banned of [
      'struggling', 'failing', 'needs work', 'poor', 'bad',
      'you should', "you haven't",
    ]) {
      expect(text).not.toContain(banned)
    }
  })

  test('no gamification glyphs', async () => {
    stubFetch({
      top: [
        { sphere_id: 'm1-s0', reviews_total: 12, retention: 0.5, weakness: 0.4, lesson_title: null },
      ],
    })
    const { container } = renderWidget()
    await screen.findByTestId('weakness-list')
    for (const banned of ['🔥', '✨', '🎉', '🏆', '🥇', '⭐', '💯']) {
      expect(container.textContent ?? '').not.toContain(banned)
    }
  })
})
