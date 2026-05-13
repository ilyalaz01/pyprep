# PyPrep Curriculum — Source of Truth for Topics

This file defines **what** every PyPrep student must learn. Topics here are the curriculum scope — the knowledge each sub-task represents. The *how* (authoring rules, card schema, validation, Pyodide details, anti-Duolingo principles, workflow) lives in other documents — see cross-references in the next section.

Every card and lesson cites a `sphere_id` and `sub_task_id` from this file. If a card references an ID that isn't here, content validation (`scripts/validate_content.py`) fails.

---

## Cross-References to Other Project Documents

This file deliberately does NOT restate content owned by other docs. Authoring agents must read:

- **`docs/PRD_content_authoring.md`** — card schema, ID scheme, card types, validation rules, authoring style rules
- **`docs/PRD_code_sandbox.md`** — Pyodide runtime constraints, allowlist mechanics, sandbox security model
- **`docs/PRODUCT.md`** — product mission, target user profile, what the product is NOT
- **`DESIGN.md`** — anti-Duolingo discipline, visual / interaction language ("Peer's Notebook" lane)
- **`docs/PLAN.md`** — ADRs (architectural decisions, including ADR-019 allowlist, ADR-020 cold-start budget)
- **`docs/NOTES.md`** — open backlog including **N039** (Module 1 code_task Pyodide-compat audit — relevant whenever a sub-task here is flagged with `[CODE_TASK CAUTION]`)
- **`docs/CLAUDE_CODE_INSTRUCTIONS.md`** — workflow for AI agents authoring cards

This file owns: **topic structure + detailed knowledge points per sub-task + interview angle per sub-task + Israeli market calibration**. Nothing else.

---

## Israeli Hi-Tech Student Job Market Calibration

This curriculum exists because Israeli student-position interviews (Haifa / Tel Aviv / Herzliya, 2026) screen for a specific cluster of skills that doesn't fully match either CS coursework or generic global Python prep material. The calibration shapes what's included, what's excluded, and what depth each topic gets.

### What's overrepresented in actual student interviews

- **Python core fluency** (Module 1) — mutability traps, scope, OOP fundamentals, dunder methods. Asked in every screen at some level. Difficulty band 3–4 dominant.
- **Automation literacy** (Module 2) — parsing logs, hitting APIs, file-system work. Israeli automation positions blend QA, DevOps-lite, and scripting into a single role. Difficulty 2–4.
- **Testing competence** (Module 3) — pytest is de facto standard; `unittest` is treated as legacy. Mocking external services is constantly tested because almost every real automation task involves an external API. Difficulty 2–4.
- **Linux + Docker + SQL + Git** (Module 4) — every student position assumes basic terminal competence and container literacy. SQL JOINs appear on probably 60%+ of technical screens. Difficulty 1–4.

### What's overrepresented in interview rumor but underweighted in actual student screens

- **LeetCode-style algorithm drills** — matter for FAANG-style screens but are less central at Israeli hi-tech student positions, where take-home assignments are more common than whiteboard pressure. Out of scope; a few light Big-O touch-points in `m4-s6-t4` for vocabulary only.
- **System design at scale** — rarely appears at student level. Senior-IC+ territory.
- **Deep ML theory** — relevant for AI/GenAI Integration roles specifically; not the typical Backend/Automation student path. Out of scope.
- **Design patterns (Gang of Four)** — occasionally referenced but rarely drilled. Not worth dedicated cards.

### What's typical but rarely discussed openly

- **Reading other people's code** — interviewers often share a small codebase or function and ask the candidate to explain what it does and what could go wrong. This is one of the most underweighted interview skills in popular prep material. `code_trap` cards train this directly.
- **Walking through your own projects** — every interview includes "walk me through this project on your CV." Not directly trainable in cards, but the OOP, testing, and modern-backend topics teach the vocabulary needed to discuss architecture decisions intelligently.
- **Hebrew + English bilingual fluency** — Israeli hi-tech is mostly Hebrew-spoken / English-written. The product reflects this with English-first content and optional Russian `topic_ru` field.

### Calibration per module

- **Module 1** — "Python developer who must read and reason about Python code at the level of a Senior reviewer." Difficulty distribution skews toward 3–4.
- **Module 2** — "Automation engineer who scripts in Python daily and integrates with infrastructure tools." Difficulty 2–4 dominant; sphere `m2-s7` (FastAPI/Pydantic) added because modern Israeli backend roles increasingly expect it.
- **Module 3** — "QA engineer who writes tests, reviews PRs, explains coverage gaps." Difficulty 2–4. Mocking (sphere `m3-s4`) is the most interview-heavy topic in the module.
- **Module 4** — "Any-role engineer who navigates a Linux server, reads a Dockerfile, and writes a SELECT JOIN without Googling." Difficulty 1–4; deeper material is post-MVP.

### Notation in this file

For each sub-task below:

- **Knowledge points** — what the student must be able to recall and reason about
- **Interview angle** — the question or probe an interviewer would actually use
- **`[CODE_TASK CAUTION]`** — flag for topics where Pyodide-incompatible behavior means the topic CANNOT be authored as a `code_task` card; use `code_trap` / `multiple_choice` / `flip` instead. See `PRD_code_sandbox.md` for the constraint list and N039 in `NOTES.md` for the Module 1 audit task.

---

## Module 1 — Python Core & OOP (calibration sample, complete)

Module 1 is done — 93 cards, 7 spheres, hand-reviewed, audit-passed. Listed here for ID reference and consistency check during Modules 2–4 authoring (tone, distractor quality, difficulty distribution).

When authoring Modules 2–4, periodically open Module 1's `.cards.json` files for tone calibration.

- `m1-s0` — Foundations & Hidden Python Traps
  - `m1-s0-t1` — Mutable vs immutable types
  - `m1-s0-t2` — Mutable default arguments trap
  - `m1-s0-t3` — LEGB scope rules; `global` vs `nonlocal`
  - `m1-s0-t4` — `if __name__ == "__main__"` and import semantics

- `m1-s1` — Class Architecture
  - `m1-s1-t1` — `__init__`, `self`, instance attributes
  - `m1-s1-t2` — Class attributes vs instance attributes (shared-mutable trap)
  - `m1-s1-t3` — Encapsulation: `_protected`, `__name_mangling`
  - `m1-s1-t4` — Method types: instance / `@classmethod` / `@staticmethod`
  - `m1-s1-t5` — Type hints: `list[str]`, `Optional`, `Union`, `Callable`

- `m1-s2` — Inheritance & Exception Handling
  - `m1-s2-t1` — `class Child(Parent)`, `super().__init__()`
  - `m1-s2-t2` — Method overriding
  - `m1-s2-t3` — Multiple inheritance & MRO (`__mro__`)
  - `m1-s2-t4` — `try / except / finally / raise`
  - `m1-s2-t5` — Custom exception classes

- `m1-s3` — Dunder Methods
  - `m1-s3-t1` — `__str__` vs `__repr__`
  - `m1-s3-t2` — `__len__`, `__getitem__`, `__setitem__`
  - `m1-s3-t3` — `__eq__`, `__lt__`, `__gt__` for sorting

- `m1-s4` — Properties & Decorators
  - `m1-s4-t1` — `@property` and `@<name>.setter` (validation pattern)
  - `m1-s4-t2` — Custom decorators: closures, `*args/**kwargs` wrappers
  - `m1-s4-t3` — `functools.wraps` for metadata preservation

- `m1-s5` — Memory & Lazy Evaluation
  - `m1-s5-t1` — Generators and `yield` (vs `return`)
  - `m1-s5-t2` — Generator expressions vs list comprehensions
  - `m1-s5-t3` — Context managers (`with`, `__enter__`, `__exit__`)

- `m1-s6` — Concurrency & GIL
  - `m1-s6-t1` — What is the GIL; why `threading` doesn't speed up CPU-bound work
  - `m1-s6-t2` — `threading` vs `multiprocessing` — when to pick which
  - `m1-s6-t3` — `asyncio`: event loop, `async`/`await`, `asyncio.gather` `[CODE_TASK CAUTION — Pyodide event loop always running; `asyncio.run()` fails]`
  - `m1-s6-t4` — I/O-bound vs CPU-bound mental model

---

## Module 2 — Practical Automation, Scripting & Infrastructure

Module 2 is the automation-engineer track: handling time, files, text, serialization, networks, subprocesses, and the production-grade glue (argparse / logging / FastAPI) that turns a one-off script into something a team can run on a schedule. Sphere index in bullet form below; per-sphere knowledge points and interview angles follow as `### Sphere` sections.

- `m2-s0` — Time & Date
  - `m2-s0-t1` — `datetime.now()` vs `datetime.utcnow()`; tz-aware datetimes
  - `m2-s0-t2` — `strftime` and `strptime`
  - `m2-s0-t3` — `timedelta` for time arithmetic
  - `m2-s0-t4` — `time.sleep`, `time.perf_counter`

- `m2-s1` — Filesystem & OS
  - `m2-s1-t1` — `pathlib` paths, `resolve()`, `exists()`, `is_file()/is_dir()`
  - `m2-s1-t2` — `iterdir`, `glob`, `rglob`
  - `m2-s1-t3` — `os` and `shutil`: `makedirs`, `copy`, `move`, `rmtree`
  - `m2-s1-t4` — `os.environ.get` for secrets (never hardcode)
  - `m2-s1-t5` — `sys.exit(0/1)` for CI/CD integration

- `m2-s2` — Text & Regex
  - `m2-s2-t1` — String methods: `startswith`, `strip`, `splitlines`, `join`
  - `m2-s2-t2` — `re.search` vs `re.match` vs `re.findall`
  - `m2-s2-t3` — `re.sub` for substitution
  - `m2-s2-t4` — Capturing groups; named groups `(?P<name>...)`
  - `m2-s2-t5` — `re.compile` for performance

- `m2-s3` — Serialization Formats
  - `m2-s3-t1` — JSON: `loads`/`dumps`, `load`/`dump`, `indent`, `ensure_ascii`
  - `m2-s3-t2` — CSV: `DictReader`/`DictWriter`
  - `m2-s3-t3` — YAML: `safe_load` (and why never `load`)

- `m2-s4` — Network & APIs
  - `m2-s4-t1` — `requests.get/post`, query params, `json=` body
  - `m2-s4-t2` — Headers, bearer tokens, auth
  - `m2-s4-t3` — `timeout=`, `raise_for_status`, `RequestException`
  - `m2-s4-t4` — `pydantic` models for response validation

- `m2-s5` — Subprocess
  - `m2-s5-t1` — `subprocess.run` with arg list (not `shell=True`)
  - `m2-s5-t2` — `capture_output`, `text`, `stdout`, `stderr`
  - `m2-s5-t3` — `check=True` and `CalledProcessError`

- `m2-s6` — Production-grade Scripts
  - `m2-s6-t1` — `argparse`: required/optional args, boolean flags
  - `m2-s6-t2` — `logging`: `basicConfig`, format, levels
  - `m2-s6-t3` — Why `print` is forbidden in production code

- `m2-s7` — Modern Backend Basics
  - `m2-s7-t1` — FastAPI routing and path/query params
  - `m2-s7-t2` — Pydantic `BaseModel` for request/response validation
  - `m2-s7-t3` — Dependency injection with `Depends`
  - `m2-s7-t4` — Background tasks and async endpoints

---

### Sphere `m2-s0` — Time & Date

**Why this sphere matters in interviews:** Automation scripts live and die by time handling — cron triggers, log timestamps, retry windows, scheduled jobs. The mistakes here are subtle (naive vs aware, timezone surprises, NTP clock adjustments) and interviewers love them because they distinguish engineers who've been bitten by timezone bugs from those who haven't.

#### `m2-s0-t1` — `datetime.now()` vs `datetime.utcnow()`; tz-aware datetimes

**Knowledge points:**

- `datetime.now()` returns naive local datetime (no `tzinfo`)
- `datetime.utcnow()` returns naive UTC — deprecated in Python 3.12 because the naive part is a footgun
- Modern correct form: `datetime.now(tz=timezone.utc)` — aware datetime, no ambiguity
- Naive and aware datetimes cannot be compared → `TypeError: can't compare offset-naive and offset-aware datetimes`
- `zoneinfo.ZoneInfo("Asia/Jerusalem")` for named timezones (Python 3.9+)
- Server-side convention: store UTC, convert to local at display time

**Interview angle:** "Why is `datetime.utcnow()` not actually correct for 'right now in UTC'?" — Answer: it returns naive, which loses timezone info and breaks any comparison with aware values.

#### `m2-s0-t2` — `strftime` and `strptime`

**Knowledge points:**

