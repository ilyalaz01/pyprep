import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  bootPyodideWorker, getColdStartMetrics, getPyodideWorker,
  invalidateWorker, _resetLoaderForTests,
} from './loader'

// Controllable mock — emits the three readiness signals on demand
// so segment timings have real (non-zero) gaps in test.
class StepWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: ErrorEvent) => void) | null = null
  postedMessages: unknown[] = []
  terminated = false
  postMessage(m: unknown) { this.postedMessages.push(m) }
  terminate() { this.terminated = true }
  emit(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data }))
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

afterEach(() => { _resetLoaderForTests() })

describe('getColdStartMetrics — pre-boot', () => {
  test('all four fields null before bootPyodideWorker is called', () => {
    expect(getColdStartMetrics()).toEqual({
      pyodide_load_ms: null, pytest_load_ms: null,
      harness_init_ms: null, total_ms: null,
    })
  })
})

describe('bootPyodideWorker — happy path', () => {
  test('creates the worker, listens for self-boot signals, populates all three segments + total', async () => {
    const worker = new StepWorker()
    const factory = vi.fn(() => worker as unknown as Worker)
    const ready = bootPyodideWorker(factory)
    expect(factory).toHaveBeenCalledTimes(1)
    // T6.3 self-bootstrap: no 'boot' post — worker drives its own init.
    expect(worker.postedMessages).toEqual([])
    await wait(5); worker.emit({ type: 'pyodide-ready' })
    await wait(15); worker.emit({ type: 'pytest-ready' })
    await wait(25); worker.emit({ type: 'ready' })
    await ready
    const m = getColdStartMetrics()
    expect(m.pyodide_load_ms).toBeGreaterThan(0)
    expect(m.pytest_load_ms).toBeGreaterThan(0)
    expect(m.harness_init_ms).toBeGreaterThan(0)
    expect(m.total_ms).toBeGreaterThan(0)
    // total equals sum of segments within timer rounding tolerance.
    const sum =
      (m.pyodide_load_ms ?? 0) + (m.pytest_load_ms ?? 0) + (m.harness_init_ms ?? 0)
    expect(Math.abs((m.total_ms ?? 0) - sum)).toBeLessThan(2)
  })
})

describe('bootPyodideWorker — singleton', () => {
  test('second call returns the same Promise; worker is created once', async () => {
    const worker = new StepWorker()
    const factory = vi.fn(() => worker as unknown as Worker)
    const p1 = bootPyodideWorker(factory)
    const p2 = bootPyodideWorker(factory)
    expect(p1).toBe(p2)
    expect(factory).toHaveBeenCalledTimes(1)
    worker.emit({ type: 'pyodide-ready' })
    worker.emit({ type: 'pytest-ready' })
    worker.emit({ type: 'ready' })
    await p1
  })

  test('after boot completes a third call still returns a resolved Promise without re-booting', async () => {
    const worker = new StepWorker()
    const factory = vi.fn(() => worker as unknown as Worker)
    const p = bootPyodideWorker(factory)
    worker.emit({ type: 'pyodide-ready' })
    worker.emit({ type: 'pytest-ready' })
    worker.emit({ type: 'ready' })
    await p
    const again = bootPyodideWorker(factory)
    expect(factory).toHaveBeenCalledTimes(1)
    await expect(again).resolves.toBeUndefined()
  })
})

describe('invalidateWorker — T6.8 termination + respawn', () => {
  test('terminates the worker, clears metrics, and re-boots fresh on next call', async () => {
    const w1 = new StepWorker()
    const factory1 = vi.fn(() => w1 as unknown as Worker)
    const ready1 = bootPyodideWorker(factory1)
    w1.emit({ type: 'pyodide-ready' })
    w1.emit({ type: 'pytest-ready' })
    w1.emit({ type: 'ready' })
    await ready1
    expect(getPyodideWorker()).not.toBeNull()

    invalidateWorker()
    expect(w1.terminated).toBe(true)
    expect(getPyodideWorker()).toBeNull()
    expect(getColdStartMetrics()).toEqual({
      pyodide_load_ms: null, pytest_load_ms: null,
      harness_init_ms: null, total_ms: null,
    })

    const w2 = new StepWorker()
    const factory2 = vi.fn(() => w2 as unknown as Worker)
    void bootPyodideWorker(factory2)
    expect(factory2).toHaveBeenCalledTimes(1)
  })
})

describe('bootPyodideWorker — error paths', () => {
  test('an error message from the worker rejects the promise', async () => {
    const worker = new StepWorker()
    const ready = bootPyodideWorker(() => worker as unknown as Worker)
    worker.emit({ type: 'error', message: 'boom' })
    await expect(ready).rejects.toThrow(/boom/)
  })

  test('worker.onerror also rejects the promise', async () => {
    const worker = new StepWorker()
    const ready = bootPyodideWorker(() => worker as unknown as Worker)
    worker.onerror?.(new ErrorEvent('error', { message: 'fatal' }))
    await expect(ready).rejects.toBeDefined()
  })
})
