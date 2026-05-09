"""T3.9 — pin the handler-LOC audit as a CI gate.

Imports the audit script and asserts it exits 0 against the current router
tree. New handlers > 10 LOC trip this without a NOTES-referenced waiver.
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))


def test_handler_loc_audit_passes_or_only_documented_exceptions() -> None:
    import audit_handlers  # type: ignore[import-not-found]

    # Capture stdout to keep test output quiet on success.
    captured = io.StringIO()
    saved = sys.stdout
    sys.stdout = captured
    try:
        rc = audit_handlers.main([])
    finally:
        sys.stdout = saved
    assert rc == 0, "handler audit failed:\n" + captured.getvalue()