- `dt.strftime(format)` — datetime → string
- `datetime.strptime(string, format)` — string → datetime
- Common codes: `%Y` `%m` `%d` `%H` `%M` `%S` `%f` (microseconds), `%Z` (zone name), `%z` (zone offset), `%a` (weekday name), `%j` (day of year)
- `dt.isoformat()` / `datetime.fromisoformat()` — modern preferred path for serialization
- Mismatched format string raises `ValueError`

**Interview angle:** "Parse this log timestamp: `2026-05-12T14:30:00.123456+03:00`." — Tests `fromisoformat()` knowledge (or correctly constructed `strptime` format).

#### `m2-s0-t3` — `timedelta` for time arithmetic

**Knowledge points:**

- `timedelta(days=7, hours=2, minutes=30, seconds=45)` constructor
- Datetime + timedelta = datetime; datetime − datetime = timedelta
- `td.total_seconds()` returns duration as float
- Negative timedeltas valid (`timedelta(days=-1)`)
- Canonical pattern: `cutoff = datetime.now() - timedelta(days=7)`; filter older items

**Interview angle:** "Find all log files older than 7 days." Tests comfortable timedelta arithmetic.

#### `m2-s0-t4` — `time.sleep`, `time.perf_counter`

**Knowledge points:**

- `time.sleep(seconds)` — accepts float; blocks the calling thread
- `time.time()` — Unix epoch seconds (float); subject to NTP clock adjustments (can go backward)
- `time.perf_counter()` — monotonic high-resolution timer; ideal for profiling; never goes backward
- `time.monotonic()` — monotonic, lower resolution; suitable for timeout logic
- Profiling pattern: `start = time.perf_counter(); do_work(); elapsed = time.perf_counter() - start`

**Interview angle:** "Why use `perf_counter` instead of `time.time()` to measure duration?" — NTP adjustments can make `time.time()` decrement, causing negative or wrong durations.

---

### Sphere `m2-s1` — Filesystem & OS

**Why this sphere matters in interviews:** Cross-platform code (Linux server vs Windows dev machine) and safe path/file handling is a basic competence test. Interviewers screen for `pathlib` fluency because `os.path.join` string-mashing marks older code; modern Python uses `pathlib`.

#### `m2-s1-t1` — `pathlib` paths, `resolve()`, `exists()`, `is_file()/is_dir()`

**Knowledge points:**

- `Path("folder") / "file.txt"` — `/` operator for path joining; works cross-platform
- `Path.cwd()`, `Path.home()` — standard locations
- `path.resolve()` — convert to absolute path
- `path.exists()`, `path.is_file()`, `path.is_dir()` — existence and type checks
- `path.parent`, `path.name`, `path.stem`, `path.suffix`, `path.parts` — component access

**Interview angle:** "Why use `pathlib` instead of `os.path.join`?" — Object-oriented, type-safe at operations, cross-platform without manual string formatting.

#### `m2-s1-t2` — `iterdir`, `glob`, `rglob`

**Knowledge points:**

- `path.iterdir()` — generator yielding direct children Paths
- `path.glob("*.log")` — non-recursive glob in current dir
- `path.rglob("*.log")` — recursive glob across subtree
- Pattern syntax: `*` (any chars, no slash), `**` (any depth), `?` (single char), `[abc]` (char class)
- Returns `Path` objects, not strings

**Interview angle:** "Find all `.log` files in a directory tree." Tests `rglob` knowledge specifically.

#### `m2-s1-t3` — `os` and `shutil`: `makedirs`, `copy`, `move`, `rmtree`

**Knowledge points:**

- `os.makedirs(path, exist_ok=True)` — create nested dirs idempotently
- `os.remove(path)` — delete file
- `shutil.copy(src, dst)` — copy file (preserves modes); `shutil.copy2` also copies metadata
- `shutil.move(src, dst)` — move or rename
- `shutil.rmtree(path)` — recursive delete (DANGEROUS: equivalent to `rm -rf`)

**Interview angle:** "Why `os.makedirs(..., exist_ok=True)` instead of checking first?" — Atomic, no TOCTOU race condition.

#### `m2-s1-t4` — `os.environ.get` for secrets (never hardcode)

**Knowledge points:**

- `os.environ` is dict of environment variables
- `os.environ.get("API_KEY")` returns `None` if absent — safe default
- `os.environ["API_KEY"]` raises `KeyError` if absent — use when secret is mandatory
- `os.getenv("API_KEY", "default")` — alternative with explicit default
- Why hardcoding secrets is a fireable offense: leak into git history, logs, tracebacks, screenshots
- `python-dotenv` `load_dotenv()` for loading `.env` files in local dev

**Interview angle:** "Where do you store your API keys?" — Tests basic security hygiene; correct answer involves env vars + secrets manager, never source.

#### `m2-s1-t5` — `sys.exit(0/1)` for CI/CD integration

**Knowledge points:**

- `sys.exit(0)` — success exit code (default on normal script end)
- `sys.exit(1)` — generic failure exit code
- CI/CD systems (Jenkins, GitLab CI, GitHub Actions) read exit code to determine pipeline success/failure
- `sys.argv` — command-line args (argv[0] is script name); `sys.stderr` — stderr stream
- Pattern: catch top-level exception, log it, `sys.exit(1)`

**Interview angle:** "How does your script tell Jenkins it failed?" — Exit code, not log message.

---

### Sphere `m2-s2` — Text & Regex

**Why this sphere matters in interviews:** Probably 30% of Automation engineer interview tasks involve parsing text — log lines, config files, output of shell commands. Regex fluency is heavily tested because it separates engineers who can extract structured data quickly from those who write fragile string splits.

#### `m2-s2-t1` — String methods: `startswith`, `strip`, `splitlines`, `join`

**Knowledge points:**

- `s.startswith(prefix)` / `s.endswith(suffix)` — boolean checks; accept tuple for multiple options
- `s.strip()` / `s.lstrip()` / `s.rstrip()` — whitespace removal; accept chars argument
- `s.splitlines()` — split on line boundaries (handles `\n`, `\r\n`, `\r`); preferred over `s.split("\n")` for cross-platform safety
- `s.split(sep, maxsplit=-1)` — generic split
- `sep.join(iterable)` — concatenate strings with separator (note: separator is the method receiver, not argument)
- `s.replace(old, new)`, `s.lower()`, `s.upper()`, `s.casefold()`

**Interview angle:** "Read a file, ignore empty lines and comments starting with `#`." Tests `strip` + `startswith` fluency.

#### `m2-s2-t2` — `re.search` vs `re.match` vs `re.findall`

**Knowledge points:**

- `re.search(pattern, string)` — searches anywhere; returns Match or None
- `re.match(pattern, string)` — anchored at start; returns Match or None
- `re.findall(pattern, string)` — list of all non-overlapping matches
- `re.finditer(pattern, string)` — generator of Match objects (better when you need groups)
- `re.fullmatch(pattern, string)` — entire string must match
- Match object: `m.group(0)` (whole match), `m.group(1)` (first group), `m.start()`, `m.end()`

**Interview angle:** "What's the difference between `re.match` and `re.search`?" — Anchored vs unanchored.

#### `m2-s2-t3` — `re.sub` for substitution

**Knowledge points:**

- `re.sub(pattern, replacement, string, count=0)` — replace matches
- `count=1` for single replacement
- Replacement can be a function: `re.sub(pattern, lambda m: ..., string)` for complex transforms
- Backreferences in replacement string: `r"\1"` refers to first captured group
- Canonical use case: mask passwords or tokens in logs

**Interview angle:** "Mask all email addresses in this log file." Tests `re.sub` with a sufficient pattern.

#### `m2-s2-t4` — Capturing groups; named groups `(?P<name>...)`

**Knowledge points:**

- `()` creates a capturing group; access via `m.group(1)`, `m.group(2)`, ...
- `(?:...)` non-capturing group — group without capturing
- `(?P<name>...)` named capturing group; access via `m.group("name")` or `m.groupdict()`
- `m.groups()` tuple of all groups; `m.groupdict()` dict of named groups
- Why named groups: readable, robust to pattern edits that shift positional indices

**Interview angle:** "Extract IP address and timestamp from this log line, name them clearly." Tests named-group fluency.

#### `m2-s2-t5` — `re.compile` for performance

**Knowledge points:**

- `pattern = re.compile(r"...")` — compile once, reuse many times
- Compiled pattern has `.search`, `.match`, `.findall`, `.sub` methods
- Significant performance benefit when applying same regex to many inputs
- Common bug: re-compiling the same pattern inside a loop
- Flags combine with `|`: `re.compile(r"...", re.IGNORECASE | re.MULTILINE)`

**Interview angle:** "You're processing 10,000 log lines with the same regex. What's the optimization?" — Compile once outside the loop.

---

### Sphere `m2-s3` — Serialization Formats

**Why this sphere matters in interviews:** Every script that exchanges data uses JSON, CSV, or YAML. Fluency is assumed and rarely the focus, but the security and unicode gotchas (YAML `load` vs `safe_load`, CSV quoting, JSON `ensure_ascii`) are common screening questions.

#### `m2-s3-t1` — JSON: `loads`/`dumps`, `load`/`dump`, `indent`, `ensure_ascii`

**Knowledge points:**

- `json.loads(string)` / `json.dumps(obj)` — string ↔ dict/list
- `json.load(file)` / `json.dump(obj, file)` — file-based variants
- `json.dumps(obj, indent=4)` — pretty-print
- `json.dumps(obj, ensure_ascii=False)` — preserve Unicode (Hebrew, Cyrillic) instead of escaping to `\u...`
- `json.dumps(obj, sort_keys=True)` — deterministic key order (useful for diffing JSON files)
- `dumps` of non-serializable type (`set`, `datetime`) raises `TypeError`; provide `default=str` or custom encoder

**Interview angle:** "Why does your JSON output show `\u05d0` instead of `א`?" — Default `ensure_ascii=True`; set False for native Unicode.

#### `m2-s3-t2` — CSV: `DictReader`/`DictWriter`

**Knowledge points:**

- `csv.reader(file)` — rows as lists; index-based column access
- `csv.DictReader(file)` — rows as dicts keyed by header; name-based access
- `csv.writer(file)` / `csv.DictWriter(file, fieldnames=[...])` — write side
- `DictWriter` requires `fieldnames` and explicit `writeheader()` call before rows
- Open with `newline=""` to avoid extra blank lines on Windows
- `csv.QUOTE_ALL`, `csv.QUOTE_MINIMAL` — quoting strategies
- Why prefer DictReader: readable code, robust to column reordering

**Interview angle:** "Read a CSV and sum the 'amount' column." — DictReader pattern is the right answer.

#### `m2-s3-t3` — YAML: `safe_load` (and why never `load`)

**Knowledge points:**

- YAML is a superset of JSON, designed for human-editable config; infrastructure-as-code standard (Docker Compose, Kubernetes, GitHub Actions, Ansible)
- `pip install pyyaml` — third-party (not stdlib)
- `yaml.safe_load(stream)` — secure parser, basic types only
- `yaml.load(stream)` — unsafe; can instantiate arbitrary Python objects via tags → remote code execution from malicious YAML
- Rule: never `yaml.load` without explicit `Loader=SafeLoader` (and even then prefer `safe_load`)
- `yaml.safe_dump(data, stream)` — serialize

**Interview angle:** "Why is `yaml.load` considered dangerous?" — RCE vector via `!!python/object:os.system` and similar tags.

---

### Sphere `m2-s4` — Network & APIs

**Why this sphere matters in interviews:** Automation scripts integrate with external services. The `requests` library is the de facto standard, and the failure modes (timeouts, retries, error handling) are the most interview-tested aspects because they distinguish naive scripts from production-ready ones.

`[CODE_TASK CAUTION — entire sphere]` Real network calls disabled in Pyodide worker; author all `m2-s4` cards as `code_trap` / `multiple_choice` / `flip` / `fill_in`.

#### `m2-s4-t1` — `requests.get/post`, query params, `json=` body

**Knowledge points:**

- `requests.get(url, params={...})` — params dict becomes `?key=value&...` query string
- `requests.post(url, json={...})` — `json=` auto-serializes, sets Content-Type, encodes properly
- `requests.post(url, data={...})` — form-encoded body (`application/x-www-form-urlencoded`)
- `requests.put`, `requests.delete`, `requests.patch` — full HTTP method coverage
- `response.json()` — deserialize body as JSON
- `response.text` — body as string; `response.content` — body as bytes
- `response.status_code` — HTTP status int

**Interview angle:** "What's the difference between `data=` and `json=` parameters?" — Content-Type and serialization strategy.

#### `m2-s4-t2` — Headers, bearer tokens, auth

**Knowledge points:**

- `requests.get(url, headers={"Authorization": f"Bearer {token}"})` — custom header
- `requests.get(url, auth=("user", "pass"))` — HTTP Basic Auth
- `requests.Session()` — persists cookies and connection pool; faster for many calls to same host
- `session.headers.update({...})` — set headers for all session requests
- Conventions: API key in `X-API-Key` header, JWT in `Authorization: Bearer`
- Why not in query string: appears in server logs, browser history, Referer headers

