---
module_id: 4
sphere_id: "m4-s4"
title: "SQL"
title_ru: "SQL"
estimated_minutes: 16
prerequisites: ["m1-s0"]
tags: ["sql", "select", "join", "group-by", "aggregates", "null", "interview-classic"]
---

# SQL

SQL is the densest sphere in Module 4. Roughly 60% of Israeli technical screens contain a SQL question — even non-DB roles (backend, QA, data engineering, devops) assume you can write `SELECT ... JOIN ... WHERE ... GROUP BY ... HAVING ...` without hesitating. The bar isn't query optimization or window functions; it's whether you can build a four-clause query, reason about NULL semantics, and use a `LEFT JOIN` to find "rows in A that don't exist in B." Those three skills cover most interview probes.

## Why this matters in interviews

The probes are mechanical: "find users who registered last month with no orders" (LEFT JOIN + IS NULL), "average salary per department, showing only departments with more than 10 employees" (GROUP BY + HAVING), "what's wrong with `WHERE col = NULL`?" (NULL is never equal to anything; use `IS NULL`). A candidate who confuses `WHERE` and `HAVING`, writes `= NULL`, or doesn't reach for `LEFT JOIN` when asked about absence — that's a fail-screen signal. The same patterns recur across companies because they actually discriminate: people who've written SQL have these reflexes; people who've copy-pasted from Stack Overflow don't.

---

## Concept 1 — `SELECT` and `WHERE`

```sql
SELECT col1, col2 FROM users;                  -- specific columns
SELECT * FROM users;                           -- all (fragile in production)
SELECT DISTINCT country FROM users;            -- unique values

SELECT * FROM users WHERE age >= 18;           -- single condition
SELECT * FROM users WHERE age >= 18 AND active = TRUE;
SELECT * FROM users WHERE status IN ('active', 'pending');
SELECT * FROM users WHERE name LIKE 'A%';      -- starts with A (% = any chars)
SELECT * FROM users WHERE name LIKE '_lice';   -- "?lice" (_ = exactly one char)

SELECT * FROM users WHERE email IS NULL;       -- NULL check — NOT `= NULL`
SELECT * FROM users WHERE email IS NOT NULL;

SELECT * FROM users ORDER BY created_at DESC LIMIT 10 OFFSET 20;
```

**`SELECT *` is fine for ad-hoc exploration, dangerous in production code** — adding a column to the table changes the shape of every result set; consumers break silently. Named-column lists (`SELECT id, email, ...`) are the production reflex.

**NULL is special.** `NULL` is not a value; it's the absence of a value. `WHERE col = NULL` always returns no rows because *nothing* equals NULL — not even another NULL. Use `IS NULL` / `IS NOT NULL`. The same rule applies in `<>`, `>`, `<`: any comparison involving NULL evaluates to NULL (which is treated as false in `WHERE`), so `WHERE col <> 'active'` *also* skips rows where `col IS NULL`. This is the most common SQL beginner trap.

`LIKE` wildcards: `%` matches zero or more characters; `_` matches exactly one. Escape literal `%` or `_` with the `ESCAPE` clause: `LIKE '50\%' ESCAPE '\'`.

---

## Concept 2 — `INSERT`, `UPDATE`, `DELETE`

```sql
INSERT INTO users (email, age) VALUES ('a@x.com', 30);
INSERT INTO users (email, age) VALUES ('a@x.com', 30), ('b@y.com', 25);  -- multi-row

UPDATE users SET age = 31 WHERE id = 5;
DELETE FROM users WHERE id = 5;

-- PostgreSQL: return the modified rows
INSERT INTO users (email) VALUES ('a@x.com') RETURNING id, created_at;
UPDATE users SET age = 31 WHERE id = 5 RETURNING *;
```

**The classic production disaster:** forgetting the `WHERE` clause. `UPDATE users SET status = 'banned'` (no WHERE) bans **every user in the table**. `DELETE FROM users` (no WHERE) wipes the table. Both run silently — no syntax error, no warning. The disciplines that prevent it:

- **Type the `WHERE` clause FIRST**, then go back and write `UPDATE / DELETE` in front of it. Hard to forget what you typed first.
- **Wrap destructive statements in a transaction:** `BEGIN; UPDATE ...; SELECT * FROM users WHERE ...; -- check; COMMIT;` (or `ROLLBACK` to abort).
- **Use `RETURNING *` (Postgres) or `LIMIT 1`** in a `SELECT` mirror first: `SELECT * FROM users WHERE id = 5` before `DELETE FROM users WHERE id = 5`. Same `WHERE`, different verb.

The interview probe — "worst thing you can do with an `UPDATE`?" — is testing whether you've internalized this reflex.

---

## Concept 3 — Aggregates: `COUNT`, `SUM`, `AVG`, `MAX`, `MIN`

