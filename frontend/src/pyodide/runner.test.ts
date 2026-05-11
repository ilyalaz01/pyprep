import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { runCodeTask, type RunResult, type TestResult } from './runner'
import * as loader from './loader'

vi.mock('./loader', () => ({
  bootPyodideWorker: vi.fn(() => Promise.resolve()),
  getPyodideWorker: vi.fn(),
  getColdStartMetrics: vi.fn(),
}))

// Fake Worker that retains addEventListener listeners so tests can
// drive the request/response handshake deterministically.
class FakeWorker {
  private listeners: Array<(e: MessageEvent) => void> = []
  postedMessages: Array<{ type?: string; requestId?: string }> = []
  addEventListener(_type: string, l: (e: MessageEvent) => void): void {
    if (_type === 'message') this.listeners.push(l)
  }
  removeEventListener(_type: string, l: (e: MessageEvent) => void): void {
    this.listeners = this.listeners.filter((x) => x !== l)
  }
  postMessage(m: unknown): void {
    this.postedMessages.push(m as { type?: string; requestId?: string })
  }
  emit(data: unknown): void {
    for (const l of this.listeners) {
      l(new MessageEvent('message', { data }))
    }
  }
  terminate(): void { /* no-op */ }
}

const fakeRunResult = (over: Partial<RunResult> = {}): RunResult => ({
  ok: true, tests: [], stdout: '', stderr: '',
  timed_out: false, total_duration_ms: 1, ...over,
})

let worker: FakeWorker
beforeEach(() => {
  worker = new FakeWorker()
  vi.mocked(loader.bootPyodideWorker).mockResolvedValue(undefined)
  vi.mocked(loader.getPyodideWorker).mockReturnValue(worker as unknown as Worker)
})
afterEach(() => { vi.clearAllMocks() })

describe('runCodeTask — happy path', () => {
  test('posts execute with the args and resolves with the matching result', async () => {
    const promise = runCodeTask('def f(): pass\n', 'def test(): pass\n', ['math'])
    await Promise.resolve(); await Promise.resolve()
    const posted = worker.postedMessages[0]
    expect(posted.type).toBe('execute')
    expect(posted.requestId).toMatch(/^pyprep-req-/)
    const expected = fakeRunResult({ total_duration_ms: 42 })
    worker.emit({
      type: 'result', requestId: posted.requestId, result: expected,
    })
    const r = await promise
    expect(r).toEqual(expected)
  })

  test('ignores results destined for a different requestId', async () => {
    const promise = runCodeTask('x', 'y', [])
    await Promise.resolve(); await Promise.resolve()
    worker.emit({ type: 'result', requestId: 'foreign', result: fakeRunResult() })
    const posted = worker.postedMessages[0]
    const mine = fakeRunResult({ ok: false })
    worker.emit({ type: 'result', requestId: posted.requestId, result: mine })
    const r = await promise
    expect(r).toEqual(mine)
  })
})

describe('runCodeTask — error paths', () => {
  test('boot failure: returns non-ok RunResult with stderr message', async () => {
    vi.mocked(loader.bootPyodideWorker).mockRejectedValue(new Error('cdn down'))
    const r = await runCodeTask('x', 'y', [])
    expect(r.ok).toBe(false)
    expect(r.stderr).toBe('cdn down')
    expect(r.tests).toEqual([])
  })

  test('no worker after boot: returns non-ok RunResult', async () => {
    vi.mocked(loader.getPyodideWorker).mockReturnValue(null)
    const r = await runCodeTask('x', 'y', [])
    expect(r.ok).toBe(false)
    expect(r.stderr).toMatch(/worker unavailable/i)
  })

  test('worker error reply: stderr carries the message', async () => {
    const promise = runCodeTask('x', 'y', [])
    await Promise.resolve(); await Promise.resolve()
    const posted = worker.postedMessages[0]
    worker.emit({
      type: 'error', requestId: posted.requestId, message: 'pyodide blew up',
    })
    const r = await promise
    expect(r.ok).toBe(false)
    expect(r.stderr).toBe('pyodide blew up')
  })
})

test('TestResult + RunResult types stay exported from runner', () => {
  const t: TestResult = { name: 'test_x', passed: true, duration_ms: 1 }
  const r: RunResult = fakeRunResult({ tests: [t] })
  expect(r.tests[0].name).toBe('test_x')
})