**Interview angle:** "How do you authenticate to an API with a Bearer token?" — `Authorization: Bearer <token>` header.

#### `m2-s4-t3` — `timeout=`, `raise_for_status`, `RequestException`

**Knowledge points:**

- `requests.get(url, timeout=5)` — float seconds; without it, request can hang indefinitely (real production incident pattern)
- `timeout` can be tuple: `(connect_timeout, read_timeout)`
- `response.raise_for_status()` — raises `HTTPError` on 4xx/5xx; does nothing on 2xx
- `requests.exceptions.Timeout` — timeout expired
- `requests.exceptions.ConnectionError` — host unreachable
- `requests.exceptions.RequestException` — base class for all `requests` exceptions; catch this for any request failure
- Pattern: try / except `RequestException` / log / retry-or-fail

**Interview angle:** "What goes wrong if you don't set a timeout?" — Script hangs forever, breaking pipelines, consuming resources.

#### `m2-s4-t4` — `pydantic` models for response validation

**Knowledge points:**

- `pydantic.BaseModel` — define expected response shape with type hints
- `MyModel.model_validate(data)` — parse and validate; raises `ValidationError` on mismatch
- `MyModel.model_validate_json(json_string)` — parse JSON directly
- Auto-coerces compatible types (`"5"` → `5` for int field) by default; configurable via `model_config`
- `Field(..., gt=0)` — value constraints; `Optional[str]` — nullable fields
- Returns typed objects: IDE autocomplete, type-checker friendly
- Modern Israeli backend roles increasingly require Pydantic fluency (FastAPI ecosystem foundation)

**Interview angle:** "How do you handle an API response with extra fields you don't care about?" — Pydantic permissive mode (default) ignores unknown fields.

---

### Sphere `m2-s5` — Subprocess

**Why this sphere matters in interviews:** Whenever a Python library doesn't exist for some tool, automation engineers shell out via `subprocess`. The security concerns (`shell=True` is dangerous), error handling, and stdout/stderr capture are common topics because they distinguish engineers who write safe code from those who write injection vulnerabilities.

`[CODE_TASK CAUTION — entire sphere]` No subprocess support in Pyodide; author all `m2-s5` cards as `code_trap` / `multiple_choice` / `flip` / `fill_in`.

#### `m2-s5-t1` — `subprocess.run` with arg list (not `shell=True`)

**Knowledge points:**

- `subprocess.run(["ls", "-l", "/var/log"])` — pass args as list; safe, no shell interpretation
- `subprocess.run("ls -l /var/log", shell=True)` — DANGEROUS: shell interprets the string; injection vector if any part comes from user input
- Why list form is safe: args passed directly to OS exec call, no shell parsing
- Why `shell=True` is sometimes needed: shell features like pipes, globs, env var expansion
- Even with `shell=True`, never concatenate user input; use `shlex.quote(s)` to escape

**Interview angle:** "Why is `shell=True` dangerous?" — Shell injection vulnerability if input is untrusted.

#### `m2-s5-t2` — `capture_output`, `text`, `stdout`, `stderr`

**Knowledge points:**

- `subprocess.run(args, capture_output=True)` — capture stdout and stderr into result
- `subprocess.run(args, text=True)` — decode output as str instead of bytes
- `result.stdout`, `result.stderr`, `result.returncode` — read after completion
- Modern idiomatic form: `subprocess.run(args, capture_output=True, text=True)`
- Older alternative: `subprocess.check_output()` (returns stdout, raises on error)
- For streaming/interactive: `subprocess.Popen` with `stdout=PIPE`, `stdin=PIPE`

**Interview angle:** "Run `git status` and read its output." — Tests `capture_output` + `text` together.

#### `m2-s5-t3` — `check=True` and `CalledProcessError`

**Knowledge points:**

- `subprocess.run(args, check=True)` — raises `CalledProcessError` on non-zero exit
- Without `check=True`, script silently continues even if command failed
- `CalledProcessError` has `.returncode`, `.cmd`, `.output`, `.stderr`
- Pattern: `try: subprocess.run(...) except CalledProcessError as e: log.error(...)`
- Alternative: manually check `result.returncode != 0`
- Why `check=True` is the right default: failures should be loud, not silent

**Interview angle:** "Your script calls `kubectl apply` and the apply fails. What does your code see?" — Without `check=True`, nothing; script continues happily.

---

### Sphere `m2-s6` — Production-grade Scripts

**Why this sphere matters in interviews:** The leap from "script that works on my laptop" to "script that runs as a scheduled job in production" is a competence marker. CLI argument handling and structured logging are minimum bars.

#### `m2-s6-t1` — `argparse`: required/optional args, boolean flags

**Knowledge points:**

- `parser = argparse.ArgumentParser(description="...")`
- `parser.add_argument("input_file")` — positional argument (required)
- `parser.add_argument("--output", "-o", default="out.txt")` — optional named
- `parser.add_argument("--verbose", "-v", action="store_true")` — boolean flag
- `parser.add_argument("--count", type=int, default=1)` — type coercion at parse time
- `parser.add_argument("--mode", choices=["fast", "slow"])` — restricted values
- `args = parser.parse_args()` — returns `Namespace`; attribute access on `args.input_file` etc.
- Auto-generates `--help` and error messages on bad input

**Interview angle:** "Your script needs to accept an input file (required) and an optional output path. How do you build the CLI?" — Tests argparse fluency.

#### `m2-s6-t2` — `logging`: `basicConfig`, format, levels

**Knowledge points:**

- `logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")` — root logger config
- `logger = logging.getLogger(__name__)` — per-module logger pattern
- Levels: DEBUG < INFO < WARNING < ERROR < CRITICAL
- `logger.debug(...)`, `logger.info(...)`, `logger.warning(...)`, `logger.error(...)`, `logger.exception(...)`
- `logger.exception("message")` — like error but also logs traceback (call from inside `except` block)
- Common format tokens: `%(asctime)s`, `%(levelname)s`, `%(name)s`, `%(message)s`, `%(funcName)s`, `%(lineno)d`

**Interview angle:** "How do you log the full traceback when catching an exception?" — `logger.exception()`, not `logger.error(str(e))`.

#### `m2-s6-t3` — Why `print` is forbidden in production code

**Knowledge points:**

- `print` writes to stdout with no metadata: no timestamp, no level, no module name
- `print` can't be filtered by severity (no "show only errors")
- `print` can't be routed per-handler (errors to file, info to console)
- `print` doesn't integrate with log aggregation (Datadog, ELK, Splunk, CloudWatch)
- Result: in production, `print` output is unsearchable, untaggable, undated noise
- Even debug `print` should be `logger.debug(...)` to be enable-able per environment

**Interview angle:** "Why is `print` not OK in production?" — Operational invisibility; can't filter, route, or correlate.

---

### Sphere `m2-s7` — Modern Backend Basics

**Why this sphere matters in interviews:** FastAPI has become the modern Israeli backend standard, especially for student/junior positions. It's increasingly expected even when the role isn't "FastAPI developer." Pydantic models (which back FastAPI) appear in interviews as a competency signal for modern Python.

`[CODE_TASK CAUTION — entire sphere]` FastAPI requires uvicorn/asyncio server (not runnable in Pyodide); author cards as `code_trap` / `multiple_choice` / `flip` / `fill_in`. Pydantic-only behavior (without FastAPI) may be `code_task` if pydantic is loadable in the worker.

#### `m2-s7-t1` — FastAPI routing and path/query params

**Knowledge points:**

- `from fastapi import FastAPI; app = FastAPI()`
- `@app.get("/items/{item_id}")` — path param via curly braces
- `def read_item(item_id: int):` — type hint provides validation and auto-coercion
- Query params: non-path function args become query params (`def read_items(skip: int = 0, limit: int = 10)`)
- `@app.post("/items")` — POST endpoint; body via Pydantic model parameter
- Return value: dict, list, Pydantic model — auto-serialized to JSON
- `/docs` — auto-generated Swagger UI; `/redoc` — ReDoc alternative
- vs Flask: type-driven validation, auto-generated docs, async-first

**Interview angle:** "How does FastAPI know what type the URL parameter should be?" — Type hint on function signature.

#### `m2-s7-t2` — Pydantic `BaseModel` for request/response validation

**Knowledge points:**

- `class Item(BaseModel): name: str; price: float` — model definition
- Request body: `def create_item(item: Item):` — FastAPI parses, validates, type-checks
- Response: `@app.get(..., response_model=Item)` or return Item instance
- Constraints: `Field(..., gt=0, max_length=50)`
- Nullable: `Optional[str] = None`
- Nested: `class Order(BaseModel): items: list[Item]`
- Validation errors → automatic 422 response with detailed location info

**Interview angle:** "How does FastAPI return a 422 when the request body is wrong?" — Pydantic ValidationError caught and converted to 422.

#### `m2-s7-t3` — Dependency injection with `Depends`

**Knowledge points:**

- `from fastapi import Depends`
- `def get_db(): db = connect(); try: yield db; finally: db.close()` — generator dependency
- `def read_items(db = Depends(get_db)):` — injected at request time
- Dependencies can depend on other dependencies (chained DI)
- Common uses: DB session, current user from JWT, config/settings
- Same dependency in multiple endpoints → cached within single request
- Type-safe form: `db: Database = Depends(get_db)`

**Interview angle:** "How do you share a database connection across endpoints?" — `Depends` with generator dependency.

#### `m2-s7-t4` — Background tasks and async endpoints

**Knowledge points:**

- `async def endpoint(...):` — async; FastAPI runs on event loop
- Inside async endpoint: `await some_async_call()`; never block with sync I/O
- Sync endpoint (`def`): FastAPI runs it in thread pool to avoid blocking event loop
- `BackgroundTasks`: `def endpoint(bg: BackgroundTasks): bg.add_task(send_email, user)` — fire-and-forget after response
- Background tasks run AFTER response is sent; not for critical work
- For real background work (cron-like, retries, durability): Celery or similar, not BackgroundTasks

**Interview angle:** "When should you use `async def` vs `def` in FastAPI?" — async if body awaits I/O; sync if CPU-bound (thread pool absorbs cost).

---

## Module 3 — Testing & QA

Module 3 is the testing track: philosophy first, then `pytest` mechanics, then fixtures, mocking, and coverage. Sphere index in bullet form below; per-sphere knowledge points and interview angles follow as `### Sphere` sections.

- `m3-s0` — Philosophy
  - `m3-s0-t1` — Test pyramid: unit / integration / E2E
  - `m3-s0-t2` — AAA pattern: Arrange / Act / Assert (one Act per test)

- `m3-s1` — pytest Basics
  - `m3-s1-t1` — File naming `test_*.py`, function naming `test_*`
  - `m3-s1-t2` — `assert` patterns (equality, truthiness, `in`)
  - `m3-s1-t3` — CLI flags: `-v`, `-s`, `-k keyword`, `::test_id`

- `m3-s2` — Errors & Parametrization
  - `m3-s2-t1` — `pytest.raises(ExceptionType, match=...)`
  - `m3-s2-t2` — `@pytest.mark.parametrize`
  - `m3-s2-t3` — `@pytest.mark.skip`, `xfail`

- `m3-s3` — Fixtures
  - `m3-s3-t1` — `@pytest.fixture` and dependency injection
  - `m3-s3-t2` — `yield` for setup/teardown
  - `m3-s3-t3` — Scope: `function`, `class`, `module`, `session`
  - `m3-s3-t4` — `conftest.py` for shared fixtures

- `m3-s4` — Mocking & Patching
  - `m3-s4-t1` — `Mock` vs `MagicMock`; `return_value`
  - `m3-s4-t2` — `assert_called`, `assert_called_once_with`
  - `m3-s4-t3` — `@patch("module.where_used.func")` (mock where used, not defined)
  - `m3-s4-t4` — `with patch(...) as mock:` context-manager form
  - `m3-s4-t5` — `side_effect` for exceptions and sequences

- `m3-s5` — Coverage
  - `m3-s5-t1` — `pytest --cov=pkg tests/`
  - `m3-s5-t2` — HTML report; identifying uncovered branches

---

### Sphere `m3-s0` — Philosophy

**Why this sphere matters in interviews:** Before any test code is discussed, interviewers screen for vocabulary — does the candidate know what a unit test is vs an integration test? This is the conversation that filters out candidates who've never thought about testing strategy.

#### `m3-s0-t1` — Test pyramid: unit / integration / E2E

**Knowledge points:**

