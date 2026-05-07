# PRD — Code Execution Sandbox (Pyodide + pytest)

**Component:** `frontend/src/pyodide/`
**Authority:** This PRD is the single source of truth for how user-submitted Python is executed in PyPrep.

---

## 1. Background & Theory

PyPrep needs to run untrusted user code (their solutions to code-task cards) and validate them against a hidden `pytest` harness. The two viable approaches:

1. **Server-side execution** in a Docker sandbox per request.
2. **Client-side execution** via [Pyodide](https://pyodide.org) — a CPython port to WebAssembly that runs in the browser.

PyPrep takes approach **2**. See `PLAN.md` ADR-001 for rationale: zero attack surface on the server, zero ops cost, proven viable by JupyterLite and similar projects.

---

## 2. Requirements

### 2.1 Functional

- **FR-SBX-1:** Load Pyodide once per SPA session, lazily on first navigation to a route that needs it.
- **FR-SBX-2:** Run user code together with a hidden `pytest` harness inside Pyodide.
- **FR-SBX-3:** Surface per-test pass/fail with assertion message and traceback.
- **FR-SBX-4:** Time out execution after `EXECUTION_TIMEOUT_MS` (default `5000`); cancel and report timeout.
- **FR-SBX-5:** All execution happens in a Web Worker. The main thread MUST remain responsive.
- **FR-SBX-6:** No card may execute code from a previous card; the Pyodide global namespace is reset per code-task.

### 2.2 Non-Functional

- **NFR-SBX-1:** Initial Pyodide load ≤ 6 seconds on a 50 Mbps connection.
- **NFR-SBX-2:** Subsequent test runs ≤ 1 second each.
- **NFR-SBX-3:** Memory footprint of Pyodide alone < 80 MB.
- **NFR-SBX-4:** Pyodide assets served from CDN with version pinned (no auto-upgrade).

### 2.3 Security

- **SEC-SBX-1:** No server-side `exec` of user code, ever. This is a hard architectural rule (see PRD §5).
- **SEC-SBX-2:** Pyodide runs sandboxed in the browser by virtue of being WASM in a Web Worker; it cannot make network calls without explicit `pyfetch` permission, which is **disabled** in the harness.
- **SEC-SBX-3:** User code that hangs (`while True: pass`) is killed by the timeout (the worker is terminated and replaced).

---

## 3. Card Schema for Code Tasks

A `code_task` card includes:

```json
{
  "id": "m1-s1-c12",
  "type": "code_task",
  "topic": "Class with default mutable trap",
  "prompt_md": "Implement a `Cart` class with method `add(item)` that ...",
  "starter_code": "class Cart:\n    def __init__(self, items=[]):\n        self.items = items\n    ...",
  "solution_code": "class Cart:\n    def __init__(self, items=None):\n        self.items = list(items) if items else []\n    ...",
  "tests": "import pytest\n\nfrom solution import Cart\n\ndef test_two_carts_isolated():\n    a = Cart(); a.add('x')\n    b = Cart()\n    assert b.items == []\n",
  "allowlist": ["pytest", "math", "collections"],
  "difficulty": 3,
  "tags": ["mutability", "default-args"]
}
```

The `tests` field is **not shown** to the user.

---

## 4. Public Interface

```typescript
// frontend/src/pyodide/types.ts

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;          // short failure message
  traceback?: string;        // multi-line on failure
  duration_ms: number;
}

export interface RunResult {
  ok: boolean;               // all tests passed
  tests: TestResult[];
  stdout: string;
  stderr: string;
  total_duration_ms: number;
  timed_out: boolean;
}

// frontend/src/pyodide/runner.ts

export async function runCodeTask(
  user_code: string,
  hidden_tests: string,
  options?: { timeout_ms?: number }
): Promise<RunResult>;
```

The runner is the only export the rest of the frontend uses. Pyodide details are encapsulated.

---

## 5. Implementation Strategy

### 5.1 Worker boundary

```
Main thread (React)
       |
       | postMessage({code, tests})
       v
Web Worker (loader.ts)
       |
       v
Pyodide Runtime
       |
   loads pytest from packages
       |
   writes user code to /tmp/solution.py
   writes tests   to /tmp/test_solution.py
       |
   subprocess-style: pytest.main(["-v", "/tmp/test_solution.py", "--json-report"])
       |
   captures stdout/stderr + json report
       |
       v
postMessage({result})
       |
       v
Main thread renders TestResult[]
```

### 5.2 Files

```
frontend/src/pyodide/
├── loader.ts              # downloads + initializes Pyodide once
├── worker.ts              # Web Worker entry; handles run requests
├── runner.ts              # main-thread API surface (Promise-based)
├── pytest_harness.py      # Python helper that runs pytest + captures structured output
└── types.ts               # TypeScript types
```

Each `.ts` file ≤ 150 LOC.

### 5.3 Timeout

A `setTimeout(timeoutMs)` is set on the main thread; on fire, the worker is terminated and a fresh worker is spun up for the next request.

---

## 6. Test Strategy

### 6.1 Unit (frontend)

Mock the worker; verify `runner.ts` correctly interprets various `postMessage` shapes (success, failure, timeout, syntax error in user code).

### 6.2 E2E

Headless Chromium via Playwright:
- Loads the app, navigates to a code-task card, submits known-good solution → all tests pass.
- Submits known-bad solution → expected failures shown.
- Submits infinite loop → timeout shown within `timeout_ms + 1s`.

### 6.3 Allowlist Tests

For each entry in `allowlist`, a smoke test confirms it imports successfully in Pyodide and a forbidden module (e.g. `socket`) raises a clean error message.

---

## 7. Building Block Spec (Segal §15)

```
Input:  user_code (str), hidden_tests (str), allowlist (list[str]), timeout_ms (int)
Output: RunResult { ok, tests[], stdout, stderr, duration, timed_out }
Setup:  PYODIDE_VERSION (semver), PYODIDE_CDN_URL (str), DEFAULT_TIMEOUT_MS (int)
```

### 7.1 Validation

- `user_code` MUST be `str`, length ≤ 50 KB.
- `hidden_tests` MUST be `str`, length ≤ 50 KB.
- `timeout_ms` MUST be in `[100, 30000]`.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Pyodide CDN outage | Self-host the version pinned to a static asset, fall back automatically. |
| Pyodide version drift breaks pinned harness | CI runs harness against the pinned version on every PR. |
| User pastes 5 MB of code, freezes worker | Input length check before postMessage. |
| `pytest` fixtures from one task contaminate next | Worker terminated after each task. |

---

## 9. Acceptance Criteria

- [ ] Pyodide loads lazily and only once per SPA session.
- [ ] Code execution and pytest run isolated in a Web Worker.
- [ ] Timeout terminates and recovers cleanly.
- [ ] Per-test results (pass/fail, message, traceback) surface correctly in the UI.
- [ ] No main-thread freezes during execution (verified by Lighthouse / DevTools).
- [ ] No file in `frontend/src/pyodide/` exceeds 150 LOC.
- [ ] All Module 1 `code_task` cards execute correctly when given the documented `solution_code`.
