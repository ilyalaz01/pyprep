import { describe, expect, test } from 'vitest'
import { runCodeTask, type RunResult, type TestResult } from './runner'

describe('runCodeTask — Phase 5 stub', () => {
  test('returns the documented stub shape, ok=false, no tests, helpful stderr', async () => {
    const r: RunResult = await runCodeTask('print(1)', 'def test(): assert True', [])
    expect(r.ok).toBe(false)
    expect(r.tests).toEqual([])
    expect(r.stdout).toBe('')
    expect(r.stderr).toMatch(/phase 6/i)
    expect(r.timed_out).toBe(false)
    expect(r.total_duration_ms).toBe(0)
  })

  test('does not throw on minimal args', async () => {
    await expect(runCodeTask('', '', [])).resolves.toBeDefined()
  })

  test('does not throw on optional timeout_ms', async () => {
    await expect(
      runCodeTask('x', 'y', [], { timeout_ms: 5000 }),
    ).resolves.toBeDefined()
  })

  test('TestResult type signature is exported (compile-time check)', () => {
    // Constructing a TestResult literal pins the field set so Phase 6
    // can swap the runner implementation without breaking the consumer
    // contract pinned in PRD_code_sandbox §4.
    const t: TestResult = {
      name: 'test_x', passed: true, duration_ms: 1,
    }
    expect(t.name).toBe('test_x')
  })
})
