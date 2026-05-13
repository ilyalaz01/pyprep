---
module_id: 3
sphere_id: "m3-s5"
title: "Coverage"
title_ru: "Coverage"
estimated_minutes: 9
prerequisites: ["m3-s1", "m3-s2"]
tags: ["pytest", "coverage", "pytest-cov", "ci-gate", "interview-classic"]
---

# Coverage

Coverage tools measure **which lines and branches of your code executed during the test run**. They don't measure whether the tests assert anything useful — that's the recurring interview question and the easiest thing to get wrong. A test that calls every function but asserts `result is not None` produces 100% coverage and 0% useful confidence. The tool is calibrating *one* dimension; you supply the other.

## Why this matters in interviews

The interviewer is checking two things: whether you can run and read a coverage report (operational baseline), and whether you understand its **honest scope** — execution, not assertion quality. The marquee question is "is 100% coverage a good target?" and the senior answer is "no, but coverage trending down is a real signal; coverage hiding completely-untested error paths is the bug worth catching."

---

## Concept 1 — `pytest --cov` and the basics

```bash
pytest --cov=myapp tests/                # measure coverage of myapp/ during tests/
pytest --cov=myapp --cov-report=term-missing tests/   # terminal report with line numbers
pytest --cov=myapp --cov-report=html tests/           # writes coverage-report/index.html
pytest --cov=myapp --cov-fail-under=85 tests/         # exit 1 if coverage < 85%
pytest --cov=myapp --cov-branch tests/                # measure branch coverage too
```

The `--cov-fail-under` flag is the CI gate. Put it on a value the team agreed on (80%, 85%, 90%) and CI fails if coverage drops below. The honest signal is *trending* — coverage going down on a PR is the catch; an absolute number is calibration.

`--cov-branch` adds **branch coverage** alongside line coverage. Line coverage marks a line as "covered" if any test executed it; branch coverage demands both arms of each `if`/`elif`/`else` to be exercised. A function with an untested `if x is None: raise ValueError` passes line coverage (the function ran) but fails branch coverage (the raise arm never fired). Branch coverage catches the bugs line coverage hides.

---

## Concept 2 — Reading the HTML report

`pytest --cov=myapp --cov-report=html tests/` writes `coverage-report/index.html`. Open it; the colors are:

- **Green** lines — executed by at least one test.
- **Red** lines — never executed; no test touched them.
- **Yellow** lines (only with `--cov-branch`) — executed, but one of the branches was never taken (e.g., the `if` condition was always true; the `else` block never ran).

The natural workflow:

1. Run tests with coverage.
2. Open HTML report; scan for files with low coverage.
3. Click into a file; find the red and yellow regions.
4. Look at the *uncovered* lines — most often error handlers, edge-case branches, defensive `raise`s.
5. Write a test that triggers the uncovered path. Re-run.

The interview question "you find a function's `except` block has 0% coverage — what do you do?" has one answer: **add a test that triggers the exception** (mock the dependency with `side_effect=Exception` and assert the recovery behavior). Don't delete the handler; don't lower the coverage gate; add the missing test.

The dishonest patterns to recognize:

- A `# pragma: no cover` comment on a line that's *legitimately* hard to test (e.g., `if __name__ == "__main__":` blocks) is fine. The same comment on an `except` block to hide a real gap is a smell.
- Pinning `--cov-fail-under` to a number coverage already exceeds, then never raising the bar, makes the gate inert. Raise the threshold over time.
- Adding `# type: ignore` adjacent to coverage gaps is unrelated; don't conflate type and coverage signals.

---

## Quick check before you run cards

1. What does `pytest --cov=myapp --cov-fail-under=85` do?
2. Difference between **line** coverage and **branch** coverage?
3. Red vs yellow lines in the HTML report — what does each mean?
4. Is 100% coverage a good target? Why or why not?
5. Your function's `except` block shows 0% coverage. What do you do?

If any feels shaky — re-read that section, then start the cards.
