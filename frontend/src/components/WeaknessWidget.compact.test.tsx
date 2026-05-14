/**
 * Stats-S4 (Phase 10.5): mode='compact' renders a single-line preview
 * for /home dashboard so dashboard and /stats no longer duplicate the
 * same widget at the same density. Extracted to its own file because
 * WeaknessWidget.test.tsx hit the 150-LOC ceiling with these added.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'

import { WeaknessWidget } from './WeaknessWidget'

const json = (b: unknown, s = 200): Response =>
  new Response(JSON.stringify(b), { status: s })

function stubFetch(body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => json(body)))
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

describe('WeaknessWidget — compact mode (Stats-S4)', () => {
  test('renders single-line "Weakest: {title} {N}%" preview', async () => {
    stubFetch({
      top: [{
        sphere_id: 'm1-s4', reviews_total: 8, retention: 0.5,
        weakness: 0.4, lesson_title: 'Closures and decorators',
      }],
    })
    renderWidget({ mode: 'compact' })
    const row = await screen.findByTestId('weakness-compact')
    expect(row).toHaveTextContent(/weakest:/i)
    expect(row).toHaveTextContent('Closures and decorators')
    expect(row).toHaveTextContent('50%')
  })

  test('compact mode renders NO retention bar (single-line preview)', async () => {
    stubFetch({
      top: [{
        sphere_id: 'm1-s4', reviews_total: 8, retention: 0.5,
        weakness: 0.4, lesson_title: 'Closures',
      }],
    })
    renderWidget({ mode: 'compact' })
    await screen.findByTestId('weakness-compact')
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  test('compact mode default section title is "Weakest area" (singular)', async () => {
    stubFetch({ top: [] })
    renderWidget({ mode: 'compact' })
    expect(await screen.findByText(/^weakest area$/i)).toBeInTheDocument()
  })

  test('compact mode requests n=1 from the backend', async () => {
    const spy = vi.fn(async () => json({ top: [] }))
    vi.stubGlobal('fetch', spy)
    renderWidget({ mode: 'compact' })
    await waitFor(() => expect(spy).toHaveBeenCalled())
    const firstCall = spy.mock.calls[0] as unknown as [string]
    expect(String(firstCall[0])).toContain('n=1')
  })
})
