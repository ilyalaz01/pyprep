// P6.5/P1-2 — real-Pyodide e2e Playwright spec.
//
// Resolves N037 (Pyodide-actual coverage gap). Until this spec, every
// `frontend/src/pyodide/*.test.ts` mocked the worker and the backend
// `test_pytest_harness.py` + `test_module1_allowlist_matrix.py` ran the
// harness under CPython. The single real-Pyodide test (cold-start)
// ran one trivial workload. This spec drives the full T6.10 + T6.12
// matrices through the real WASM runtime:
//
//   T6.10 — every Module 1 code_task's solution_code passes its own
//           hidden tests (acceptance criterion #7 in PRD §9).
//   T6.12 — per-card allowlist: imports the user's full allowlist
//           passes the AST gate (ADR-019); `import socket` (denied)
//           returns the documented ImportError message.
//   FR-SBX-6 — namespace reset: a global defined in task A does NOT
//           leak into task B's `from solution import X` lookup.
//
// **Boot is amortized.** Playwright's `describe.configure({ mode:
// 'serial' })` + a shared page handle in beforeAll lets all ~22 cases
// reuse one Pyodide boot. Total wall-clock ≈ 60 s in CI (10 s boot +
// ~2 s per runCodeTask × ~22 cases). Sequential by design — parallel
// would multiply boot cost without finding more bugs.
import { test, expect, type Page } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

interface CodeTaskCard {
  id: string
  type: 'code_task'
  solution_code: string
  tests: string
  allowlist: string[]
}

interface RunResult {
  ok: boolean
  tests: Array<{ name: string; passed: boolean; message?: string | null }>
  stdout: string
  stderr: string
  total_duration_ms: number
  timed_out: boolean
}

const here = dirname(fileURLToPath(import.meta.url))
// repo-root/frontend/test/this-file → repo-root/content/modules/...
const CARDS_DIR = join(
  here, '..', '..', 'content', 'modules', '01_python_core_oop',
)

function loadModule1CodeTasks(): CodeTaskCard[] {
  const out: CodeTaskCard[] = []
  for (const f of readdirSync(CARDS_DIR).sort()) {
    if (!f.endsWith('.cards.json')) continue
    const data = JSON.parse(readFileSync(join(CARDS_DIR, f), 'utf-8'))
    for (const c of data.cards as Array<Record<string, unknown>>) {
      if (c.type === 'code_task') out.push(c as unknown as CodeTaskCard)
    }
  }
  return out
}

const CARDS = loadModule1CodeTasks()
// Denied module: not present in ANY Module 1 allowlist. Mirrors the
// choice in tests/unit/test_module1_allowlist_matrix.py — keep them
// in sync.
const DENIED_MODULE = 'socket'

async function runInPage(
  page: Page,
  user_code: string,
  hidden_tests: string,
  allowlist: string[],
  timeout_ms = 15_000,
): Promise<RunResult> {
  return await page.evaluate(
    async (args) => {
      const w = window as unknown as {
        __pyprepRunCodeTask?: (
          c: string,
          t: string,
          a: string[],
          o?: { timeout_ms?: number },
        ) => Promise<RunResult>
      }
      if (!w.__pyprepRunCodeTask) {
        throw new Error('fixture did not expose __pyprepRunCodeTask')
      }
      return await w.__pyprepRunCodeTask(args.user_code, args.hidden_tests, args.allowlist, {
        timeout_ms: args.timeout_ms,
      })
    },
    { user_code, hidden_tests, allowlist, timeout_ms },
  )
}

test.describe.configure({ mode: 'serial' })

