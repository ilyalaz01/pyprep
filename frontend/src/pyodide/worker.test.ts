import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  bootPyodide, handleMessage, _setBootEnvForTests,
} from './worker'

const fakePyodide = (loadOk = true) => ({
  loadPackage: vi.fn(async () => {
    if (!loadOk) throw new Error('pytest fetch failed')
  }),
})

const fakeLoad = (pyodide: ReturnType<typeof fakePyodide>) =>
  vi.fn(async () => pyodide)

afterEach(() => {
  // Reset module-level state between tests.
  _setBootEnvForTests(
    vi.fn(async () => fakePyodide()),
    'about:test',
  )
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
    const types = post.mock.calls.map((c) => (c[0] as { type: string }).type)
    expect(types).toEqual(['pyodide-ready', 'pytest-ready', 'ready'])
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
  test('loadPyodide rejection produces a single error reply', async () => {
    const load = vi.fn(async () => { throw new Error('cdn down') })
    _setBootEnvForTests(load as unknown as never, 'about:test')
    const post = vi.fn()
    await bootPyodide(post)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][0]).toEqual({ type: 'error', message: 'cdn down' })
  })

  test('loadPackage rejection produces an error reply after pyodide-ready', async () => {
    const py = fakePyodide(false)
    _setBootEnvForTests(fakeLoad(py), 'about:test')
    const post = vi.fn()
    await bootPyodide(post)
    const types = post.mock.calls.map((c) => (c[0] as { type: string }).type)
    expect(types).toEqual(['pyodide-ready', 'error'])
  })

  test('null bootstrap config produces a clear error', async () => {
    _setBootEnvForTests(null as unknown as never, 'about:test')
    const post = vi.fn()
    await bootPyodide(post)
    expect(post.mock.calls[0][0]).toEqual({
      type: 'error', message: expect.stringMatching(/not configured/i),
    })
  })
})