- **Unit tests:** single function or class in isolation; no I/O, no network, no DB; mocks for dependencies; fast (ms)
- **Integration tests:** multiple components together (function + real DB; two services); slower (100ms–seconds); fewer than unit
- **E2E tests:** full user flows through real systems (browser automation, real API calls); slowest (seconds–minutes); fewest
- Pyramid shape: many unit, fewer integration, very few E2E
- Inverted pyramid (lots of E2E, few unit) is anti-pattern: slow CI, fragile tests, hard debugging
- Why each level: unit catches logic bugs, integration catches contract bugs, E2E catches whole-system bugs

**Interview angle:** "Why don't you just write E2E tests for everything?" — Speed, fragility, debugging difficulty.

#### `m3-s0-t2` — AAA pattern: Arrange / Act / Assert (one Act per test)

**Knowledge points:**

- **Arrange:** set up inputs, fixtures, mocks (typically the longest section)
- **Act:** the single function call or operation under test (one line)
- **Assert:** verify outcome matches expectation
- Rule: one Act per test; if you're testing two function calls, split into two tests
- Why: test failures should point to one specific behavior
- Common anti-pattern: long test with many asserts spread across multiple actions

**Interview angle:** "Why separate setup from the call you're testing?" — Localizes failures, improves readability.

---

### Sphere `m3-s1` — pytest Basics

**Why this sphere matters in interviews:** pytest is de facto standard in modern Israeli Python codebases. `unittest` (stdlib) is treated as legacy. Basic pytest CLI fluency is assumed.

#### `m3-s1-t1` — File naming `test_*.py`, function naming `test_*`

**Knowledge points:**

- Test files must be named `test_*.py` or `*_test.py` (default discovery rules)
- Test functions must be named `test_*` — otherwise pytest doesn't find them
- Test classes must be named `Test*` and have no `__init__`
- Configurable via `[tool.pytest.ini_options]` in `pyproject.toml`; defaults are universal
- Conventional layout: `tests/` directory mirroring source structure
- Discovery is recursive by default

**Interview angle:** "Why doesn't pytest find your test?" — Naming convention violation.

#### `m3-s1-t2` — `assert` patterns (equality, truthiness, `in`)

**Knowledge points:**

- `assert x == 5` — equality; pytest introspects to show actual values on failure
- `assert is_valid is True` or `assert is_valid` — truthiness
- `assert "error" in log_string` — substring/membership
- `assert x != y`, `assert x > 5`, `assert isinstance(x, list)` — other comparisons
- pytest's assertion rewriting (at import time) is what enables introspection
- No `assertEqual`, `assertIn`, etc. — that's unittest-style; pytest uses plain `assert`
- `pytest.approx(0.3)` — float comparison with tolerance

**Interview angle:** "Why does pytest show actual values on assertion failure?" — Assertion rewriting at import time.

#### `m3-s1-t3` — CLI flags: `-v`, `-s`, `-k keyword`, `::test_id`

**Knowledge points:**

- `pytest` — run all tests in current directory tree
- `pytest tests/test_api.py` — single file
- `pytest tests/test_api.py::test_login` — single test by name
- `pytest -v` — verbose: prints each test name and result
- `pytest -s` — disable stdout capture (allows `print()` to be seen during test run)
- `pytest -k "login or logout"` — run tests matching keyword expression
- `pytest -m "slow"` — run tests marked with custom mark
- `pytest -x` — stop on first failure
- `pytest --pdb` — drop into debugger on failure

**Interview angle:** "How do you run only one test from a file?" — `pytest file.py::test_name`.

---

### Sphere `m3-s2` — Errors & Parametrization

**Why this sphere matters in interviews:** Testing that exceptions are raised correctly, and avoiding duplicated test code through parametrization, are universal pytest skills. Parametrization in particular is a maturity marker — engineers who write 5 separate tests for 5 similar cases vs one parametrized test.

#### `m3-s2-t1` — `pytest.raises(ExceptionType, match=...)`

**Knowledge points:**

- `with pytest.raises(ValueError): function_that_should_raise(...)` — context manager
- `with pytest.raises(ValueError, match="Port must be positive"): ...` — also asserts message matches regex
- Test fails if no exception raised, or wrong type
- Capture the exception: `with pytest.raises(ValueError) as exc_info: ...; assert "port" in str(exc_info.value)`
- Use for testing custom exceptions, validation, defensive code

**Interview angle:** "How do you test that `parse_url('')` raises a ValueError?" — `pytest.raises(ValueError)` context.

#### `m3-s2-t2` — `@pytest.mark.parametrize`

**Knowledge points:**

- `@pytest.mark.parametrize("input,expected", [(1, 2), (3, 6), (0, 0)])` — runs test N times with different args
- Parameter names match function args
- Each parametrized run is a separate test (separate line in output)
- Multiple parametrize decorators stack → cartesian product
- `pytest.param(value, marks=pytest.mark.skip)` — mark individual cases
- IDs for readability: `pytest.param(1, 2, id="positive_input")`
- Use for boundary conditions: empty, single item, many items, edge values

**Interview angle:** "You have 6 different valid inputs to verify. How do you test without 6 separate functions?" — `@pytest.mark.parametrize`.

#### `m3-s2-t3` — `@pytest.mark.skip`, `xfail`

**Knowledge points:**

- `@pytest.mark.skip(reason="not implemented")` — skip; shows SKIPPED
- `@pytest.mark.skipif(condition, reason="...")` — conditional skip
- `@pytest.mark.xfail(reason="known bug, see #123")` — expected to fail; XPASS if actually passes
- `@pytest.mark.xfail(strict=True)` — XPASS becomes a failure (catches accidentally-fixed bugs)
- Use skip for environmental reasons (no DB available); xfail for known-broken
- Don't use skip/xfail to silence flaky tests — fix the test

**Interview angle:** "Difference between skip and xfail?" — Skip = "don't run"; xfail = "run but expect failure."

---

### Sphere `m3-s3` — Fixtures

**Why this sphere matters in interviews:** Fixtures are pytest's killer feature. They're how you avoid copy-pasting setup code. Interviewers expect fluency with `@pytest.fixture`, `yield`-style cleanup, and the scope hierarchy. One of the most common pytest topics in technical screens.

#### `m3-s3-t1` — `@pytest.fixture` and dependency injection

**Knowledge points:**

- `@pytest.fixture; def sample_user(): return User(...)` — fixture definition
- Tests request fixtures by parameter name: `def test_login(sample_user): ...`
- pytest resolves and passes them in automatically
- Fixtures can request other fixtures (chained DI)
- Default scope is `function` — re-created per test
- Naming: descriptive nouns (`sample_user`, `client`, `db_session`)

**Interview angle:** "How does pytest know to inject `sample_user` into your test?" — Name matching + fixture decorator.

#### `m3-s3-t2` — `yield` for setup/teardown

**Knowledge points:**

- `@pytest.fixture; def db_session(): conn = connect(); yield conn; conn.close()`
- Code before `yield` runs as setup
- Yielded value is what the test receives
- Code after `yield` runs as teardown — even if the test fails or raises
- More readable than older `request.addfinalizer()` pattern
- Common uses: open/close connections, create/delete temp files, set/reset env vars

**Interview angle:** "How do you ensure a database connection is closed even if the test crashes?" — `yield` fixture; teardown runs regardless.

#### `m3-s3-t3` — Scope: `function`, `class`, `module`, `session`

**Knowledge points:**

- `@pytest.fixture(scope="function")` — default; re-created for each test
- `@pytest.fixture(scope="class")` — shared across tests in a class
- `@pytest.fixture(scope="module")` — shared across tests in a file
- `@pytest.fixture(scope="session")` — created once for entire test run
- Session scope for expensive setups (heavy DB connection, big data load)
- Function scope (default) when test isolation requires fresh state
- A function-scoped fixture can use a session-scoped one, not the reverse

**Interview angle:** "Your DB connection takes 5 seconds. How do you avoid 5 seconds per test?" — `scope="session"`.

#### `m3-s3-t4` — `conftest.py` for shared fixtures

**Knowledge points:**

- `conftest.py` — magic filename pytest auto-discovers in test directories
- Fixtures in `conftest.py` are available to all tests in that directory and subdirectories
- No `import` needed — pytest wires them
- Multiple `conftest.py` files possible (one per level); fixtures cascade down
- Common uses: shared `client` fixture, shared DB setup, mock helpers
- Also for pytest hooks and plugin config

**Interview angle:** "Fixture used in 10 test files across 3 directories. Where do you put it?" — `conftest.py` at highest common parent.

---

### Sphere `m3-s4` — Mocking & Patching

**Why this sphere matters in interviews:** This is **the** most-tested testing topic in Israeli interviews. Real automation work requires mocking external APIs, databases, file systems. Engineers who can't mock can't write unit tests; engineers who mock badly write fragile tests. The "mock where it is used, not where it is defined" rule is asked in probably 40% of QA/Automation screens.

#### `m3-s4-t1` — `Mock` vs `MagicMock`; `return_value`

**Knowledge points:**

- `from unittest.mock import Mock, MagicMock`
- `Mock()` — basic mock; attribute access returns another Mock; method calls return Mocks
- `MagicMock()` — like Mock but also supports magic methods (`__len__`, `__iter__`, `__contains__`, etc.)
- `m = Mock(); m.method.return_value = 42; m.method()` returns 42
- `m.return_value` — what calling the mock itself returns: `m()` returns this
- Mocks remember all calls: `m.call_args`, `m.call_count`, `m.call_args_list`
- Use Mock when production code does plain attribute access; MagicMock when it uses magic methods

**Interview angle:** "When MagicMock over Mock?" — Magic method support.

#### `m3-s4-t2` — `assert_called`, `assert_called_once_with`

**Knowledge points:**

- `m.assert_called()` — fails if mock wasn't called
- `m.assert_called_once()` — fails if not called exactly once
- `m.assert_called_with(*args, **kwargs)` — last call matched these args
- `m.assert_called_once_with(*args, **kwargs)` — combination
- `m.assert_any_call(*args, **kwargs)` — some call matched
- `m.assert_not_called()` — fails if was called
- Common pitfall: typo in assert name like `m.asert_called` silently passes (Mock returns another Mock for unknown attributes)
- Defense: `mock.create_autospec(real_obj)` constrains mock to real interface

**Interview angle:** "How do you verify `client.send()` was called with the right URL?" — `mock.assert_called_with(url="https://...")`.

#### `m3-s4-t3` — `@patch("module.where_used.func")` (mock where used, not defined)

**Knowledge points:**

- `from unittest.mock import patch`
- `@patch("my_app.api_client.requests.get")` — replaces `requests.get` within `my_app.api_client`
- **The Golden Rule:** patch the name in the namespace where it's looked up, NOT where it's originally defined
- Example: if `my_app/api.py` does `from requests import get` and calls `get(url)`, patch `my_app.api.get`, not `requests.get`
- Reason: `from X import Y` creates a new name binding in the importing module; patching `X.Y` doesn't affect that binding
- Misunderstanding this is the #1 mocking bug; commonly asked interview question

**Interview angle:** "Your test mocks `requests.get` but the code still hits the real URL. Why?" — Wrong patch target.

#### `m3-s4-t4` — `with patch(...) as mock:` context-manager form

**Knowledge points:**

- `with patch("module.func") as mock_func: mock_func.return_value = ...; code_under_test()`
- Context manager applies patch only within the block
- Decorator form `@patch(...)` applies to whole test; multiple decorators stack
- Order: decorators apply bottom-up; bottommost is first arg
- `patch.object(obj, "method")` — patch attribute on object
- `patch.dict(env, {"KEY": "VAL"})` — patch dict contents

**Interview angle:** "How do you mock only one call in a long test without affecting other code?" — `with patch(...)` block.

#### `m3-s4-t5` — `side_effect` for exceptions and sequences

**Knowledge points:**

- `mock.side_effect = ValueError("...")` — mock raises this exception when called
- `mock.side_effect = [1, 2, 3]` — mock returns 1, then 2, then 3; raises StopIteration after
- `mock.side_effect = func` — call this function each time, return its result
- Use to test retry logic, error handling, sequence-dependent code
- Canonical pattern: `mock.side_effect = [ConnectionError(), ConnectionError(), Response(200)]` — fail twice, succeed third

**Interview angle:** "How do you test that your retry function actually retries after a timeout?" — `mock.side_effect = [Timeout(), Timeout(), Response()]`.

---

### Sphere `m3-s5` — Coverage

**Why this sphere matters in interviews:** Coverage isn't itself a quality measure (100% coverage can have terrible tests), but knowing how to measure it and interpret the gaps is expected. Common probe: "what's your project's coverage?" — looking for a real number with awareness of its limits.

#### `m3-s5-t1` — `pytest --cov=pkg tests/`

**Knowledge points:**

- `pip install pytest-cov` (third-party plugin)
- `pytest --cov=myapp tests/` — collect coverage for `myapp` while running tests
- Output shows percentage per file
- `--cov-fail-under=80` — fail run below threshold; CI gate
- `--cov-branch` — also measure branch coverage (which `if` branches were taken)
- Coverage measures execution, not assertion quality

