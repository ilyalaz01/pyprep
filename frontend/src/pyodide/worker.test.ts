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

// Diagnostic emits were added to bootPyodide for stop-#2 visibility.
// Sequence/count assertions filter them out so the contract pins
// stay focused on the ready/error signals loader.ts consumes.
const nonDiag = (post: ReturnType<typeof vi.fn>) =>
  post.mock.calls
    .map((c) => c[0] as { type: string; message?: string })
    .filter((m) => m.type !== 'diagnostic')

afterEach(() => {
  _setBootEnvForTests(
    vi.fn(async () => fakePyodide()),
    'about:test',
  )
})

describe('handleMessage — post-boot runtime dispatch', () => {
  // T6.3 self-bootstrapping refactor: 'boot' is no longer a valid
  // inbound. handleMessage rejects everything as unknown until T6.5
  // teaches it 'execute'.
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

  test("'boot' is treated as unknown (no longer a handshake message)", () => {
    const post = vi.fn()
    handleMessage(post, { type: 'boot' })
    const arg = post.mock.calls[0][0] as { type: string; message?: string }
    expect(arg.type).toBe('error')
    expect(arg.message).toMatch(/unknown message type/i)
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

  test('null bootstrap config: graceful error reply (no rethrow)', async () => {
    _setBootEnvForTests(null as unknown as never, 'about:test')
    const post = vi.fn()
    await bootPyodide(post)
    expect(post.mock.calls[0][0]).toEqual({
      type: 'error', message: expect.stringMatching(/not configured/i),
    })
  })
})
