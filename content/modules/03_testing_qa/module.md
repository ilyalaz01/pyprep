---
module_id: 3
title: "Testing & QA"
title_ru: "Тестирование и QA"
estimated_minutes: 6
prerequisites: ["m1-s0", "m2-s6"]
tags: ["testing", "pytest", "qa", "tdd"]
---

# Module 3 — Testing & QA

Israeli automation and QA-engineer roles screen heavily for testing competence — both the vocabulary (what's a unit test vs an integration test, what's mocking) and the muscle (write a `pytest` function from memory, mock an external call without hesitation). `unittest` is treated as legacy; `pytest` is the assumed default at every modern shop.

## What this module covers

Six spheres:

1. **Philosophy** — test pyramid, AAA pattern. The vocabulary screen.
2. **pytest Basics** — file/function naming, `assert` patterns, CLI flags.
3. **Errors & Parametrization** — `pytest.raises`, `@parametrize`, `skip`/`xfail`.
4. **Fixtures** — `@fixture`, `yield` setup/teardown, scopes, `conftest.py`.
5. **Mocking & Patching** — `Mock` / `MagicMock`, `assert_called*`, `@patch`, `side_effect`.
6. **Coverage** — `pytest --cov`, HTML report, identifying uncovered branches.

## How to work through it

Same pattern as Modules 1 and 2:

1. Read the lesson once, end to end.
2. Run the cards. Rate honestly.
3. Come back tomorrow. The scheduler resurfaces what you struggled on.

Module 3 leans heavier on `code_task` than Module 2's middle spheres did — pytest itself runs cleanly in Pyodide, so most cards can be drilled by actually writing tests, not just reading them. Mocking (sphere `m3-s4`) is the most interview-heavy sphere; budget extra sessions there.

## What "done" with this module looks like

You can:

- Place any test on the pyramid (unit / integration / E2E) and explain *why* it belongs there.
- Write a pytest function with AAA structure on the first try from a blank file.
- Reach for `pytest.raises` and `@parametrize` without looking up the syntax.
- Build a fixture with `yield`-based setup/teardown that runs in the right scope.
- Mock an external call with `@patch("module.where_used.func")`, set a `return_value`, and assert the call shape.
- Read a coverage report and tell which branches are missing tests.

Once that's true, the platform marks this module `mastered` and de-prioritizes it in your review queue.
