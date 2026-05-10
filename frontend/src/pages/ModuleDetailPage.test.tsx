import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { setToken } from '../lib/auth'
import { renderAt } from '../test/router-fixture'

const ME = { id: 'u1', email: 'me@example.com', created_at: '2026-05-09T00:00:00Z' }
const CONFIG = { single_user: false, version: '1.00', single_user_email: null }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

function mockFetch(routes: Record<string, () => Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString()
      const ordered = Object.entries(routes).sort((a, b) => b[0].length - a[0].length)
      for (const [path, builder] of ordered) {
        if (url.includes(path)) return builder()
      }
      return new Response('not mocked: ' + url, { status: 500 })
    }),
  )
}

beforeEach(() => setToken('eyJ.test.token'))
afterEach(() => vi.unstubAllGlobals())

describe('ModuleDetailPage', () => {
  test('renders sphere list with cards counts and links to lessons', async () => {
    mockFetch({
      '/api/auth/me': () => jsonResponse(ME),
      '/api/config': () => jsonResponse(CONFIG),
      '/api/modules/1': () =>
        jsonResponse({
          module_id: 1,
          sphere_ids: ['m1-s0', 'm1-s1'],
          spheres: [
            { sphere_id: 'm1-s0', card_count: 12, lesson_present: true },
            { sphere_id: 'm1-s1', card_count: 7, lesson_present: false },
          ],
        }),
    })
    renderAt('/modules/1')
    const link = await screen.findByRole('link', { name: /m1-s0/i })
    expect(link).toHaveAttribute('href', '/modules/1/lesson/m1-s0')
    expect(screen.getByText(/12 cards · lesson available/i)).toBeInTheDocument()
    expect(screen.getByText(/7 cards/)).toBeInTheDocument()
  })

  test('sphere row shows lesson_title prominent + sphere_id as caption (T4.5.6)', async () => {
    mockFetch({
      '/api/auth/me': () => jsonResponse(ME),
      '/api/config': () => jsonResponse(CONFIG),
      '/api/modules/1': () =>
        jsonResponse({
          module_id: 1,
          sphere_ids: ['m1-s0'],
          spheres: [
            {
              sphere_id: 'm1-s0',
              card_count: 12,
              lesson_present: true,
              lesson_title: 'Foundations: variables and types',
            },
          ],
        }),
    })
    renderAt('/modules/1')
    expect(
      await screen.findByText(/foundations: variables and types/i),
    ).toBeInTheDocument()
    // sphere_id is still rendered as the technical caption.
    expect(screen.getByText('m1-s0')).toBeInTheDocument()
  })

  test('sphere row falls back to sphere_id when lesson_title is null (T4.5.6)', async () => {
    mockFetch({
      '/api/auth/me': () => jsonResponse(ME),
      '/api/config': () => jsonResponse(CONFIG),
      '/api/modules/1': () =>
        jsonResponse({
          module_id: 1,
          sphere_ids: ['m1-s9'],
          spheres: [
            {
              sphere_id: 'm1-s9',
              card_count: 3,
              lesson_present: false,
              lesson_title: null,
            },
          ],
        }),
    })
    renderAt('/modules/1')
    // No title → sphere_id appears once, in the primary slot.
    const matches = await screen.findAllByText('m1-s9')
    expect(matches).toHaveLength(1)
  })

  test('h1 renders the module name from MODULE_NAMES, not "Module N" (T4.5.5)', async () => {
    mockFetch({
      '/api/auth/me': () => jsonResponse(ME),
      '/api/config': () => jsonResponse(CONFIG),
      '/api/modules/1': () =>
        jsonResponse({ module_id: 1, sphere_ids: [], spheres: [] }),
    })
    renderAt('/modules/1')
    const h1 = await screen.findByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Python Core & OOP')
    // Eyebrow stays as the technical address.
    expect(screen.getByText(/^MODULE 1$/i)).toBeInTheDocument()
  })

  test('error state renders Banner', async () => {
    mockFetch({
      '/api/auth/me': () => jsonResponse(ME),
      '/api/config': () => jsonResponse(CONFIG),
      '/api/modules/999': () => jsonResponse({ error: 'module_not_found', detail: '' }, 404),
    })
    renderAt('/modules/999')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/module 999 not found/i)
  })
})