**Interview angle:** "Does 100% coverage mean your tests are good?" — No; measures execution, not assertion quality.

#### `m3-s5-t2` — HTML report; identifying uncovered branches

**Knowledge points:**

- `pytest --cov=myapp --cov-report=html tests/` — generates `htmlcov/index.html`
- Per-file breakdown; click file for annotated source
- Red lines = not executed; green = executed
- Yellow = branch not fully covered (with `--cov-branch`)
- Use to find untested error paths
- `--cov-report=term-missing` — terminal version with line numbers

**Interview angle:** "Your error handling block has no coverage. What do you do?" — Add a test that triggers the error condition.

---

## Module 4 — Linux, Docker, SQL, Git, Tooling & Operations

Module 4 is the operational-engineer track: the terminal, container runtime, SQL queries, version control, Python tooling, and the three extension spheres added in `78278a5` (web security, CI/CD, bash scripting). Sphere index in bullet form below; per-sphere knowledge points and interview angles follow as `### Sphere` sections.

- `m4-s0` — Networking Fundamentals
  - `m4-s0-t1` — IP, ports, localhost; common ports
  - `m4-s0-t2` — TCP vs UDP; HTTP-over-TCP
  - `m4-s0-t3` — DNS resolution; HTTP request/response anatomy
  - `m4-s0-t4` — Status codes: 200, 400, 401, 403, 404, 500

- `m4-s1` — Linux CLI Basics
  - `m4-s1-t1` — `pwd`, `cd`, `ls -la`
  - `m4-s1-t2` — `touch`, `mkdir`, `rm -rf` (and dangers)
  - `m4-s1-t3` — `cp`, `mv`
  - `m4-s1-t4` — Permissions: `r/w/x`; `chmod` numeric and `+x`; `chown`; `sudo`

- `m4-s2` — Linux Operations
  - `m4-s2-t1` — `cat`, `less`, `tail -f`, `tail -n`
  - `m4-s2-t2` — `find` for files by age/name
  - `m4-s2-t3` — `>`, `>>`, pipe `|`
  - `m4-s2-t4` — `grep` (basic, `-i`, `-v`); `awk` for column extraction
  - `m4-s2-t5` — `top`/`htop`, `ps aux | grep`, `kill` / `kill -9`
  - `m4-s2-t6` — `df -h`, `free -m`

- `m4-s3` — Docker
  - `m4-s3-t1` — Image vs container
  - `m4-s3-t2` — `Dockerfile`: `FROM`, `WORKDIR`, `COPY`, `RUN`
  - `m4-s3-t3` — `CMD` vs `ENTRYPOINT`
  - `m4-s3-t4` — `build`, `run -d`, `ps`, `logs`, `exec -it bash`
  - `m4-s3-t5` — Port mapping `-p`; volumes `-v` for persistence

- `m4-s4` — SQL
  - `m4-s4-t1` — `SELECT`, `WHERE` (`AND`, `OR`, `IN`, `LIKE`)
  - `m4-s4-t2` — `INSERT`, `UPDATE`, `DELETE`
  - `m4-s4-t3` — `COUNT`, `SUM`, `AVG`, `MAX`, `MIN`
  - `m4-s4-t4` — `GROUP BY` and `HAVING` vs `WHERE`
  - `m4-s4-t5` — `INNER JOIN` vs `LEFT JOIN`

- `m4-s5` — Git
  - `m4-s5-t1` — Working dir → staging → local → remote workflow
  - `m4-s5-t2` — `git diff`, `git status`, `git restore`
  - `m4-s5-t3` — Branches: `branch`, `checkout -b`
  - `m4-s5-t4` — `merge` vs `rebase` (and history shape)

- `m4-s6` — Python Tooling
  - `m4-s6-t1` — Virtual environments: `venv`, `uv venv`
  - `m4-s6-t2` — `pip` vs `uv` vs `poetry`; `pyproject.toml` and lockfiles
  - `m4-s6-t3` — `ruff`, `black`, `mypy` — what each does
  - `m4-s6-t4` — Big-O thinking lite: time vs space; common collection complexities

- `m4-s7` — Web Security Basics
  - `m4-s7-t1` — SQL injection prevention (parametrized queries)
  - `m4-s7-t2` — Password hashing (bcrypt/argon2 — never plaintext, never MD5)
  - `m4-s7-t3` — JWT vs sessions vs cookies
  - `m4-s7-t4` — OAuth 2.0 basics (authorization flow)
  - `m4-s7-t5` — CORS (Cross-Origin Resource Sharing)
  - `m4-s7-t6` — HTTPS / TLS basics

- `m4-s8` — CI/CD Pipelines
  - `m4-s8-t1` — Pipeline-as-code structure (jobs, steps, triggers)
  - `m4-s8-t2` — GitHub Actions workflow syntax
  - `m4-s8-t3` — Caching dependencies
  - `m4-s8-t4` — Secrets management
  - `m4-s8-t5` — Matrix builds (multi-version testing)
  - `m4-s8-t6` — Common patterns (PR triggers, branch protection, status checks)

- `m4-s9` — Bash Scripting Basics
  - `m4-s9-t1` — Variables and quoting (single vs double quotes, $VAR vs "$VAR")
  - `m4-s9-t2` — Conditionals (if/then/else, `[[ ]]`, test command)
  - `m4-s9-t3` — Loops (for, while)
  - `m4-s9-t4` — Exit codes (`$?`, `set -e` for fail-fast)
  - `m4-s9-t5` — Reading input (`read`, pipes, redirection)
  - `m4-s9-t6` — Functions and arguments

---


Module 4 spans the most diverse skillset in the curriculum — networking, OS, containers, databases, version control, modern Python tooling, web security, CI/CD pipelines, and basic bash scripting. Its 10 spheres reflect that every "any-role Python engineer" position assumes baseline literacy across all these domains.

### Sphere `m4-s0` — Networking Fundamentals

**Why this sphere matters in interviews:** Network basics are universal screening material. "TCP vs UDP" appears in nearly every junior interview. Even non-network roles assume the candidate can explain status codes and DNS resolution.

#### `m4-s0-t1` — IP, ports, localhost; common ports

**Knowledge points:**

- IPv4: 4 octets (`192.168.1.1`); IPv6: 8 hex groups (rarely tested at student level)
- `localhost` = `127.0.0.1` = loopback
- `0.0.0.0` = all interfaces
- Ports: 0–65535; 0–1023 are privileged (require root/admin)
- Common ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 5432 (PostgreSQL), 3306 (MySQL), 27017 (MongoDB), 6379 (Redis), 8000/3000/5000 (dev servers), 8080 (alt HTTP)
- TCP and UDP use ports independently (same number on each is different socket)

**Interview angle:** "What port does PostgreSQL listen on by default?" — 5432. Memorize the common ones.

#### `m4-s0-t2` — TCP vs UDP; HTTP-over-TCP

**Knowledge points:**

- **TCP** — connection-oriented, ordered delivery, retransmission on loss, flow control; three-way handshake (SYN, SYN-ACK, ACK)
- **UDP** — connectionless, fire-and-forget, no guarantees, faster, lower overhead
- HTTP runs over TCP because correctness > speed for HTML/JSON delivery
- Video streaming, DNS, online games often use UDP (losing one packet better than waiting for retransmission)
- Tradeoff: TCP reliable + slow; UDP fast + unreliable

**Interview angle:** "Why does HTTP use TCP and not UDP?" — Ordered, complete delivery required.

#### `m4-s0-t3` — DNS resolution; HTTP request/response anatomy

**Knowledge points:**

- DNS resolves `google.com` to IP (e.g., `142.250.180.46`)
- Resolution path: local cache → OS resolver → ISP DNS → root → TLD → authoritative servers
- `nslookup google.com` or `dig google.com` for manual queries
- HTTP request: method + path + headers + (optional) body
- HTTP response: status code + status text + headers + (optional) body
- Common headers: `Content-Type`, `Authorization`, `Accept`, `User-Agent`, `Cookie`
- Methods: GET (idempotent, no body), POST (creates, has body), PUT (replaces), PATCH (partial update), DELETE, HEAD (GET without body)

**Interview angle:** "Walk me through what happens when I type `google.com` in my browser." — DNS → TCP connect → TLS handshake → HTTP request → response → render.

#### `m4-s0-t4` — Status codes: 200, 400, 401, 403, 404, 500

**Knowledge points:**

- **2xx Success:** 200 OK, 201 Created, 204 No Content
- **3xx Redirection:** 301 Moved Permanently, 302 Found (temporary), 304 Not Modified (cache hit)
- **4xx Client error:** 400 Bad Request, 401 Unauthorized (no/bad auth), 403 Forbidden (auth OK but not allowed), 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests (rate limited)
- **5xx Server error:** 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
- Critical distinction: 401 vs 403 (401 = "who are you?"; 403 = "I know you, you can't do this")

**Interview angle:** "Difference between 401 and 403?" — Auth missing vs auth present but insufficient.

---

### Sphere `m4-s1` — Linux CLI Basics

**Why this sphere matters in interviews:** "Can you navigate a Linux server via SSH?" is a binary screen. Senior engineers will ssh to a prod machine to diagnose an issue; the candidate must follow along without freezing.

#### `m4-s1-t1` — `pwd`, `cd`, `ls -la`

**Knowledge points:**

- `pwd` — print working directory
- `cd /path/to/dir` — absolute change; `cd ../..` — go up two levels; `cd ~` or `cd` — home directory; `cd -` — previous directory
- `ls` — list files; `ls -l` — long format (perms, owner, size, date); `ls -a` — include hidden (dot-files); `ls -la` — combine; `ls -lh` — human-readable sizes

**Interview angle:** Basic competence — filters out "I've never used a terminal" candidates early.

#### `m4-s1-t2` — `touch`, `mkdir`, `rm -rf` (and dangers)

**Knowledge points:**

- `touch file.txt` — create empty file (or update timestamp if exists)
- `mkdir new_dir` — create directory; `mkdir -p path/to/deep/dir` — create nested (no error if intermediate exists)
- `rm file.txt` — delete (no Trash on Linux CLI; no recovery)
- `rm -r dir/` — recursive
- `rm -rf dir/` — recursive + force: no prompts
- **Danger:** `rm -rf /` deletes the filesystem; `rm -rf ${VAR}/` where `VAR` is unset becomes `rm -rf /`

**Interview angle:** "What happens if you accidentally run `rm -rf /`?" — Tests awareness of danger, not exact behavior memorization.

#### `m4-s1-t3` — `cp`, `mv`

**Knowledge points:**

- `cp source dest` — copy file
- `cp -r source_dir dest_dir/` — recursive for directories
- `cp -p source dest` — preserve mode, ownership, timestamps
- `mv source dest` — move or rename
- `mv` on the same filesystem is atomic (just renames inode); across filesystems is copy+delete
- No `-r` flag for mv directories (works automatically)

**Interview angle:** "How do you rename a file in Linux?" — `mv old_name new_name`.

#### `m4-s1-t4` — Permissions: `r/w/x`; `chmod` numeric and `+x`; `chown`; `sudo`

**Knowledge points:**

- Classes: **u**ser (owner), **g**roup, **o**thers
- Permissions: **r**ead (4), **w**rite (2), e**x**ecute (1)
- Numeric form: sum permissions per class; `chmod 755 file` = `rwxr-xr-x`
- Common values: 644 (files: rw owner, r rest), 755 (executables and dirs), 600 (private — only owner)
- `chmod +x script.sh` — make executable for everyone; `chmod u+x` — only owner
- `chown user:group file` — change owner and group
- `sudo command` — run as root; requires admin privileges

**Interview angle:** "What does `chmod 755` mean?" — Owner rwx, group rx, others rx.

---

### Sphere `m4-s2` — Linux Operations

**Why this sphere matters in interviews:** This is where the rubber meets the road — finding bugs by reading logs, identifying runaway processes, piping commands to extract information. Senior engineers expect candidates to write one-liners like `grep ERROR app.log | awk '{print $3}' | sort | uniq -c | sort -rn` and explain what each pipe does.

#### `m4-s2-t1` — `cat`, `less`, `tail -f`, `tail -n`

**Knowledge points:**

- `cat file.log` — print whole file to stdout (bad for huge files)
- `less file.log` — interactive paginated viewer; `q` to quit, `/pattern` to search, `G` to jump to end
- `head -n 20 file.log` — first 20 lines
- `tail -n 50 file.log` — last 50 lines
- `tail -f file.log` — follow: keep reading as file grows (live log monitoring)
- `tail -F file.log` — like `-f` but handles log rotation

**Interview angle:** "How do you watch a log file in real time?" — `tail -f` (or `-F` for rotating logs).

