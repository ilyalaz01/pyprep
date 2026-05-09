"""T3.10 — pin the integration→routers coverage gate at ≥70%.

Runs `pytest tests/integration/` against just `src/pyprep/api/routers/`,
parses the coverage line, and exits non-zero if total < 70%. Lives outside
the main `pytest --cov=src/pyprep` flow because the project-wide gate
(85%) already covers everything else; this is the focused PRD §7 check.

Usage: `uv run python scripts/check_router_coverage.py [--min 70]`.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys

DEFAULT_MIN = 70
TARGET = "src/pyprep/api/routers"


def main(argv: list[str] | None = None) -> int:
    args = argv or sys.argv[1:]
    minimum = DEFAULT_MIN
    if "--min" in args:
        i = args.index("--min")
        minimum = int(args[i + 1])

    uv = shutil.which("uv")
    if uv is None:
        sys.stdout.write("FAIL: `uv` not on PATH\n")
        return 2
    cmd = [
        uv, "run", "pytest", "tests/integration/",
        f"--cov={TARGET}", "--cov-report=term",
        "--override-ini=addopts=-q", "--no-header",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)  # noqa: S603
    out = result.stdout + result.stderr
    sys.stdout.write(out)
    if result.returncode != 0:
        sys.stdout.write("\nFAIL: pytest run failed\n")
        return result.returncode

    # Parse the TOTAL line from `--cov-report=term`.
    total_match = re.search(r"^TOTAL\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+(?:\.\d+)?)%", out, re.M)
    if total_match is None:
        sys.stdout.write("\nFAIL: could not parse TOTAL coverage line\n")
        return 1

    pct = float(total_match.group(1))
    if pct < minimum:
        sys.stdout.write(f"\nFAIL: integration→routers coverage {pct}% < {minimum}%\n")
        return 1
    sys.stdout.write(f"\nOK: integration→routers coverage {pct}% ≥ {minimum}%\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
