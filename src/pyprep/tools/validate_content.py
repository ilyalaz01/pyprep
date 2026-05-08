"""Validate the content/ tree against locked schemas + curriculum.

Scope:
- JSON schema check on every `*.cards.json` (T1.10)
- ID uniqueness across the whole content/ tree (T1.10)
- `sphere_id` referenced in cards exists in `curriculum.md` (T1.10)
- min cards per sphere ≥ 3 x number-of-sub-tasks (see NOTES N006) (T1.10)
- code_task solutions actually pass their tests (T2.5.4) — pytest
  subprocess per card; skip with --skip-execution for dev iteration
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Any

import jsonschema

CURRICULUM_FILE = "curriculum.md"
SCHEMA_FILE = "schema/card.schema.json"
MODULES_DIR = "modules"
MIN_CARDS_PER_SUBTASK = 3
CODE_TASK_TIMEOUT_S = 30

_SPHERE_LINE = re.compile(r"^- `(m\d+-s\d+)` —")
_SUBTASK_LINE = re.compile(r"^  - `(m\d+-s\d+-t\d+)` —")


def parse_curriculum(text: str) -> dict[str, list[str]]:
    spheres: dict[str, list[str]] = {}
    current: str | None = None
    for line in text.splitlines():
        sphere = _SPHERE_LINE.match(line)
        if sphere:
            current = sphere.group(1)
            spheres[current] = []
            continue
        sub = _SUBTASK_LINE.match(line)
        if sub and current is not None:
            spheres[current].append(sub.group(1))
    return spheres


def _load_wrappers(root: Path) -> list[tuple[Path, dict[str, Any]]]:
    return [
        (p, json.loads(p.read_text("utf-8")))
        for p in sorted((root / MODULES_DIR).rglob("*.cards.json"))
    ]


def _all_cards(wrappers: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return [c for w in wrappers for c in w.get("cards", [])]


def _check_schema(
    wrappers: list[tuple[Path, dict[str, Any]]], schema: dict[str, Any]
) -> list[str]:
    out: list[str] = []
    for path, wrapper in wrappers:
        for i, card in enumerate(wrapper.get("cards", [])):
            try:
                jsonschema.validate(card, schema)
            except jsonschema.ValidationError as e:
                cid = card.get("id", f"index {i}")
                out.append(f"{path.name}:{cid}: schema: {e.message}")
    return out


def _check_id_uniqueness(cards: Iterable[dict[str, Any]]) -> list[str]:
    counts = Counter(c["id"] for c in cards if "id" in c)
    return [f"duplicate id {cid} (x{n})" for cid, n in counts.items() if n > 1]


def _check_sphere_refs(
    wrappers: list[tuple[Path, dict[str, Any]]], curriculum: dict[str, list[str]]
) -> list[str]:
    return [
        f"{path.name}: sphere_id {w.get('sphere_id')!r} not in curriculum"
        for path, w in wrappers
        if w.get("sphere_id") not in curriculum
    ]


def _check_min_cards(
    wrappers: list[tuple[Path, dict[str, Any]]], curriculum: dict[str, list[str]]
) -> list[str]:
    by_sphere: dict[str, int] = defaultdict(int)
    for _, w in wrappers:
        sid = w.get("sphere_id")
        if isinstance(sid, str):
            by_sphere[sid] += len(w.get("cards", []))
    out: list[str] = []
    for sid, count in by_sphere.items():
        subtasks = curriculum.get(sid, [])
        required = len(subtasks) * MIN_CARDS_PER_SUBTASK
        if count < required:
            out.append(f"sphere {sid}: {count} cards < {required} required")
    return out


def _run_code_task(card: dict[str, Any]) -> str | None:
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        (td_path / "solution.py").write_text(card["solution_code"], "utf-8")
        (td_path / "test_solution.py").write_text(card["tests"], "utf-8")
        proc = subprocess.run(  # noqa: S603 — fixed argv, no shell
            [sys.executable, "-m", "pytest", "-q", str(td_path)],
            capture_output=True,
            text=True,
            timeout=CODE_TASK_TIMEOUT_S,
            check=False,
        )
        if proc.returncode == 0:
            return None
        tail = (proc.stdout or proc.stderr).strip().splitlines()[-1:] or ["failed"]
        return tail[0]


def _check_code_task_executions(
    wrappers: list[tuple[Path, dict[str, Any]]],
) -> list[str]:
    out: list[str] = []
    for path, wrapper in wrappers:
        for card in wrapper.get("cards", []):
            if card.get("type") != "code_task":
                continue
            err = _run_code_task(card)
            if err is not None:
                out.append(f"{path.name}:{card['id']}: code_task: {err}")
    return out


def validate(root: Path, *, execute_code_tasks: bool = True) -> list[str]:
    curriculum = parse_curriculum((root / CURRICULUM_FILE).read_text("utf-8"))
    schema = json.loads((root / SCHEMA_FILE).read_text("utf-8"))
    wrappers = _load_wrappers(root)
    cards = _all_cards(w for _, w in wrappers)

    errors = (
        _check_schema(wrappers, schema)
        + _check_id_uniqueness(cards)
        + _check_sphere_refs(wrappers, curriculum)
        + _check_min_cards(wrappers, curriculum)
    )
    if execute_code_tasks:
        errors += _check_code_task_executions(wrappers)
    return errors


def main(argv: Sequence[str] | None = None) -> int:
    args = list(argv) if argv is not None else sys.argv[1:]
    execute = "--skip-execution" not in args
    root = Path.cwd() / "content"
    errors = validate(root, execute_code_tasks=execute)
    if errors:
        sys.stderr.write(f"FAIL: {len(errors)} validation error(s)\n")
        for e in errors:
            sys.stderr.write(f"  {e}\n")
        return 1
    sys.stdout.write("OK: content valid\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
