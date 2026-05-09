---
module_id: 1
sphere_id: "m1-s0"
title: "Foundations & Hidden Python Traps"
title_ru: "Фундамент и скрытые ловушки Python"
estimated_minutes: 12
prerequisites: []
tags: ["python-core", "gotchas", "interview-classic"]
---

# Foundations & Hidden Python Traps

These are the ~5 things interviewers reach for in the first ten minutes of a Python screen. They are not obscure — they are *exactly* the gotchas senior engineers hit in their first year of Python and never forget. Knowing them cold is table stakes.

## Why this matters in interviews

The interviewer is not asking "do you know what a list is". They are asking "do you understand the semantics deeply enough that you wouldn't ship a subtle bug into production". A candidate who answers a mutable-default-arg trap fluently signals "I have actually written real Python". A candidate who guesses signals the opposite.

---

## Concept 1 — Mutable vs Immutable Types

Python's built-in types split cleanly:

| Immutable | Mutable |
|---|---|
| `int`, `float`, `bool` | `list` |
| `str` | `dict` |
| `tuple` | `set` |
| `frozenset` | `bytearray` |
| `bytes` | (custom mutable classes) |

**Why this matters:** when you "modify" an immutable value you're actually creating a new object. When you modify a mutable value, every reference to it sees the change.

```python
a = [1, 2, 3]
b = a
b.append(4)
print(a)        # [1, 2, 3, 4]   — b and a point to the same list

x = "hello"
y = x
y += " world"
print(x)        # "hello"        — y now points to a new string
```

The tuple-vs-list question is interview gold: *"Why would you choose a tuple over a list?"* — Answers: immutability (safer as dict key, hashable), tiny perf edge, signals intent.

---

## Concept 2 — The Mutable Default Argument Trap

This is the single most-asked Python interview question.

```python
def add_item(item, items=[]):       # TRAP — common interview pitfall
    items.append(item)
    return items

print(add_item("a"))    # ['a']
print(add_item("b"))    # ['a', 'b']
```

**Why this happens:** `items=[]` is evaluated *once*, when the function is defined. The same list object becomes the default for every call. Every call that doesn't pass `items` mutates the same shared list.

**The fix:**

```python
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

Same pattern for `dict`, `set`, and any mutable instance. Memorize the `is None` check — it should appear in every function with a mutable default.

This trap also applies to **class attributes that are mutable**:

```python
class Cart:
    items = []          # class-level mutable — shared across ALL Cart instances

a = Cart(); a.items.append("apple")
b = Cart()
print(b.items)          # ['apple']
```

The fix: assign mutable state inside `__init__`, not at class level.

---

## Concept 3 — LEGB Scope Resolution

Python looks up a name in this order:

1. **L**ocal — current function.
2. **E**nclosing — any enclosing function (for nested functions).
3. **G**lobal — module-level.
4. **B**uilt-in — `print`, `len`, etc.

```python
x = "global"

def outer():
    x = "enclosing"
    def inner():
        # x is looked up: not in inner's L → check E → finds "enclosing"
        print(x)
    inner()

outer()                 # prints "enclosing"
```

To **modify** a variable from an outer scope, you need an explicit keyword:

- `global x` — bind to the module-global `x`.
- `nonlocal x` — bind to the nearest enclosing function's `x`.

```python
def counter():
    count = 0
    def increment():
        nonlocal count   # without this, `count = count + 1` creates a new local
        count += 1
        return count
    return increment

c = counter()
print(c())   # 1
print(c())   # 2
```

Without `nonlocal`, the inner `count += 1` would shadow the enclosing `count` and raise `UnboundLocalError`.

---

## Concept 4 — `if __name__ == "__main__"`

Every Python file has a built-in name `__name__`:

- When the file is **run directly** (`python script.py`), `__name__ == "__main__"`.
- When the file is **imported** (`import script`), `__name__ == "script"`.

So this idiom:

```python
def main():
    print("doing the thing")

if __name__ == "__main__":
    main()
```

…runs `main()` only when the file is executed directly, not when it's imported by another module.

**Why it matters:** without this guard, your "library" file's top-level code (test calls, prints, expensive setup) runs every time someone imports it. With the guard, the file is safe to import.

A common interview follow-up: *"What's printed if you `import script` and then call `script.main()`?"* — The function runs because you called it, but the `if __name__` block did NOT run during import.

---

## Quick check before you run cards

Before practicing, make sure you can answer these out loud:

1. Why is `tuple` hashable but `list` is not?
2. Why is `def f(x, items=[])` dangerous, and what's the canonical fix?
3. What's the difference between `global` and `nonlocal`?
4. What does `__name__ == "__main__"` actually evaluate to in each case?

If any of those four feels shaky — re-read that section, then start the cards.
