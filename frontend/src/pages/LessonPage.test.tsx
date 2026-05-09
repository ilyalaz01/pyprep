/**
 * LessonPage — branches: loading / error / empty / happy.
 *
 * Shiki highlighting is async-lazy; tests assert it FIRES (the
 * highlighted block carries `data-shiki="true"` once mounted) but
 * tolerate the briefly-unstyled fallback so we don't have to wait for
 * the real WASM tokenizer in unit tests.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { setToken } from '../lib/auth'
import { renderAt } from '../test/router-fixture'

const ME = { id: 'u1', email: 'me@example.com', created_at: '2026-05-09T00:00:00Z' }
const CONFIG = { single_user: false, version: '1.00', single_user_email: null }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

function mockLesson(builder: () => Response | Promise<Response>) {
  const routes = {
    '/api/auth/me': () => jsonResponse(ME),
    '/api/config': () => jsonResponse(CONFIG),
    '/api/modules/1/lesson/m1-s0': builder,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString()
      const ordered = Object.entries(routes).sort((a, b) => b[0].length - a[0].length)
      for (const [path, b] of ordered) if (url.includes(path)) return b()
      return new Response('not mocked: ' + url, { status: 500 })
    }),
  )
}

function lessonOk(lesson_md: string, card_count = 5) {
  return jsonResponse({ sphere_id: 'm1-s0', module_id: 1, lesson_md, card_count })
}

beforeEach(() => setToken('eyJ.test.token'))
afterEach(() => vi.unstubAllGlobals())

const SAMPLE_MD = `# Hidden h1

## A heading

Some paragraph with \`inline code\` in it.

\`\`\`python
def add(a, b):
    return a + b
\`\`\`

| col | val |
| --- | --- |
| x   | 1   |

> A quote line.
`

describe('LessonPage — happy path', () => {
  test('renders headings, inline code, and a fenced code block', async () => {
    mockLesson(() => lessonOk(SAMPLE_MD))
    renderAt('/modules/1/lesson/m1-s0')
    expect(await screen.findByRole('heading', { name: /a heading/i })).toBeInTheDocument()
    expect(screen.getByText('inline code')).toBeInTheDocument()
    expect(screen.getByText(/def add\(a, b\):/)).toBeInTheDocument()
  })

  test('Start review session button renders enabled when card_count > 0', async () => {
    mockLesson(() => lessonOk(SAMPLE_MD))
    renderAt('/modules/1/lesson/m1-s0')
    const btn = await screen.findByRole('button', { name: /start review session/i })
    expect(btn).not.toBeDisabled()
  })

  test('Start review disabled with title when card_count is 0', async () => {
    mockLesson(() => lessonOk(SAMPLE_MD, 0))
    renderAt('/modules/1/lesson/m1-s0')
    const btn = await screen.findByRole('button', { name: /start review session/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('title', expect.stringMatching(/no cards/i))
  })

  test('Back to module link points to /modules/1', async () => {
    mockLesson(() => lessonOk(SAMPLE_MD))
    renderAt('/modules/1/lesson/m1-s0')
    const link = await screen.findByRole('link', { name: /back to module/i })
    expect(link).toHaveAttribute('href', '/modules/1')
  })

  test('shiki highlighting eventually fires (data-shiki attribute present)', async () => {
    mockLesson(() => lessonOk(SAMPLE_MD))
    const { container } = renderAt('/modules/1/lesson/m1-s0')
    await waitFor(
      () => expect(container.querySelector('[data-shiki="true"]')).toBeInTheDocument(),
      { timeout: 4000 },
    )
  }, 8000)
})

describe('LessonPage — branches', () => {
  test('empty content shows "Lesson content coming soon" + back button', async () => {
    mockLesson(() => lessonOk(''))
    renderAt('/modules/1/lesson/m1-s0')
    expect(await screen.findByText(/lesson content coming soon/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to module/i })).toBeInTheDocument()
  })

  test('error: 404 shows Banner with retry, NOT a stale loading state', async () => {
    mockLesson(() => jsonResponse({ error: 'lesson_not_found', detail: '' }, 404))
    renderAt('/modules/1/lesson/m1-s0')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/couldn't load this lesson/i)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  test('loading state renders skeleton (no "Loading..." text)', async () => {
    let resolve: (r: Response) => void = () => {}
    mockLesson(() => new Promise<Response>((res) => { resolve = res }))
    renderAt('/modules/1/lesson/m1-s0')
    expect(await screen.findByTestId('lesson-skeleton')).toBeInTheDocument()
    expect(screen.queryByText(/loading\.\.\./i)).not.toBeInTheDocument()
    resolve(lessonOk('#x', 1))
  })
})
