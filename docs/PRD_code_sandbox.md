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

Each `.ts` file ≤ 150 code-LOC, where code-LOC is the metric enforced by
`scripts/check_file_size.py` (non-blank, non-comment lines; see the
script's `count_loc` for the exact rule). Raw `wc -l` may exceed 150 on
files with substantial header comments + diagnostic emissions; the gate
is the operative ceiling.

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
- [ ] No file in `frontend/src/pyodide/` exceeds 150 code-LOC (see §5.2 — `scripts/check_file_size.py` is the canonical counter; raw `wc -l` is not the measurement).
- [ ] All Module 1 `code_task` cards execute correctly when given the documented `solution_code`.

---

## 10. Card authoring constraints

Constraints a future author needs **before writing their first card**.
Each surfaced during Phase 8–9 module authoring; each fails the
validator, the Pyodide runtime, or an external tool (GitHub Secret
Scanning, push protection) in a specific way if violated. Catalog
promoted from numbered NOTES entries ([[N039]], [[N043]], [[N044]],
[[N045]], [[N047]]) so the rules sit beside the sandbox PRD that
governs the largest cluster (code_task authoring); §10.4 and §10.5
are broader and apply to every card type plus lessons.

### 10.1 Pyodide-vs-CPython runtime divergences

**Rule:** validate code_task pytest runs against Pyodide
semantics, not CPython semantics. Backend pytest passing is
necessary but not sufficient — the harness that ships to learners
is Pyodide.

**Why:** Pyodide is CPython compiled to WebAssembly with the JS
runtime as its host environment. The interpreter is real, the
stdlib is mostly identical, but several stdlib surfaces collide
with the JS runtime model in ways that produce real test failures
in the browser despite passing on the host. m1-s6-c11 (the
discovery case) was authored against CPython's on-demand event
loop; Pyodide's loop is the JS event loop and is always running,
so `asyncio.run(...)` raises `RuntimeError: asyncio.run() cannot
be called from a running event loop`. The pattern transfers:
anywhere the stdlib assumes "I own the process / threads /
sockets," Pyodide diverges.

**Known-risky stdlib surfaces** (avoid in code_task hidden tests
unless you've verified the specific pattern):

- **`asyncio`** — `asyncio.run`, `loop.run_until_complete`,
  `loop.run_forever`. Pyodide's loop is the JS event loop; you
  cannot start a fresh one. Teach async patterns via `code_trap`
  or `flip`, not `code_task`.
- **`threading`, `_thread`, `multiprocessing`** — Pyodide is
  single-threaded; webworkers don't expose Python threads. Teach
  via `flip` (GIL explanation) or `code_trap` (recognize the
  thread-safety bug).
- **`subprocess`, `os.system`, `os.fork`, `os.exec*`** — no
  process spawning in the browser. Teach via `code_trap` (shell
  injection trap, command line construction) — covered in
  m2-s5 as the canonical example.
- **`socket`, `urllib.request`, `http.client`** — no raw network
  in the worker; only `pyfetch` is available and is currently
  disabled per SEC-SBX-2. Mock the dependency via injection (the
  N044 approach below).
- **File I/O outside `/tmp`** — Emscripten in-memory FS quirks;
  mount points differ from real Linux. Stay within the harness's
  per-task tempdir.
- **`time.sleep`** — works, but blocks the JS event loop, which
  blocks worker message processing. Tests appear hung from the
  outside. Use a synchronous mock or skip the sleep entirely.
- **C-extension state that survives `sys.modules.pop`** —
  e.g., NumPy's random seed. The harness's namespace reset
  doesn't fully reset native modules; rely only on Python-level
  state.

**What to do instead:** if a teaching scenario requires any of
the above, reach for `code_trap` (recognize the pattern) or
`multiple_choice` (pick the fix) instead of `code_task`. The
pedagogy transfers — most async / threading / subprocess /
network lessons are *recognition* lessons, not *write the code*
lessons, and the trap-and-fix format conveys the same competence
without running the pattern.

**Discovered:** [[N039]] (m1-s6-c11, Phase 6.5). Reclassified to
`code_trap` in P6.5; lesson preserved, runtime conflict removed.

---

### 10.2 Single-file harness — `solution.py` + `test_solution.py` only

**Rule:** code_task pytest sees exactly two files at execution
time: `solution.py` (written from `card["solution_code"]`) and
`test_solution.py` (written from `card["tests"]`). No third file
exists. Authoring around any "real test layout" assumption fails
validation.

**Why:** both the host validator (`scripts/validate_content.py`)
and the Pyodide browser harness (`frontend/src/pyodide/pytest_harness.py`)
write exactly two files into the per-task tempdir, then run
`pytest -q` over that dir. The schema doesn't expose a
"supporting files" array; the harness doesn't synthesize one.

**Concrete consequences:** the following pytest features that
*require* a separate file are unavailable inside code_task:

- **`conftest.py`** — cross-file fixtures. Inline fixtures in
  `test_solution.py` instead; pytest discovers them the same way.
- **`pytest.ini` / `pyproject.toml`** — pytest configuration.
  Hard-code any non-default behavior inside the test file
  itself.
- **Helper modules** — `from helper import thing`. Inline into
  `solution.py` or `test_solution.py`.
- **`__init__.py`** — package marker files. Skip; teach package
  layout via `code_trap` showing the layout diagram.
- **Data files** (CSV, JSON, YAML on disk) — embed as Python
  literals in the test file.

**What to do instead:** route any "requires file layout"
pedagogy through `code_trap` (snippet shows the layout, options
discriminate the bug). `code_task` is for code-the-learner-writes
verified by pytest assertions, all within two files.

**Discovered:** [[N043]] (m3-s3 Fixtures authoring, Phase 9).
The constraint was inferred from `_run_code_task` but not
codified before m3-s3 needed to teach conftest.py concepts.

---

### 10.3 Verify pyproject.toml deps before importing non-stdlib

**Rule:** before authoring a code_task that imports a non-stdlib
package, verify the package is in `pyproject.toml`'s `[project]
dependencies` AND in Pyodide's available package set. If absent
from either, the test fails with `ModuleNotFoundError` at
validation time (host) or at runtime (Pyodide).

**Why:** the host validator runs pytest via `[sys.executable,
"-m", "pytest", ...]` — imports resolve against the project's
own env. The Pyodide harness ships a different set of pre-built
packages (NumPy, pandas, requests-via-pyfetch, etc.) gated by
`loadPackage()` / `micropip.install()`. The two sets are NOT
identical; a code_task that validates on host can still fail in
the browser.

**Available third-party packages on host** (from `pyproject.toml`
as of 2026-05-13): `fastapi`, `uvicorn`, `pydantic`,
`pydantic-settings`, `email-validator`, `pyyaml`, `pytest`,
`pytest-cov`, `pytest-asyncio`, `jsonschema`, `httpx`, `passlib`,
`python-jose`, `python-multipart`, `alembic`, `sqlalchemy`.
Anything outside this list is unavailable to code_task host
execution.

**What to do instead** (in priority order):

1. **Switch to a stdlib equivalent.** Most teaching scenarios
   have one — `urllib.request` for `requests`, `http.client` for
   low-level HTTP, `csv` for CSV, `json` for JSON,
   `unittest.mock` for mocking. The mocking / patching /
   error-handling pedagogy transfers one-to-one and dodges both
   the host-env constraint and the Pyodide allowlist.
2. **Inject the dependency as a parameter.** Instead of
   `solution.py` doing `import third_party_thing`, design the
   function to take the dependency as an argument; the test
   passes a `Mock()`. This is also better production-code shape
   (dependency injection at the boundary) and the pattern
   m3-s4 teaches as its marquee technique.
3. **Route through code_trap / multiple_choice.** Predict-the-
   output is often *better* pedagogy for library-specific
   behavior than asking the learner to write against the
   library.

**Discovered:** [[N044]] (m3-s4-c9, Phase 9). First attempt
imported `requests`; validator failed; rewrote with
`urllib.request`. Same lesson, no harness changes.

---

### 10.4 Schema explanation-field naming: code_trap vs multiple_choice

**Rule (not strictly code_task-only, but card-authoring-adjacent):**
the explanation surface for each card type is fixed by the schema.
`code_trap` requires `explanation_md` (one prose block).
`multiple_choice` requires `option_explanations` (an array of
per-option strings). When a card has both a code snippet AND
per-option explanations, neither type accepts the combination —
choose one fix path.

**Why:** the shapes serve different pedagogies. `code_trap`
teaches a single mechanism around a snippet (one explanation
attached to the card as a whole). `multiple_choice` teaches
discrimination between four options (per-option rebuttals). The
schema enforces the split; mixing the fields fails validation.

**The two fix paths:**

1. **Type = multiple_choice + code embedded in the question.**
   Move the snippet into the `question` field as a fenced
   markdown block; provide `option_explanations`. Use when the
   four options each deserve a distinct rebuttal naming their
   specific wrongness.
2. **Type = code_trap + single explanation_md.** Drop the
   per-option shape; one prose block at the bottom explains the
   trap + canonical answer. Use when the four options are mostly
   throwaway and the explanation is one logical narrative.

**Heuristic:** if the four options' rebuttals each *teach*
something distinct, you have a multiple_choice. If the options
exist mainly to make the trap recognizable and the explanation
is one story, you have a code_trap.

**Discovered:** [[N045]] (m3-s5-c6 + m4-s1-c10, Phase 9). Same
shape, same fix in two consecutive modules — codified as a card
schema heuristic.

---

### 10.5 Obviously-fake placeholders for credential teaching examples

**Rule (applies to all card types AND lesson text):** credential-
shaped strings in teaching content (API keys, tokens, JWTs,
password hashes, AWS access keys, GitHub PATs) MUST use obviously-
fake placeholders on visual inspection. A randomized-but-realistic
string fails the rule even when the value is invented from
scratch.

**Why:** GitHub Secret Scanning, push protection, `detect-secrets`,
`gitleaks`, `trufflehog`, Stripe / AWS vendor scanners — all
pattern-match on credential **SHAPE**, not value. A randomized
32-char alphanumeric prefixed with `sk_test_` triggers Stripe's
scanner the same as a real key would. Push protection blocks the
push at `git push` time; rewriting the file in a follow-up commit
DOESN'T un-flag the value — every previous commit retains the
shape in history, and scanners flag it indefinitely.

**Acceptable placeholder forms:**

- **Sentinel-named:** `REDACTED_FAKE_API_KEY_FOR_TEACHING`,
  `EXAMPLE_KEY_NOT_REAL`, `PLACEHOLDER_API_KEY`. The words
  `REDACTED` / `FAKE` / `EXAMPLE` / `PLACEHOLDER` are
  scanner-friendly and reader-friendly.
- **Angle-bracket placeholders:** `<your-stripe-secret-here>`,
  `<AWS_ACCESS_KEY_ID>`, `<REPLACE_WITH_YOUR_KEY>`. The
  angle brackets unambiguously mark it as a template variable.
- **Truncated with ellipsis:** `eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo0Mn0.aBcDeF...`
  (the JWT teaching example in m4-s7-c7 already shipped safely —
  empirical confirmation that scanners tolerate obviously-
  truncated tokens). The `...` signals "this isn't the whole
  string" loud enough that scanners and readers both relax.
- **Prefix + obvious-fake suffix:** `ghp_REDACTED_FAKE_EXAMPLE`,
  `sk_test_REDACTED_EXAMPLE_xxxx`, `AKIA_EXAMPLE_REDACTED`. The
  real prefix is fine on its own (it's a category marker, not
  the secret); the suffix must be obviously synthetic.

**Forbidden forms:**

- Realistic vendor prefix + random-but-valid-length suffix —
  the canonical Secret-Scanner trigger (`sk_test_` + 32 random
  chars, `AKIA` + 16 random chars, three base64-segment JWT with
  full-length payload + signature).
- Bare 40+ char hex strings unless they're a documented public
  identifier (a real `actions/checkout` SHA in a pinning example
  is fine — SHAs are public).
- Anything that looks like a bcrypt / argon2 hash literal
  (`$2b$12$...`). Describe the shape in prose instead.

**Heuristic:** **would GitHub Secret Scanning flag this string
if it appeared in a real commit message?** If yes, the
placeholder is too realistic. The discipline is "fail every
realistic-secret heuristic" rather than "be just-realistic-
enough to look authentic."

**Recovery if you authored a too-realistic value pre-push:**
rewrite the local commit (per [[N041]] / m4-s5-c12's golden
rule, history rewriting is explicitly OK on commits that
haven't been pushed yet). The fixes:

```bash
# Option 1 — single bad commit at HEAD:
git reset --soft HEAD~1                              # uncommit
# edit the placeholder
git add <files>
git commit -c ORIG_HEAD                              # reuse message

# Option 2 — bad commit deeper in the chain:
git rebase -i <bad-commit-parent>                    # mark commit `edit`
# edit the placeholder
git add <files>
git rebase --continue
```

If the value was already pushed: rotation procedure per m4-s8-c11
(rotate the credential at the issuing system, then update the
placeholder — assume the leaked value is compromised regardless).

**Discovered:** [[N047]] (m4-s8-c11, Phase 9). A Stripe-format
teaching placeholder triggered GitHub push protection; resolved
via local reset+rewrite before push. Retroactive sweep across
Modules 1–4 ran clean — only legitimate hits found
(`REDACTED_FAKE_API_KEY_FOR_TEACHING` in m4-s8-c11, the
truncated JWT in m4-s7-c7, a real `actions/checkout` SHA in
m4-s8-c5 — public identifier not credential, an IEEE-754 binary
expansion in m3-s1 — math not hash).

**Future Phase 10 candidate:** validator-level enforcement —
add a `_check_no_realistic_secret` rule to
`scripts/validate_content.py` matching `AKIA*`,
`ghp_*`, `sk_(live|test)_*`, three-segment JWTs with each
segment ≥ 20 chars, bcrypt/argon2 hash shapes, and 40+ char
bare hex outside an explicit allow-list of teaching SHAs.
Deferred from this catalog promotion because the regex set
needs to be conservative (false positives in lesson prose
would block authoring) and the empirical sweep across four
shipped modules came back clean, so the immediate-risk
delta is small. Re-evaluate during Phase 10 when broader
content polish runs.

