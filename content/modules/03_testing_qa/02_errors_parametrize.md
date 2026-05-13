---
module_id: 3
sphere_id: "m3-s2"
title: "Errors & Parametrization"
title_ru: "Ошибки и параметризация"
estimated_minutes: 12
prerequisites: ["m3-s1"]
tags: ["pytest", "raises", "parametrize", "xfail", "skip", "interview-heavy"]
---

# Errors & Parametrization

Three pytest features carry most of the leverage in real test suites. `pytest.raises` is how you assert "this should fail" — and the `match=` parameter, the part juniors get wrong because it's a **regex**, not a substring. `@pytest.mark.parametrize` is how one test function covers ten cases without ten copies. `skip` / `xfail` are how you mark a test that *currently* doesn't pass, without leaving the file red.

## Why this matters in interviews

The interviewer is checking whether you write *one* well-shaped test per behavior or ten copy-pasted ones. Whether you know `match=` is a regex (so `match="value.error"` matches more than the literal string). And whether you can give the `skip` vs `xfail` answer from memory — the difference between "we don't run this here" and "this is broken, we're tracking it."

---

## Concept 1 — `pytest.raises` with `match=` (regex, not substring)

```python
import pytest

def withdraw(account, amount):
    if amount > account.balance:
        raise ValueError(f"insufficient funds: requested {amount}, available {account.balance}")
    ...

def test_withdraw_rejects_overdraft():
    account = Account(balance=100)
    with pytest.raises(ValueError, match=r"insufficient funds"):
        withdraw(account, 500)
```

Three rules:

1. The `with pytest.raises(ExceptionType):` block **must contain the failing call**. Code after the block is unreachable on failure.
2. `match=` is a **regex** searched (not anchored) against `str(exc)`. `match=r"insufficient funds"` matches anywhere in the message; `match=r"^insufficient funds$"` anchors to the whole string.
3. Special regex chars in the expected message (`.`, `(`, `[`, `*`, `+`) **need escaping** or `re.escape(...)`. `match="amount: 100"` works because `:` isn't special; `match="result(3.14)"` does *not* match literal `result(3.14)` — the `(` is a group-open and `.` is a wildcard. Use `match=re.escape("result(3.14)")` or write the literal regex with `\(` and `\.`.

The marquee gotcha: `match="ValueError"` doesn't anchor — it matches any string containing `Value` followed by any char then `rror`, because `.` is a regex wildcard. Easy way to write a test that passes on the wrong exception message.

---

## Concept 2 — `@pytest.mark.parametrize`

One test, many inputs:

```python
import pytest

@pytest.mark.parametrize("n, expected", [
    (0, False),
    (1, False),
    (2, True),
    (4, False),
    (97, True),
    pytest.param(100, False, id="hundred-not-prime"),
])
def test_is_prime(n, expected):
    assert is_prime(n) == expected
```

`pytest.param(value, id=...)` gives readable names in `-v` output (`test_is_prime[hundred-not-prime]` vs `test_is_prime[100-False]`). Reach for it when the auto-generated ID is uninformative — boundary cases especially.

**Stacked decorators multiply** (cartesian product):

```python
@pytest.mark.parametrize("a", [1, 2, 3])
@pytest.mark.parametrize("b", [10, 20])
def test_combo(a, b):
    ...
```

That's **6 tests** (3 × 2), not 5. The combinatorial growth catches juniors: stacking two `parametrize` decorators with N and M items runs N×M tests, and a single test function can balloon to dozens if you're not paying attention.

---

## Concept 3 — `skip`, `skipif`, `xfail`

Three markers, three jobs:

- **`@pytest.mark.skip(reason="...")`** — don't run this. Reported as `s` in output. Use when the test is broken or not yet implemented and you don't want a red bar.
- **`@pytest.mark.skipif(condition, reason="...")`** — skip conditionally. Common shape: `@pytest.mark.skipif(sys.platform != "linux", reason="POSIX-only")`.
- **`@pytest.mark.xfail(reason="...")`** — expected failure. Run the test; if it fails, mark `XFAIL` (passes the suite); if it unexpectedly passes, mark `XPASS`. Use for known bugs you haven't fixed yet.

`xfail` has a `strict=True` mode worth knowing:

```python
@pytest.mark.xfail(strict=True, reason="will be fixed in v2")
def test_known_bug():
    assert flaky_thing() == 42
```

With `strict=True`, an unexpected pass becomes a **test failure** instead of a silent `XPASS`. This catches "the bug got fixed but the marker is still there" drift — your CI lights up red, you delete the `xfail`, the test joins the normal suite. Without `strict=True`, `XPASS` is reported but doesn't fail the run, which means the marker rots.

The interview question: **`skip` vs `xfail`?** `skip` doesn't run; `xfail` runs and records expectation. Use `skip` when the test isn't valid in this environment; use `xfail` when the test *is* valid but the code is currently broken.

---

## Quick check before you run cards

1. What's wrong with `pytest.raises(ValueError, match="value error")`?
2. Stack `parametrize` with N=4 and M=3 — how many tests run?
3. Why use `pytest.param(value, id="...")` instead of just `value`?
4. `skip` vs `xfail` — one sentence each.
5. What does `xfail(strict=True)` give you that bare `xfail` doesn't?

If any feels shaky — re-read that section, then start the cards.
