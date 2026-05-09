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
- **NFR-SBX-3:** Initial download (compressed) ≤ 80 MB. In-memory
  footprint of a loaded Pyodide instance with `pytest` is
  ~150–250 MB RSS — acceptable on desktop browsers; mobile is out of
  scope (see PRD §5 Out of Scope).
- **NFR-SBX-4:** Pyodide assets served from CDN with version pinned
  (no auto-upgrade). Self-hosted fallback is **post-MVP**; CDN
  outages will visibly fail code-task cards in MVP-1. Pinned-version
  source of truth: `VITE_PYODIDE_VERSION` in `.env-example`
  (currently `0.26.4`).

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

The `tests` field is **not shown** to the user (see §3.1 below for the
full visibility model).

### 3.1 Visibility model

The fields `tests`, `solution_code`, `correct_index`, and flip-card
answers are **not shown by the SPA renderer to the user**. This is a
**UI convention, NOT a server-side security boundary.** ADR-001
(Pyodide client-side execution) requires `hidden_tests` to reach the
browser — which means a DevTools-equipped user can read them off the
wire. This is an explicit, accepted trade-off of the architecture: the
platform optimizes for low operational cost over leak-proofing card
answers.

Renderers MUST mask these fields in the rendered UI (so the lazy 95 %
don't see them); they MUST NOT assume the server redacted them. The
`/api/sessions/{id}/next` and `/api/modules/{id}/lesson/{sphere_id}`
endpoints serve `card.raw` (full JSON) by design.

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
  allowlist: string[],
  options?: { timeout_ms?: number }
): Promise<RunResult>;
```

The runner is the only export the rest of the frontend uses. Pyodide
details are encapsulated. `(user_code, hidden_tests, allowlist)` are
treated as orthogonal inputs — the worker MUST NOT reach into card
metadata or fetch them itself. The SPA's `CodeTaskCard` component is
responsible for reading `card.raw.allowlist` and passing it through.

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

**Worker lifecycle (binding):** The worker is **reused** across all
code-task executions in a session; per-task namespace reset is the
isolation boundary, not worker termination. Termination occurs only on
timeout (FR-SBX-4) or worker crash. Reuse is required to meet NFR-SBX-2
(≤ 1 s subsequent runs) — terminating per task would force a fresh
Pyodide load each time and trip NFR-SBX-1.

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
| Pyodide CDN outage | Self-host the version pinned to a static asset, fall back automatically. **[post-MVP, Phase 10 polish]** |
| Pyodide version drift breaks pinned harness | CI runs harness against the pinned version on every PR. |
| User pastes 5 MB of code, freezes worker | Input length check before postMessage. |
| `pytest` fixtures from one task contaminate next | Worker namespace reset between tasks; worker terminated only on timeout or unrecoverable error (see §5.1). |

---

## 9. Acceptance Criteria

- [ ] Pyodide loads lazily and only once per SPA session.
- [ ] Code execution and pytest run isolated in a Web Worker.
- [ ] Timeout terminates and recovers cleanly.
- [ ] Per-test results (pass/fail, message, traceback) surface correctly in the UI.
- [ ] No main-thread freezes during execution (verified by Lighthouse / DevTools).
- [ ] No file in `frontend/src/pyodide/` exceeds 150 LOC.
- [ ] All Module 1 `code_task` cards execute correctly when given the documented `solution_code`.