#### `m4-s2-t2` — `find` for files by age/name

**Knowledge points:**

- `find /path -name "*.log"` — find by pattern
- `find /path -type f` — only files; `-type d` — only directories
- `find /path -mtime +7` — modified more than 7 days ago
- `find /path -size +100M` — larger than 100 MB
- `find /path -name "*.tmp" -delete` — find and delete (DANGEROUS; test without `-delete` first)
- `find /path -exec command {} \;` — execute command per result

**Interview angle:** "Find all `.log` files in `/var` older than 30 days." — `find /var -name "*.log" -mtime +30`.

#### `m4-s2-t3` — `>`, `>>`, pipe `|`

**Knowledge points:**

- `command > file` — redirect stdout (overwrite)
- `command >> file` — append
- `command 2> errors.log` — redirect stderr
- `command > all.log 2>&1` — combine stdout and stderr to one file
- `command1 | command2` — pipe: stdout of cmd1 → stdin of cmd2
- `command < input.txt` — read stdin from file

**Interview angle:** "How do you redirect both stdout and stderr to the same file?" — `> file 2>&1`.

#### `m4-s2-t4` — `grep` (basic, `-i`, `-v`); `awk` for column extraction

**Knowledge points:**

- `grep "ERROR" app.log` — print matching lines
- `grep -i "error" app.log` — case-insensitive
- `grep -v "DEBUG" app.log` — invert: lines NOT matching
- `grep -r "TODO" .` — recursive search across files
- `grep -n "ERROR" app.log` — show line numbers; `grep -c "ERROR"` — count
- `awk '{print $2}' file.log` — print second whitespace-separated column
- `awk -F',' '{print $3}'` — use comma as separator
- `awk '$3 > 100'` — print lines where third column > 100
- Canonical combo: `grep "ERROR" app.log | awk '{print $1}' | sort | uniq -c`

**Interview angle:** "Count unique IP addresses in this log file." — `awk '{print $1}' | sort | uniq -c | sort -rn`.

#### `m4-s2-t5` — `top`/`htop`, `ps aux | grep`, `kill` / `kill -9`

**Knowledge points:**

- `top` — interactive process viewer; `q` to quit
- `htop` — improved `top` (colors, mouse, easy kill); often not pre-installed
- `ps aux` — snapshot of all processes (USER, PID, %CPU, %MEM, COMMAND)
- `ps aux | grep python` — find python processes
- `kill <PID>` — send SIGTERM (graceful; process can clean up)
- `kill -9 <PID>` — send SIGKILL (immediate, uncatchable, no cleanup)
- `pkill python` — kill by name; `killall python` — similar; use with care

**Interview angle:** "Difference between `kill` and `kill -9`?" — SIGTERM (graceful) vs SIGKILL (immediate).

#### `m4-s2-t6` — `df -h`, `free -m`

**Knowledge points:**

- `df -h` — disk free, human-readable; usage per filesystem
- `df -i` — inode usage (separate from disk space; full inode table fails writes)
- `du -sh /path` — directory size; `du -sh /var/log/*` — size per item
- `free -m` — memory in MB; columns: total, used, free, shared, buff/cache, available
- `free -h` — human-readable
- `available` is the relevant number for "how much can I use without swapping"

**Interview angle:** "How do you check if the server is running out of disk space?" — `df -h`.

---

### Sphere `m4-s3` — Docker

**Why this sphere matters in interviews:** Containerization is baseline now. Even student positions expect candidates to read a `Dockerfile` and understand `docker run`. The image-vs-container distinction is asked constantly.

#### `m4-s3-t1` — Image vs container

**Knowledge points:**

- **Image:** read-only template; like a class
- **Container:** running instance of an image; like an object
- One image → many containers
- Images built from `Dockerfile`; containers created with `docker run`
- Images immutable; containers have mutable state until they stop
- Images live in registries (Docker Hub, GitHub Container Registry, AWS ECR)

**Interview angle:** "Difference between image and container?" — Image = template, container = running instance.

#### `m4-s3-t2` — `Dockerfile`: `FROM`, `WORKDIR`, `COPY`, `RUN`

**Knowledge points:**

- `FROM python:3.11-slim` — base image (`-slim` is smaller)
- `WORKDIR /app` — set working directory; subsequent commands run here
- `COPY requirements.txt .` — copy from host build context to container
- `COPY . .` — copy everything (respects `.dockerignore`)
- `RUN pip install -r requirements.txt` — execute at build time; layer is cached
- `EXPOSE 8000` — documentation only; doesn't publish port
- `ENV API_KEY=value` — set environment variable
- Build cache: layers cached; place less-frequently-changed files first
- Multi-stage builds: separate build env from runtime image to reduce size

**Interview angle:** "Why does the order of `COPY` and `RUN` matter in a Dockerfile?" — Build cache; frequently-changed files last.

#### `m4-s3-t3` — `CMD` vs `ENTRYPOINT`

**Knowledge points:**

- `CMD ["python", "app.py"]` — default command; overridable by `docker run image other_cmd`
- `ENTRYPOINT ["python"]` — the executable; `docker run` args appended
- `ENTRYPOINT ["python"] + CMD ["app.py"]` — default to `python app.py`; `docker run image script.py` runs `python script.py`
- Use `CMD` alone for simple containers; `ENTRYPOINT` when container IS a tool (CLI utility)
- Exec form (`["arg1"]`) vs shell form (`arg1 arg2`): exec preferred (no shell wrapper, proper signal handling)

**Interview angle:** "Difference between CMD and ENTRYPOINT?" — CMD is overridable; ENTRYPOINT is fixed executable.

#### `m4-s3-t4` — `build`, `run -d`, `ps`, `logs`, `exec -it bash`

**Knowledge points:**

- `docker build -t myapp:v1 .` — build from current Dockerfile, tag
- `docker run myapp:v1` — start container attached to terminal
- `docker run -d myapp:v1` — detached (background)
- `docker run --rm myapp:v1` — auto-remove on exit
- `docker run --name api myapp:v1` — name the container
- `docker ps` — list running; `docker ps -a` — include stopped
- `docker logs <id_or_name>` — view logs; `docker logs -f` — follow
- `docker exec -it <id> bash` — interactive shell in running container
- `docker stop <id>` — graceful stop (SIGTERM then SIGKILL after timeout); `docker rm <id>` — remove stopped

**Interview angle:** "How do you debug a running container?" — `docker logs` for output; `docker exec -it bash` for shell.

#### `m4-s3-t5` — Port mapping `-p`; volumes `-v` for persistence

**Knowledge points:**

- `-p 8000:80` — map host port 8000 to container port 80
- Without `-p`, container ports unreachable from outside
- `-p 127.0.0.1:8000:80` — bind only to localhost
- Without volumes, data inside container is lost on removal
- `-v /host/path:/container/path` — bind mount: maps host directory
- `-v myvolume:/container/path` — named volume: Docker manages location
- Use volumes for: databases, state, config files, log directories
- Volumes survive container removal; `docker volume ls` to inspect

**Interview angle:** "Why do databases need volumes in Docker?" — Container removal deletes filesystem layer; data lost without persistence.

---

### Sphere `m4-s4` — SQL

**Why this sphere matters in interviews:** SQL JOINs appear in probably 60% of Israeli technical screens. Even non-DB roles assume the candidate can write a `SELECT ... JOIN ... WHERE ... GROUP BY`. This sphere is dense because SQL competence has high signal value.

#### `m4-s4-t1` — `SELECT`, `WHERE` (`AND`, `OR`, `IN`, `LIKE`)

**Knowledge points:**

- `SELECT col1, col2 FROM table` — basic
- `SELECT * FROM table` — all columns (avoid in production code — fragile to schema changes)
- `SELECT DISTINCT col FROM table` — unique values
- `WHERE col = value` — basic filter
- `WHERE col > 5 AND col < 10` — combined conditions
- `WHERE status IN ('active', 'pending')` — match any in list
- `WHERE name LIKE 'A%'` — `%` is wildcard for any chars; `_` is single-char wildcard
- `WHERE col IS NULL` (not `= NULL` — NULL comparisons need `IS`)
- `ORDER BY col DESC` — sort descending
- `LIMIT 10 OFFSET 20` — pagination

**Interview angle:** "Find rows where name starts with 'A'." — `WHERE name LIKE 'A%'`.

#### `m4-s4-t2` — `INSERT`, `UPDATE`, `DELETE`

**Knowledge points:**

- `INSERT INTO table (col1, col2) VALUES ('a', 1)` — single row
- `INSERT INTO table (col1, col2) VALUES ('a', 1), ('b', 2)` — multi-row
- `UPDATE table SET col1 = 'new' WHERE id = 5` — update specific rows
- **Always include `WHERE`** — without it, UPDATE modifies every row (classic production disaster)
- `DELETE FROM table WHERE id = 5` — delete specific rows
- Same `WHERE` discipline applies — `DELETE FROM table` deletes everything
- Use transactions (`BEGIN; ... COMMIT;`) for multi-statement consistency
- PostgreSQL `RETURNING *` clause to see modified rows

**Interview angle:** "Worst thing you can do with an UPDATE?" — Forget the WHERE clause.

#### `m4-s4-t3` — `COUNT`, `SUM`, `AVG`, `MAX`, `MIN`

**Knowledge points:**

- `SELECT COUNT(*) FROM table` — total rows
- `SELECT COUNT(col) FROM table` — non-NULL values in col
- `SELECT COUNT(DISTINCT col) FROM table` — unique values
- `SUM(col)`, `AVG(col)` — numeric columns; ignore NULLs
- `MAX(col)`, `MIN(col)` — numeric or string (string = lexicographic)
- `SUM(col)` returns NULL if all NULL (not 0) — use `COALESCE(SUM(col), 0)`

**Interview angle:** "Find the highest salary in employees." — `SELECT MAX(salary) FROM employees`.

#### `m4-s4-t4` — `GROUP BY` and `HAVING` vs `WHERE`

**Knowledge points:**

- `SELECT dept, COUNT(*) FROM emp GROUP BY dept` — aggregate per group
- Every selected column must be in GROUP BY or be aggregate function
- `WHERE` filters rows **before** grouping
- `HAVING` filters groups **after** grouping
- Cannot use aggregate in WHERE: `WHERE COUNT(*) > 5` is invalid
- Use HAVING for aggregate conditions: `HAVING COUNT(*) > 5`
- Order: SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ... ORDER BY ... LIMIT

**Interview angle:** "Difference between WHERE and HAVING?" — WHERE filters rows; HAVING filters groups.

#### `m4-s4-t5` — `INNER JOIN` vs `LEFT JOIN`

**Knowledge points:**

- `INNER JOIN` — rows matched in BOTH tables; unmatched excluded
- `LEFT JOIN` (or `LEFT OUTER JOIN`) — all from LEFT; NULL in right-table columns when no match
- `RIGHT JOIN` — mirror of LEFT (rarely used; swap table order instead)
- `FULL OUTER JOIN` — all from both; NULLs where no match (rarely used)
- `CROSS JOIN` — cartesian product (usually a mistake without ON)
- Self-join: same table joined with aliases (`employees e JOIN employees m ON e.manager_id = m.id`)
- JOIN ON specifies matching condition; can be multi-column
- Canonical test: "Find users who have NO orders" → `LEFT JOIN orders ... WHERE order.id IS NULL`

**Interview angle:** "Find all customers who have never placed an order." — LEFT JOIN with `IS NULL` check.

---

### Sphere `m4-s5` — Git

**Why this sphere matters in interviews:** Git is universal infrastructure. Candidates who can't explain `git rebase` vs `git merge` raise red flags. The branching workflow is also commonly probed.

#### `m4-s5-t1` — Working dir → staging → local → remote workflow

**Knowledge points:**

- **Working directory:** files you edit
- **Staging area (index):** files prepared for next commit (`git add`)
- **Local repository:** committed history on your machine (`git commit`)
- **Remote repository:** shared central repo (`git push` to send, `git pull` to receive)
- Flow: edit → `git add` → `git commit -m "msg"` → `git push`
- `git status` shows state of all three (working, staging, local-vs-remote)
- `git log --oneline` — commit history
- `git fetch` downloads remote without merging; `git pull` = fetch + merge

**Interview angle:** "Walk through your typical git workflow." — Edit → stage → commit → push.

#### `m4-s5-t2` — `git diff`, `git status`, `git restore`

**Knowledge points:**

- `git status` — show modified, staged, untracked; short form: `git status -s`
- `git diff` — unstaged changes (working vs staging)
- `git diff --staged` (or `--cached`) — staged changes (staging vs last commit)
- `git diff HEAD~1` — changes since previous commit
- `git restore file` — discard working-directory changes (replaces older `git checkout -- file`)
- `git restore --staged file` — unstage (replaces `git reset HEAD file`)
- `git restore --source=HEAD~2 file` — restore from older commit
- `git stash` — save changes for later; `git stash pop` to restore

