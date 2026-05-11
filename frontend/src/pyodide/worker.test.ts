import { describe, expect, test, vi } from 'vitest'

import { handleMessage } from './worker'

describe('worker.handleMessage — T6.2 skeleton', () => {
  test('a boot message receives an error reply with a T6.3 marker', () => {
    // T6.2 ships the message-handling shape without Pyodide. T6.3
    // swaps the boot branch for the real loadPyodide+loadPackage path.
    // Until then the error reply tells loader.ts (and any future
    // owner-facing log) which task wires up the actual work.
    const post = vi.fn()
    handleMessage(post, { type: 'boot' })
    expect(post).toHaveBeenCalledTimes(1)
    const arg = post.mock.calls[0][0] as { type: string; message?: string }
    expect(arg.type).toBe('error')
    expect(arg.message).toMatch(/t6\.3/i)
  })

  test('an unknown inbound message gets an error reply naming the type', () => {
    const post = vi.fn()
    handleMessage(post, { type: 'rummage' })
    const arg = post.mock.calls[0][0] as { type: string; message?: string }
    expect(arg.type).toBe('error')
    expect(arg.message).toMatch(/unknown/i)
  })

  test('a non-object message is ignored gracefully', () => {
    const post = vi.fn()
    handleMessage(post, 'not-an-object')
    const arg = post.mock.calls[0][0] as { type: string; message?: string }
    expect(arg.type).toBe('error')
  })
})
