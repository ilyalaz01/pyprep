---
module_id: 3
sphere_id: "m3-s0"
title: "Philosophy"
title_ru: "Философия тестирования"
estimated_minutes: 9
prerequisites: []
tags: ["testing", "philosophy", "test-pyramid", "aaa", "interview-warmup"]
---

# Philosophy

Before any test code, interviewers screen for the vocabulary. *What's a unit test versus an integration test? Why don't you write end-to-end tests for everything?* The answers are short, the cost of not having them is high — they're the conversation that filters out candidates who've never thought about testing as a discipline before writing tests as a chore.

## Why this matters in interviews

Senior engineers don't ask philosophy questions to be pedantic. They ask because the answer reveals whether you'll ship a thousand E2E tests that take 40 minutes to run, or you'll ship a thoughtful pyramid that catches bugs fast enough to debug in the same afternoon. Both are easy to write; only one is operable. The vocabulary screen is shallow but predictive.

---

## Concept 1 — The Test Pyramid

Three layers, from many to few:

```
              ┌─────┐
              │ E2E │      ← few, slow (s–min), full system
              ├─────┤
              │ Int │      ← some, medium (100ms–s), 2+ components
              ├─────┤
              │     │
              │Unit │      ← many, fast (ms), one function/class isolated
              └─────┘
```

- **Unit tests** exercise a single function or class with mocked dependencies — no real I/O, no real DB, no network. Fast (milliseconds). Catch logic bugs in the unit itself.
- **Integration tests** exercise two or more real components together — a service with a real DB, two functions sharing state, a real HTTP call to a test server. Slower (hundreds of ms to seconds). Catch **contract bugs** between components: schema mismatches, wrong assumptions about a dependency's behavior.
- **E2E tests** drive the system end-to-end as a real user would — browser automation, real backend, real database. Slowest (seconds to minutes). Catch **whole-system bugs**: auth flows, multi-step user journeys, deploy-config issues.

The pyramid shape is structural. Many unit tests give you fast feedback on logic; some integration tests catch the bugs unit tests miss because mocks always agree with their mocked side; few E2E tests catch the deployment-shaped bugs nothing else can. Invert the pyramid (lots of E2E, few unit) and your CI runs 40 minutes, failures point at "something in the user flow", and debugging is a guessing game.

The interview question is "why not just E2E for everything?" The answer is the three properties E2E lacks: **speed** (you can't run 5000 of them in CI), **isolation** (an E2E failure could be anywhere), and **stability** (every dependency is real, so flakiness compounds).

---

## Concept 2 — Arrange, Act, Assert (one Act per test)

Every well-shaped test has three sections, in order:

```python
def test_cart_total_with_discount():
    # Arrange
    cart = Cart()
    cart.add(Item("apple", price=10))
    cart.apply_coupon("SAVE20")

    # Act
    total = cart.total()

    # Assert
    assert total == 8
```

- **Arrange** — set up inputs, fixtures, mocks. Usually the longest section.
- **Act** — the single operation under test. One line, one call.
- **Assert** — verify the outcome.

The binding rule is **one Act per test**. If your test calls two things you actually want to verify, split it into two tests. When the test fails, the failure message should point at exactly one behavior — not a chain you have to read line by line to localize.

The anti-pattern is a long test with five `assert`s spread across three function calls. When it fails, the report says "line 47 failed" and you have to read the whole test to know which behavior broke. Worse, the first failed assert hides every subsequent one. Split the test; let pytest tell you exactly what regressed.

---

## Quick check before you run cards

Make sure you can answer these out loud:

1. Define unit, integration, and E2E tests in one sentence each.
2. Why is the pyramid shaped wide-at-the-bottom and not narrow?
3. Why not write only E2E tests if they "cover everything"?
4. What goes in each of Arrange, Act, Assert?
5. Why one Act per test? What goes wrong if you have two?

If any of those five feels shaky — re-read that section, then start the cards.
