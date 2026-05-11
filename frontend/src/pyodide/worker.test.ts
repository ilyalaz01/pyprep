import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  bootPyodide, handleMessage,
  _setBootEnvForTests, _setBootErrorForTests,
} from './worker'

const fakePyodide = (loadOk = true) => ({
  loadPackage: vi.fn(async () => {
    if (!loadOk) throw new Error('pytest fetch failed')
  }),
})

const fakeLoad = (pyodide: ReturnType<typeof fakePyodide>) =>
  vi.fn(async () => pyodide)

// Diagnostic emits were added to bootPyodide for stop-#2 visibility.
// Sequence/count assertions filter them out so the contract pins
// stay focused on the ready/error signals loader.ts consumes.
const nonDiag = (post: ReturnType<typeof vi.fn>) =>
  post.mock.calls
    .map((c) => c[0] as { type: string; message?: string })
    .filter((m) => m.type !== 'diagnostic')

afterEach(() => {
  // Reset module-level state between tests.
  _setBootEnvForTests(
    vi.fn(async () => fakePyodide()),
    'about:test',
  )
  _setBootErrorForTests(null)
})

describe('handleMessage — dispatch shape', () => {
  test('unknown messages get an error reply naming the type', () => {
    const post = vi.fn()
    handleMessage(post, { type: 'rummage' })
    const arg = post.mock.calls[0][0] as { type: string; message?: string }
    expect(arg.type).toBe('error')
    expect(arg.message).toMatch(/rummage/)
  })

  test('non-object messages get an error reply', () => {
    const post = vi.fn()
    handleMessage(post, 'nope')
    expect(post.mock.calls[0][0]).toEqual({
      type: 'error', message: expect.stringMatching(/not an object/i),
    })
  })

  test('boot routes to bootPyodide (async; tested via bootPyodide directly)', () => {
    const post = vi.fn()
    // handleMessage is sync — bootPyodide is fire-and-forget.
    // We assert no error reply fires synchronously when the route is
    // taken; happy-path emissions are covered by bootPyodide tests.
    expect(() => handleMessage(post, { type: 'boot' })).not.toThrow()
  })
})

describe('bootPyodide — happy path', () => {
  test('emits pyodide-ready → pytest-ready → ready in order', async () => {
    const py = fakePyodide()
    _setBootEnvForTests(fakeLoad(py), 'https://cdn.test/pyodide/')
    const post = vi.fn()
    await bootPyodide(post)
    expect(nonDiag(post).map((m) => m.type))
      .toEqual(['pyodide-ready', 'pytest-ready', 'ready'])
    expect(py.loadPackage).toHaveBeenCalledWith('pytest')
  })

  test('passes the configured indexURL to loadPyodide', async () => {
    const py = fakePyodide()
    const load = fakeLoad(py)
    _setBootEnvForTests(load, 'https://cdn.test/pyodide/')
    await bootPyodide(vi.fn())
    expect(load).toHaveBeenCalledWith({ indexURL: 'https://cdn.test/pyodide/' })
  })
})

describe('bootPyodide — error paths', () => {
  test('loadPyodide rejection: error reply posted, then rethrown', async () => {
    const load = vi.fn(async () => { throw new Error('cdn down') })
    _setBootEnvForTests(load as unknown as never, 'about:test')
    const post = vi.fn()
    await expect(bootPyodide(post)).rejects.toThrow('cdn down')
    const events = nonDiag(post)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'error', message: 'cdn down' })
  })

  test('loadPackage rejection: emits pyodide-ready then error, rethrows', async () => {
    const py = fakePyodide(false)
    _setBootEnvForTests(fakeLoad(py), 'about:test')
    const post = vi.fn()
    await expect(bootPyodide(post)).rejects.toThrow('pytest fetch failed')
    expect(nonDiag(post).map((m) => m.type)).toEqual(['pyodide-ready', 'error'])
  })

  test('null bootstrap config produces a clear error (no rethrow, early-return path)', async () => {
    _setBootEnvForTests(null as unknown as never, 'about:test')
    const post = vi.fn()
    await bootPyodide(post)
    expect(post.mock.calls[0][0]).toEqual({
      type: 'error', message: expect.stringMatching(/not configured/i),
    })
  })

  // T6.0.5: when the production bootstrap detects a missing
  // VITE_PYODIDE_CDN env var, it sets _bootError with an actionable
  // setup message. bootPyodide must surface that exact message so the
  // user gets a fix path, not a riddle.
  test('_bootError set with env-not-set message surfaces verbatim', async () => {
    const msg =
      '[pyprep:pyodide] VITE_PYODIDE_CDN env var is not set. ' +
      'Copy frontend/.env.example to frontend/.env.local and restart pnpm dev. ' +
      'See README setup section.'
    _setBootErrorForTests(msg)
    const post = vi.fn()
    await bootPyodide(post)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][0]).toEqual({ type: 'error', message: msg })
  })

  test('_bootError takes precedence over _loadPyodide (env error wins over generic)', async () => {
    _setBootErrorForTests('env not set: see README')
    _setBootEnvForTests(fakeLoad(fakePyodide()), 'about:test')
    const post = vi.fn()
    await bootPyodide(post)
    const m = post.mock.calls[0][0] as { type: string; message?: string }
    expect(m.type).toBe('error')
    expect(m.message).toMatch(/env not set/i)
  })
})