**Interview angle:** "How do you discard uncommitted changes to a file?" — `git restore file`.

#### `m4-s5-t3` — Branches: `branch`, `checkout -b`

**Knowledge points:**

- `git branch` — list branches; current marked `*`
- `git branch new_branch` — create (doesn't switch)
- `git checkout new_branch` — switch
- `git checkout -b new_branch` — create AND switch
- `git switch new_branch` — modern replacement for checkout (when switching, not restoring)
- `git switch -c new_branch` — modern equivalent of `checkout -b`
- `git branch -d branch` — delete (refuses if unmerged); `-D` to force
- `git push origin branch` — push to remote
- `git push -u origin branch` — set upstream (so future push/pull work without args)

**Interview angle:** "How do you create a new branch off main?" — `git switch -c new_branch` from main.

#### `m4-s5-t4` — `merge` vs `rebase` (and history shape)

**Knowledge points:**

- `git merge other_branch` — combine other_branch's history into current; creates merge commit if histories diverged
- `git rebase other_branch` — replay current branch's commits on top of other_branch; rewrites commit hashes; linear history
- Merge result: tree with branches and merge commits (preserves history)
- Rebase result: linear history (rewrites it)
- **Golden rule of rebase:** never rebase commits pushed to a shared branch (rewriting public history breaks others' clones)
- Use merge for integrating completed feature branches
- Use rebase to clean up local commits before sharing, or update feature branch with main
- Interactive rebase (`git rebase -i`): edit, squash, reorder commits

**Interview angle:** "When merge vs rebase?" — Merge for shared history; rebase for cleanup before sharing.

---

### Sphere `m4-s6` — Python Tooling

**Why this sphere matters in interviews:** Modern Python projects use specific tooling. Interviewers screen for awareness of the current stack (uv, ruff, pyproject.toml) vs legacy (pip, pylint, setup.py) — knowing both is a competence signal.

#### `m4-s6-t1` — Virtual environments: `venv`, `uv venv`

**Knowledge points:**

- venv isolates project dependencies from system Python
- `python -m venv .venv` — create (stdlib, slow)
- `source .venv/bin/activate` — activate (Linux/Mac); `.venv\Scripts\activate` (Windows)
- `deactivate` — exit
- `uv venv` — create via `uv` (much faster, modern)
- Activation modifies `PATH` so `python` and `pip` point to env
- `.gitignore` should include `.venv/`
- Per-project envs: each project has its own `.venv`
- Conda is alternative for data-science contexts; uv/venv dominant elsewhere

**Interview angle:** "Why virtual environments?" — Dependency isolation; avoid conflicts between projects.

#### `m4-s6-t2` — `pip` vs `uv` vs `poetry`; `pyproject.toml` and lockfiles

**Knowledge points:**

- `pip` — stdlib installer; basic, slow, no lockfile by default
- `uv` — modern fast (10–100x faster); pyproject.toml + lockfiles + env management; rapidly becoming standard
- `poetry` — comprehensive project manager; predates uv; still common in established projects
- `pyproject.toml` — modern project metadata (replaces `setup.py`)
- `requirements.txt` — legacy: flat list of pinned versions; no transitive resolution
- Lockfiles (`uv.lock`, `poetry.lock`) — exact resolved versions of all transitive deps; reproducible installs
- `pip install pkg` — install into current env
- `uv add pkg` — add to pyproject + install + update lockfile

**Interview angle:** "Difference between requirements.txt and a lockfile?" — Lockfile pins exact transitive versions for reproducibility.

#### `m4-s6-t3` — `ruff`, `black`, `mypy` — what each does

**Knowledge points:**

- `black` — opinionated formatter; no config arguments; consistent style
- `ruff` — fast linter + formatter (replaces flake8, isort, partial pylint); Rust-based; rapidly standard
- `ruff check .` — lint; `ruff format .` — format (alternative to black)
- `mypy` — static type checker; uses type hints to find type errors before runtime
- `mypy file.py` — check a file
- All configured via `pyproject.toml`
- Typical CI gate: ruff (style + basic bugs) + mypy (types) + pytest (tests)
- Run as pre-commit hooks to catch issues before commit

**Interview angle:** "Why mypy if Python is dynamically typed?" — Catches type errors statically; documents intent; IDE support.

#### `m4-s6-t4` — Big-O thinking lite: time vs space; common collection complexities

**Knowledge points:**

- Big-O describes how runtime/memory grows with input size
- O(1) constant: array indexing, dict lookup
- O(log n) logarithmic: binary search, balanced tree operations
- O(n) linear: scan a list, count elements
- O(n log n) quasi-linear: efficient sort (Timsort = Python's `sorted()`)
- O(n²) quadratic: nested loops over same data
- Space vs time tradeoff: precompute dict for O(1) lookup vs scan list O(n)
- Python specifics:
  - `list.append(item)` — O(1) amortized
  - `item in list` — O(n)
  - `dict[key]`, `key in dict` — O(1)
  - `set` add, contains — O(1)
  - `list.insert(0, item)` — O(n) (shifts all)
  - Use `collections.deque` for O(1) prepend
- Student-level: enough to discuss tradeoffs in code review

**Interview angle:** "Why is `key in dict` faster than `key in list`?" — Hash-based O(1) vs linear scan O(n).

---

### Sphere `m4-s7` — Web Security Basics

**Why this sphere matters in interviews:** Junior backend / automation roles are asked security basics surprisingly often — probably 30–40% of student technical screens include at least one security question. The classic ones ("How would you store user passwords?", "What's SQL injection and how do you prevent it?") have wrong answers that immediately disqualify the candidate. This sphere isn't comprehensive security training — it's the minimum bar that prevents red-flag interview moments.

`[CODE_TASK CAUTION — entire sphere]` Real security testing requires databases, network endpoints, real HTTP servers — none available in Pyodide. Author all `m4-s7` cards as `code_trap` / `multiple_choice` / `flip` / `fill_in`.

#### `m4-s7-t1` — SQL injection prevention (parametrized queries)

**Knowledge points:**

- SQL injection: user input concatenated into SQL string allows attacker to inject arbitrary SQL
- Example vulnerable code: `cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")` — `name = "'; DROP TABLE users; --"` is disaster
- Safe form: `cursor.execute("SELECT * FROM users WHERE name = ?", (name,))` — parametrized query; DB driver handles escaping
- Parametrized queries are NOT the same as string formatting with escape — the DB driver sends the SQL template and values separately
- ORMs (SQLAlchemy, Django ORM) parametrize by default; you have to deliberately break it to be vulnerable
- The bobby-tables story (`xkcd #327`) is the canonical illustration

**Interview angle:** "How do you prevent SQL injection?" — Parametrized queries (not string escaping). Common follow-up: show vulnerable code, ask to fix.

#### `m4-s7-t2` — Password hashing (bcrypt/argon2 — never plaintext, never MD5)

**Knowledge points:**

- Passwords stored in DB must be hashed, never plaintext (data breaches happen; plaintext = catastrophe)
- General hash functions (MD5, SHA-1, SHA-256) are designed to be fast — **wrong for passwords**, attackers brute-force them at billions/sec
- Password hashing algorithms (bcrypt, argon2, scrypt) are designed to be slow + memory-hard
- `bcrypt` — battle-tested, widely available; cost factor (work factor) adjustable upward as hardware improves
- `argon2` — modern winner of Password Hashing Competition; argon2id variant recommended
- Salt: random per-password value added before hashing; prevents rainbow-table attacks; bcrypt/argon2 handle this internally
- Pattern: `hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))` then store `hashed`; verify with `bcrypt.checkpw(password.encode(), hashed)`
- Never roll your own crypto

**Interview angle:** "How would you store user passwords?" — bcrypt or argon2 with salt; never plaintext, never MD5/SHA-1. Wrong answer is immediate disqualifier.

#### `m4-s7-t3` — JWT vs sessions vs cookies

**Knowledge points:**

- **Sessions:** server stores user state (in memory / Redis / DB); client gets opaque session ID in cookie; server looks up session on each request
- **JWT (JSON Web Token):** signed token containing user info; server validates signature, doesn't lookup; stateless
- JWT structure: `header.payload.signature` (base64-encoded, dot-separated)
- JWT payload (claims) is **base64, NOT encrypted** — anyone can decode and read it; just can't forge it without the secret
- Sensitive data goes in encrypted JWE, not regular JWT
- Sessions: easy to revoke (delete session record); JWT: hard to revoke before expiry (need denylist or short TTL + refresh tokens)
- Cookies: HTTP mechanism for storing values client-side; `HttpOnly` flag prevents JS access (XSS defense); `Secure` flag requires HTTPS; `SameSite` defends CSRF
- Sessions store ID in cookie; JWT often stored in cookie OR `localStorage` (cookie safer for XSS)

**Interview angle:** "Difference between JWT and sessions?" — Stateful (server stores) vs stateless (server validates signature); revocation tradeoff.

#### `m4-s7-t4` — OAuth 2.0 basics (authorization flow)

**Knowledge points:**

- OAuth 2.0 is about **delegated authorization** — letting an app act on a user's behalf at another service, without sharing the password
- "Sign in with Google" = OAuth 2.0 + OpenID Connect (OIDC adds identity layer on top)
- Roles: Resource Owner (user), Client (your app), Authorization Server (Google), Resource Server (Google API)
- Authorization Code flow (most common for web apps):
  1. User clicks "Sign in with Google" on your app
  2. Your app redirects to Google with `client_id`, `redirect_uri`, `scope`
  3. User authenticates with Google, approves your app's requested scopes
  4. Google redirects back to `redirect_uri` with a temporary **authorization code**
  5. Your app exchanges the code (server-to-server) for an **access token**
  6. Your app uses the access token to call Google APIs on user's behalf
- Access tokens are short-lived (~1 hour); refresh tokens (long-lived) can mint new access tokens
- Scopes limit what the token can do (e.g., `read:email` vs `write:calendar`)
- Never expose `client_secret` to the browser — it's server-side only

**Interview angle:** "What actually happens when you click 'Sign in with Google'?" — Tests OAuth flow understanding; senior candidates know it's about delegated authorization, not just login convenience.

#### `m4-s7-t5` — CORS (Cross-Origin Resource Sharing)

**Knowledge points:**

- Browsers enforce **same-origin policy** — JS on `app.example.com` cannot read responses from `api.other.com` by default
- "Origin" = scheme + host + port (`https://app.example.com:443`); different in any of these = different origin
- CORS is the server-side mechanism to **opt in** to cross-origin requests by sending specific headers
- `Access-Control-Allow-Origin: https://app.example.com` — explicit allowlist
- `Access-Control-Allow-Origin: *` — allow any origin; **dangerous** if combined with credentials (cookies)
- Preflight: for non-simple requests (custom headers, methods other than GET/POST/HEAD), browser sends `OPTIONS` first to check if the server allows the actual request
- `Access-Control-Allow-Credentials: true` — explicitly allow cookies/auth to be sent cross-origin; cannot combine with `*` origin
- CORS errors happen in the browser; the request usually completes server-side, but the response is hidden from JS

**Interview angle:** "You see 'CORS error' in the browser console — what's actually happening?" — The server didn't return the right `Access-Control-Allow-*` headers; browser blocked JS from reading the response.

#### `m4-s7-t6` — HTTPS / TLS basics

**Knowledge points:**

- HTTPS = HTTP over TLS (formerly SSL); TLS encrypts the connection between client and server
- TLS handshake: client → server "I support these ciphers"; server → "let's use this cipher, here's my certificate"; both derive a shared symmetric key for the session
- Certificate proves server identity (issued by a Certificate Authority — CA — that the browser trusts)
- What's encrypted: HTTP headers, body, URL path
- What's NOT encrypted: target hostname (visible via SNI), IP address, packet sizes, timing
- Self-signed certificates trigger browser warnings because no CA vouches for them; useful for dev only
- `Let's Encrypt` provides free CA-signed certificates (90-day validity, auto-renewable)
- HTTPS does NOT protect against compromised servers, XSS, SQL injection — it only secures transport

**Interview angle:** "What does HTTPS actually protect?" — Transport-layer confidentiality + integrity + server identity; nothing about server-side vulnerabilities.

---

### Sphere `m4-s8` — CI/CD Pipelines

**Why this sphere matters in interviews:** Every modern dev team uses some form of pipeline (GitHub Actions, GitLab CI, Jenkins, CircleCI). Students are increasingly asked "how do you run tests automatically?" or "have you written a CI workflow?" Reading `.github/workflows/ci.yml` is now baseline literacy — like reading `Dockerfile` was a few years ago. This sphere uses GitHub Actions as the lingua franca, since it's the most common stack at Israeli hi-tech in 2026.

`[CODE_TASK CAUTION — entire sphere]` CI/CD pipelines are YAML config, not Python code. Author all `m4-s8` cards as `code_trap` / `multiple_choice` / `flip` / `fill_in`.

#### `m4-s8-t1` — Pipeline-as-code structure (jobs, steps, triggers)

**Knowledge points:**

- CI pipeline = sequence of steps run automatically on code events (push, PR, tag, schedule)
- "Pipeline-as-code" = config in repo (e.g., `.github/workflows/ci.yml`); versioned with the code, reviewed in PRs
- Hierarchy: **workflow** → **jobs** → **steps**
- Workflow = top-level definition; jobs = parallel units of work (each runs on its own runner); steps = sequential commands within a job
- Triggers (`on:`): `push`, `pull_request`, `schedule` (cron), `workflow_dispatch` (manual), `release`
- Jobs run in parallel by default; `needs: <job>` declares dependency for serial ordering
- Each job runs on a fresh runner — no state shared between jobs unless explicitly passed (artifacts)

**Interview angle:** "What's the difference between a job and a step in CI?" — Jobs are parallel units with own runners; steps are sequential commands in a job.

#### `m4-s8-t2` — GitHub Actions workflow syntax

**Knowledge points:**

- File location: `.github/workflows/<name>.yml`
- Top-level structure:
  ```yaml
  name: CI
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-python@v5
          with:
            python-version: "3.11"
        - run: pip install -r requirements.txt
        - run: pytest
  ```
- `uses:` references a reusable action (from GitHub Marketplace or another repo)
- `run:` executes shell commands directly
- `with:` passes inputs to actions
- Environment variables: `env:` block at workflow / job / step level
- Always pin action versions (`@v4`, not `@main`) — `main` can change unexpectedly
- `runs-on: ubuntu-latest` — fresh Ubuntu VM per job; also `macos-latest`, `windows-latest`

**Interview angle:** "How would you set up a CI job that runs your tests on every PR?" — `on: pull_request`, checkout + setup-python + install + test.

#### `m4-s8-t3` — Caching dependencies

**Knowledge points:**

- Without caching, every CI run reinstalls all dependencies — slow and wasteful
- `actions/cache@v4` — generic cache; `actions/setup-python@v5` with `cache: 'pip'` — built-in pip cache
- Cache key: usually based on lockfile hash (e.g., `${{ hashFiles('requirements.txt') }}`)
- Cache restore: if key matches, restore; otherwise fresh install (and save cache for next run)
- Caching pip wheels, node_modules, build artifacts — anything expensive and deterministic
- Cache miss is silent — pipeline still works, just slower

**Interview angle:** "Your CI run is slow because it installs deps every time. How do you fix?" — Cache by lockfile hash with `actions/cache` or built-in setup-* cache parameter.

#### `m4-s8-t4` — Secrets management

**Knowledge points:**

- Never commit secrets to repo (API keys, deploy tokens, DB passwords) — they're permanently in git history
- GitHub Secrets: encrypted at rest, available as `${{ secrets.SECRET_NAME }}` in workflows
- Secrets are masked in logs — `***` shown instead of value (best effort; complex transformations may leak)
- Org-level vs repo-level secrets — org-level shared across repos
- Environment secrets — scoped to deployment environments (production, staging) with approval gates
- Use `permissions:` block to limit token scope (default `GITHUB_TOKEN` permissions are often too broad)
- For external secrets (cloud credentials), prefer OIDC federation over long-lived tokens

**Interview angle:** "How do you use an API key in your CI workflow without committing it?" — GitHub Secrets, referenced via `${{ secrets.NAME }}`.

#### `m4-s8-t5` — Matrix builds (multi-version testing)

**Knowledge points:**

- `strategy: matrix:` runs the same job multiple times with different parameter combinations
- Canonical example:
  ```yaml
  strategy:
    matrix:
      python-version: ["3.10", "3.11", "3.12"]
      os: [ubuntu-latest, macos-latest]
  ```
- Creates 3 × 2 = 6 parallel jobs
- Use for: testing across Python versions, testing across OSes, testing with different dependency combinations
- `fail-fast: false` — don't cancel other matrix jobs when one fails (helpful for seeing all failures at once)
- `include:` / `exclude:` — add/remove specific combinations
- Output reporting: each matrix variant shown as separate job in PR check UI

**Interview angle:** "How do you test your library across Python 3.10, 3.11, 3.12 in CI?" — Matrix strategy.

#### `m4-s8-t6` — Common patterns (PR triggers, branch protection, status checks)

**Knowledge points:**

- `on: pull_request` triggers workflow on PR open/sync; `on: push: branches: [main]` triggers on push to main
- Status checks = required CI jobs that must pass before PR can merge
- Branch protection rules: require status checks, require reviews, prevent force-push
- "Required" status checks block merge if red
- Common gates: tests, linting, type checking, coverage threshold
- `if:` conditionals on steps/jobs — skip based on context (e.g., skip deploy on PR, only on main push)
- Concurrency: `concurrency: { group: ${{ github.ref }}, cancel-in-progress: true }` — cancel old runs when new commit pushed
- Reusable workflows: `workflow_call` trigger; called from another workflow with `uses:`

**Interview angle:** "How do you prevent broken code from being merged to main?" — Branch protection + required status checks (CI must pass, reviews required).

---

### Sphere `m4-s9` — Bash Scripting Basics

**Why this sphere matters in interviews:** Automation engineers regularly read and write small bash scripts — CI helpers, deployment scripts, ad-hoc data manipulation, glue between Python tools. Not "be a bash expert" — just "can you follow what an existing 50-line bash script does, and write a 20-line one yourself when needed." Skipping this leaves a noticeable gap in automation-role interviews.

`[CODE_TASK CAUTION — entire sphere]` Bash isn't Python. Author all `m4-s9` cards as `code_trap` / `multiple_choice` / `flip` / `fill_in`.

#### `m4-s9-t1` — Variables and quoting (single vs double quotes, $VAR vs "$VAR")

**Knowledge points:**

- Variable assignment: `NAME=value` (no spaces around `=`)
- Variable expansion: `$NAME` or `${NAME}` (braces required when followed by alphanumerics: `${NAME}_suffix`)
- Single quotes preserve literal value: `'$NAME'` is the string `$NAME`
- Double quotes allow expansion: `"$NAME"` expands the variable
- **Always quote variables when used:** `"$NAME"` not `$NAME` — unquoted variables undergo word splitting and glob expansion (common bug source)
- Command substitution: `$(command)` runs command and substitutes its stdout; modern form, prefer over backticks
- Arithmetic: `$((expression))` — `RESULT=$((5 + 3))`
- Default values: `${NAME:-default}` — use default if NAME unset or empty
- `$0` script name, `$1`...`$9` positional args, `$@` all args, `$#` arg count, `$?` last exit code

**Interview angle:** "What's the difference between `$NAME` and `\"$NAME\"`?" — Quoting prevents word splitting and glob expansion; almost always want quoted form.

#### `m4-s9-t2` — Conditionals (if/then/else, `[[ ]]`, test command)

**Knowledge points:**

- Basic form:
  ```bash
  if [[ "$NAME" == "alice" ]]; then
    echo "hi alice"
  elif [[ "$NAME" == "bob" ]]; then
    echo "hi bob"
  else
    echo "stranger"
  fi
  ```
- `[[ ]]` — modern bash test syntax; supports `==`, `!=`, `=~` (regex), `<`, `>` (string comparison), `&&`, `||`
- `[ ]` — POSIX test; older, more limited; works in `sh` and `bash`
- File tests: `-f file` (regular file exists), `-d dir` (directory exists), `-e path` (any exists), `-r file` (readable), `-w file` (writable), `-x file` (executable)
- Numeric: `-eq`, `-ne`, `-lt`, `-le`, `-gt`, `-ge` (string `==` vs numeric `-eq` are different!)
- String empty/non-empty: `-z "$VAR"` (zero-length), `-n "$VAR"` (non-empty)
- Short circuit: `command1 && command2` (run cmd2 only if cmd1 succeeded), `command1 || command2` (run cmd2 only if cmd1 failed)

**Interview angle:** "How do you check if a file exists in bash?" — `if [[ -f "$path" ]]; then ...; fi`.

#### `m4-s9-t3` — Loops (for, while)

**Knowledge points:**

- For loop over list: `for item in apple banana cherry; do echo "$item"; done`
- For loop over files: `for f in *.log; do process "$f"; done`
- For loop over command output: `for line in $(some_command); do ...; done` (warning: word-splits on whitespace; for line-by-line use `while read`)
- C-style for: `for ((i=0; i<10; i++)); do echo $i; done`
- While loop: `while [[ "$count" -lt 10 ]]; do count=$((count + 1)); done`
- Reading file line by line:
  ```bash
  while IFS= read -r line; do
    echo "line: $line"
  done < input.txt
  ```
- `IFS=` prevents leading/trailing whitespace stripping; `-r` prevents backslash interpretation — both are best-practice defaults

**Interview angle:** "How do you process a file line by line in bash?" — `while IFS= read -r line; do ...; done < file`.

#### `m4-s9-t4` — Exit codes (`$?`, `set -e` for fail-fast)

**Knowledge points:**

- Every command returns an exit code: `0` = success, non-zero = failure
- `$?` holds the exit code of the last command
- Bash by default **continues** after a command fails — silent partial-success is a footgun
- `set -e` (errexit) — exit script immediately on any non-zero exit; production-script standard
- `set -u` (nounset) — error on use of unset variables; catches typos in variable names
- `set -o pipefail` — pipeline exit code is the rightmost-failing command's code (default is just the last command's)
- Canonical script header: `set -euo pipefail` — combines all three; production discipline
- Explicitly handle expected failures: `command || true` (allow failure), `if ! command; then ...; fi`
- `exit 0` (success), `exit 1` (generic failure), `exit N` (custom non-zero) — use to control script result

**Interview angle:** "How do you make a bash script fail fast on any error?" — `set -euo pipefail` at the top.

#### `m4-s9-t5` — Reading input (`read`, pipes, redirection)

**Knowledge points:**

- `read VAR` — reads one line from stdin into VAR; common for interactive prompts
- `read -p "Continue? " ANSWER` — print prompt, then read
- `read -s PASSWORD` — silent mode (no echo) — for password input
- File input: `command < file.txt` — file becomes stdin
- Heredoc:
  ```bash
  cat <<EOF
  This is
  multiline
  text
  EOF
  ```
- Herestring: `command <<< "string"` — pass string as stdin
- Output to file: `command > file` (overwrite) or `command >> file` (append)
- Both stdout and stderr to file: `command > out.log 2>&1`
- Discard output: `command > /dev/null 2>&1` (the `/dev/null` is the canonical "trash")
- Tee: `command | tee file.log` — write to both stdout and file

**Interview angle:** "How do you save command output to a file while also seeing it in the terminal?" — `command | tee file.log`.

#### `m4-s9-t6` — Functions and arguments

**Knowledge points:**

- Function definition:
  ```bash
  greet() {
    local name="$1"
    echo "Hello, $name"
  }
  greet "Alice"
  ```
- `local` keyword — variable scoped to function; without `local`, variables are global (a major footgun source)
- Function args use same syntax as script args: `$1`, `$2`, `$@`, `$#`
- Functions don't return values like Python — they return exit codes; "return" a value by printing to stdout and capturing via `$(func)`
- `return N` sets the function's exit code (like `exit` for scripts)
- Pattern for returning value: `result=$(my_function arg1 arg2)`
- Common bug: forgetting `local` — function variables leak into caller and break subsequent code

**Interview angle:** "How do you return a string from a bash function?" — Echo to stdout, capture with `$(func_name)`.

---

## Counts & MVP Targets

| Module | Spheres | Sub-tasks | Min cards (≥3/sub-task) | Target cards |
|---|---|---|---|---|
| 1 (done) | 7 | 26 | 78 | 93 ✅ |
| 2 | 8 | 30 | 90 | ~100–120 |
| 3 | 6 | 19 | 57 | ~80 |
| 4 | 10 | 48 | 144 | ~145–170 |
| **Total** | **31** | **123** | **369** | **~420–460** |

At MVP-1 close: only Module 1 required (already done). Modules 2–4 authored sphere by sphere during Phases 8–9 using this file as the topic scope, in combination with the cross-referenced PRDs for the *how*.

Lessons: one `.md` per sphere → 31 lessons total. Module 1 lessons should already exist; Modules 2–4 lessons authored alongside their cards.

Module 4 is the largest module (10 spheres) because it covers the broadest skillset — networking, OS basics, OS operations, containers, databases, version control, modern tooling, web security, CI/CD, and bash scripting. This breadth reflects the "any-role engineer" calibration: every position assumes baseline literacy across infrastructure topics, even when the primary role is not infrastructure-focused.

---

**End of curriculum.**