test.describe('Pyodide e2e — real-worker T6.10 + T6.12 (N037 resolution)', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto('/pyodide-e2e.html', { waitUntil: 'load' })
    // Wait for the fixture to finish boot. 90 s ceiling — generous to
    // absorb CI runner variance, but well above the 12 s cold-start
    // budget so a real boot regression still shows up via the cold-
    // start spec, not as a flake here.
    await page.evaluate(
      () => (window as unknown as { __pyprepE2eReady?: Promise<true> }).__pyprepE2eReady,
      { timeout: 90_000 },
    )
  })

  test.afterAll(async () => {
    await page?.close()
  })

  test('matrix covers ≥ 5 Module 1 code_tasks (sanity)', () => {
    // Mirrors test_module1_allowlist_matrix.py: floor pinned so a
    // regression that drops cards from content/ doesn't quietly
    // shrink coverage.
    expect(CARDS.length).toBeGreaterThanOrEqual(5)
  })

  // T6.10: every authored solution passes its own hidden tests in
  // the real Pyodide runtime.
  for (const card of CARDS) {
    test(`T6.10 ${card.id}: solution_code passes its own tests in real Pyodide`, async () => {
      const result = await runInPage(
        page, card.solution_code, card.tests, card.allowlist,
      )
      expect(
        result.ok,
        `${card.id}: solution_code should pass.\n` +
          `stderr=${result.stderr}\ntests=${JSON.stringify(result.tests)}`,
      ).toBe(true)
      expect(result.timed_out).toBe(false)
    })
  }

  // T6.12 allow side: synthesize code that imports the full allowlist,
  // verify the AST gate accepts it.
  for (const card of CARDS) {
    test(`T6.12 ${card.id} allow: full allowlist passes the AST gate in real Pyodide`, async () => {
      if (card.allowlist.length === 0) {
        test.skip(true, `${card.id}: empty allowlist, nothing to smoke`)
      }
      const imports = card.allowlist.map((m) => `import ${m}`).join('\n')
      const user_code = `${imports}\n\ndef ok():\n    return True\n`
      const hidden_tests =
        'from solution import ok\n\n' +
        'def test_ok():\n    assert ok() is True\n'
      const result = await runInPage(page, user_code, hidden_tests, card.allowlist)
      expect(
        result.ok,
        `${card.id}: allowlist=${JSON.stringify(card.allowlist)} should pass.\n` +
          `stderr=${result.stderr}`,
      ).toBe(true)
    })
  }

  // T6.12 deny side: `import socket` is denied by every Module 1 card;
  // expect the clean documented ImportError message — not a raw
  // traceback, not silent fall-through.
  for (const card of CARDS) {
    test(`T6.12 ${card.id} deny: import socket trips the gate in real Pyodide`, async () => {
      expect(
        card.allowlist.includes(DENIED_MODULE),
        `${card.id}: test assumption broken — '${DENIED_MODULE}' is in this allowlist`,
      ).toBe(false)
      const user_code = `import ${DENIED_MODULE}\n\ndef noop():\n    return None\n`
      const hidden_tests =
        'from solution import noop\n\n' +
        'def test_noop():\n    assert noop() is None\n'
      const result = await runInPage(page, user_code, hidden_tests, card.allowlist)
      expect(result.ok).toBe(false)
      expect(result.timed_out).toBe(false)
      expect(result.stderr).toContain(
        `ImportError: '${DENIED_MODULE}' is not allowed in this code task`,
      )
    })
  }

  // FR-SBX-6: per-task namespace reset. Task A defines `foo`; task B
  // does NOT define `foo` and its tests try to import it. If isolation
  // works, task B fails with a clean ImportError (or test failure
  // pointing at the missing symbol). If the harness leaks cached
  // `sys.modules['solution']` between calls, task B accidentally
  // sees `foo` and passes — that's the regression we're guarding.
  test('FR-SBX-6: solution module does NOT leak between runs (real Pyodide)', async () => {
    const taskA = await runInPage(
      page,
      'def foo():\n    return "A"\n',
      'from solution import foo\n\ndef test_foo():\n    assert foo() == "A"\n',
      ['pytest'],
    )
    expect(taskA.ok, `task A stderr=${taskA.stderr}`).toBe(true)

    // Task B's solution.py does NOT define foo. If `solution` were
    // cached in sys.modules from task A, this would silently pass.
    const taskB = await runInPage(
      page,
      'def bar():\n    return "B"\n',
      'from solution import foo\n\ndef test_should_not_see_foo():\n    pass\n',
      ['pytest'],
    )
    expect(
      taskB.ok,
      `FR-SBX-6 isolation regression: task B saw task A's solution.\n` +
        `tests=${JSON.stringify(taskB.tests)}\nstderr=${taskB.stderr}`,
    ).toBe(false)
  })
})
