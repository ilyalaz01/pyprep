# PyPrep Curriculum — Source of Truth

Every card and lesson references a `sphere_id` from this file. If a card cites a sphere that isn't here, validation fails.

This curriculum is derived from the project owner's hand-curated interview-prep plan, with four critical additions flagged `(ADDED)` based on Israeli junior Python market signals: GIL/concurrency, FastAPI/Pydantic depth, Big-O & interview algorithms (light), Python tooling.

---

## Module 1 — Python Core & OOP

- `m1-s0` — Foundations & Hidden Python Traps
  - `m1-s0-t1` — Mutable vs immutable types
  - `m1-s0-t2` — Mutable default arguments trap
  - `m1-s0-t3` — LEGB scope rules; `global` vs `nonlocal`
  - `m1-s0-t4` — `if __name__ == "__main__"` and import semantics

- `m1-s1` — Class Architecture
  - `m1-s1-t1` — `__init__`, `self`, instance attributes
  - `m1-s1-t2` — Class attributes vs instance attributes (and the shared-mutable trap)
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

- `m1-s6` — Concurrency & GIL **(ADDED)**
  - `m1-s6-t1` — What is the GIL and why does `threading` not speed up CPU-bound work
  - `m1-s6-t2` — `threading` vs `multiprocessing` — when to pick which
  - `m1-s6-t3` — `asyncio`: event loop, `async`/`await`, `asyncio.gather`
  - `m1-s6-t4` — I/O-bound vs CPU-bound mental model

---

## Module 2 — Practical Automation, Scripting & Infrastructure

- `m2-s0` — Time, Dates & Math
  - `m2-s0-t1` — `datetime.now()` vs `datetime.utcnow()`; tz-aware datetimes
  - `m2-s0-t2` — `strftime` and `strptime`
  - `m2-s0-t3` — `timedelta` for time arithmetic
  - `m2-s0-t4` — `time.sleep`, `time.perf_counter`

- `m2-s1` — Filesystem & OS
  - `m2-s1-t1` — `pathlib` paths, `resolve()`, `exists()`, `is_file()/is_dir()`
  - `m2-s1-t2` — `iterdir`, `glob`, `rglob`
  - `m2-s1-t3` — `os` and `shutil`: makedirs, copy, move, rmtree
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
  - `m2-s4-t1` — `requests.get/post`, query params, `json=...` body
  - `m2-s4-t2` — Headers, bearer tokens, auth
  - `m2-s4-t3` — `timeout=`, `raise_for_status`, `RequestException`
  - `m2-s4-t4` — `pydantic` models for response validation **(ADDED)**

- `m2-s5` — Subprocess
  - `m2-s5-t1` — `subprocess.run` with arg list (not `shell=True`)
  - `m2-s5-t2` — `capture_output`, `text`, `stdout`, `stderr`
  - `m2-s5-t3` — `check=True` and `CalledProcessError`

- `m2-s6` — Production-grade Scripts
  - `m2-s6-t1` — `argparse`: required/optional args, boolean flags
  - `m2-s6-t2` — `logging`: `basicConfig`, format, levels (DEBUG/INFO/WARN/ERROR)
  - `m2-s6-t3` — Why `print` is forbidden in production code

- `m2-s7` — Modern Backend Basics **(ADDED)**
  - `m2-s7-t1` — FastAPI routing and path/query params
  - `m2-s7-t2` — Pydantic `BaseModel` for request/response validation
  - `m2-s7-t3` — Dependency injection with `Depends`
  - `m2-s7-t4` — Background tasks and async endpoints

---

## Module 3 — Testing & QA

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

## Module 4 — Linux, Docker, SQL, Git

- `m4-s0` — Networking Fundamentals
  - `m4-s0-t1` — IP, ports, localhost; common ports (80/443/5432/...)
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

- `m4-s6` — Python Tooling **(ADDED)**
  - `m4-s6-t1` — Virtual environments: `venv`, `uv venv`
  - `m4-s6-t2` — `pip` vs `uv` vs `poetry`; `pyproject.toml` and lockfiles
  - `m4-s6-t3` — `ruff`, `black`, `mypy` — what each does and when
  - `m4-s6-t4` — Big-O thinking lite: time vs space; common collection complexities

---

## Counts

| Module | Spheres | Sub-tasks |
|---|---|---|
| 1 | 7 | 26 |
| 2 | 8 | 30 |
| 3 | 6 | 19 |
| 4 | 7 | 30 |
| **Total** | **28** | **105** |

At ≥ 3 cards per sub-task → **≥ 315 cards** at MVP. Realistic target: ~400 cards including type-mix duplicates.