```sql
SELECT COUNT(*)              FROM orders;       -- total rows (includes NULL columns)
SELECT COUNT(customer_id)    FROM orders;       -- NON-NULL customer_id values only
SELECT COUNT(DISTINCT customer_id) FROM orders; -- unique customer_id values
SELECT SUM(amount)           FROM orders;
SELECT AVG(amount)           FROM orders;
SELECT MAX(amount), MIN(amount) FROM orders;
```

**NULL semantics in aggregates** is the marquee gotcha:

- `COUNT(*)` — counts **rows**, including rows where every column is NULL. Always counts.
- `COUNT(col)` — counts rows where `col IS NOT NULL`. Rows with `col` NULL are excluded.
- `SUM(col)`, `AVG(col)`, `MAX(col)`, `MIN(col)` — **ignore NULLs**. So `AVG(salary)` over `[100, 200, NULL, 400]` is `(100 + 200 + 400) / 3 = 233.33`, not `(100 + 200 + 0 + 400) / 4 = 175`. NULL is not treated as zero; it's not counted at all.
- **`SUM` of an all-NULL column returns NULL**, not 0. `COALESCE(SUM(col), 0)` gives you the safe-zero version.

The high-value interview question is "average salary, but some employees have NULL salary — what does AVG return?" The right answer names the mechanism (NULLs ignored, denominator is non-NULL count), not just the number.

---

## Concept 4 — `GROUP BY` and `HAVING` vs `WHERE`

```sql
SELECT department, COUNT(*) AS headcount, AVG(salary) AS avg_salary
FROM employees
WHERE active = TRUE                    -- row-level filter, BEFORE grouping
GROUP BY department
HAVING AVG(salary) > 80000             -- group-level filter, AFTER grouping
ORDER BY avg_salary DESC
LIMIT 10;
```

**The mental model: SQL evaluates clauses in a specific logical order**:

1. `FROM` — the source tables/joins
2. `WHERE` — filter individual rows (cannot reference aggregates)
3. `GROUP BY` — collapse remaining rows into groups
4. `HAVING` — filter groups (CAN reference aggregates)
5. `SELECT` — pick columns / compute output
6. `ORDER BY` / `LIMIT` — sort, paginate

This ordering is the reason `WHERE COUNT(*) > 5` is invalid (`COUNT` doesn't exist yet at WHERE time — grouping hasn't happened) but `HAVING COUNT(*) > 5` works (groups exist by HAVING time). It's also why `WHERE active = TRUE` runs first (skip inactive employees before grouping is even attempted — much cheaper).

**Every column in `SELECT` must be either in `GROUP BY` or wrapped in an aggregate.** Postgres-style error: `column "salary" must appear in the GROUP BY clause or be used in an aggregate function`. The rule exists because picking *one* non-aggregated value from a group of many rows is ambiguous (which row's salary?). MySQL historically allowed this and returned arbitrary values; modern modes reject it like Postgres.

---

## Concept 5 — `INNER JOIN` vs `LEFT JOIN` + the anti-join pattern

```sql
-- users table:    id, name
-- orders table:   id, user_id, amount

-- INNER JOIN: rows that match in BOTH tables
SELECT u.name, o.amount
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
-- Users who placed orders, one row per order. Users with no orders are EXCLUDED.

-- LEFT JOIN: ALL rows from the LEFT table, NULLs from RIGHT where no match
SELECT u.name, o.amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
-- Every user. Users with no orders show one row with o.amount = NULL.

-- THE ANTI-JOIN: users with NO orders
SELECT u.name
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;
-- LEFT JOIN gives every user (with NULLs for non-orderers);
-- IS NULL keeps only the non-orderers.
```

**Mental model:**

- **INNER JOIN** — intersection of the two tables on the join condition. No NULLs introduced.
- **LEFT JOIN** — all of the left table, with NULL-padded right-table columns for rows that had no match.
- **The anti-join trick** — `LEFT JOIN ... WHERE right_col IS NULL` returns "rows in left that have NO match in right". This is the canonical pattern for "find users who never X" / "find products with no orders" / "find any-A-without-a-B" questions.

`RIGHT JOIN` is the mirror of `LEFT JOIN` and is almost never used in practice — swap the table order and use `LEFT JOIN` instead, since reading order is clearer. `FULL OUTER JOIN` (all rows from both, NULLs where no match) and `CROSS JOIN` (cartesian product) exist but are interview-rare. `INNER` and `LEFT` are the two you need cold.

---

## Quick check before you run cards

1. `WHERE email = NULL` returns zero rows even when the table has rows with NULL emails. Why, and what's the correct form?
2. `AVG(salary)` over `[100, 200, NULL, 400]` returns what value?
3. Why is `WHERE COUNT(*) > 5` invalid? What's the correct clause for "groups with more than 5 rows"?
4. Difference between `COUNT(*)` and `COUNT(column)`?
5. Find users who have NEVER placed an order. Write the SQL out loud.
6. `UPDATE users SET active = FALSE` — what does this do, and what saves you from the disaster?

If any feels shaky — re-read that section, then start the cards.
