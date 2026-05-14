"""Content text lints — emoji (N029) and credential-shape (N047).

Both rules scan lesson .md and card .json files line-by-line. Extracted
from validate_content.py once N047 was added; the main validator was at
the 150-LOC ceiling.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from pathlib import Path

MODULES_DIR = "modules"

# N029 — content emoji lint (PRODUCT.md §1).
_EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF☀-➿]")

# N047 — credential-shape lint. Each pattern matches the SHAPE of a real
# credential, tight enough not to false-positive on placeholder forms.
_JWT_RE = (
    r"\beyJ[A-Za-z0-9_-]{10,}\."
    r"eyJ[A-Za-z0-9_-]{10,}\."
    r"[A-Za-z0-9_-]{20,}\b"
)
_ARGON2_RE = (
    r"\$argon2(?:i|d|id)\$v=\d+\$m=\d+,t=\d+,p=\d+"
    r"\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+"
)
_CRED_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("AKIA",     re.compile(r"AKIA[A-Z0-9]{16}")),
    ("ghp_",     re.compile(r"ghp_[A-Za-z0-9]{36,}")),
    ("sk_live_", re.compile(r"sk_live_[A-Za-z0-9]{24,}")),
    ("sk_test_", re.compile(r"sk_test_[A-Za-z0-9]{24,}")),
    ("JWT",      re.compile(_JWT_RE)),
    ("bcrypt",   re.compile(r"\$2[aby]\$\d{2}\$[A-Za-z0-9./]{53}")),
    ("argon2",   re.compile(_ARGON2_RE)),
]
# 40-char hex separately — needs a context-based exemption (actions/<name>@<sha> pinning).
_SHA40 = re.compile(r"\b[a-f0-9]{40}\b")
_SHA40_ACTIONS_PREFIX = re.compile(r"actions/[\w.-]+@\Z")
# Whitelist: matches containing any of these substrings are treated as
# obviously-fake teaching placeholders (N047 authoring discipline).
_CRED_WHITELIST = re.compile(r"REDACTED|EXAMPLE|FAKE|XXXX", re.IGNORECASE)


def _content_files(root: Path) -> Iterable[Path]:
    for p in sorted((root / MODULES_DIR).rglob("*")):
        if p.suffix in {".md", ".json"}:
            yield p


def check_no_emoji(root: Path) -> list[str]:
    """N029 — flag decorative emoji in lessons / cards (PRODUCT.md §1)."""
    out: list[str] = []
    for path in _content_files(root):
        for lineno, line in enumerate(path.read_text("utf-8").splitlines(), start=1):
            m = _EMOJI_RE.search(line)
            if m:
                out.append(f"{path.relative_to(root)}:{lineno}: emoji {m.group(0)!r} (N029)")
    return out


def check_no_realistic_secret(root: Path) -> list[str]:
    """N047 — flag credential-shaped strings in lessons / cards.

    Exempts matches whose own text contains REDACTED / EXAMPLE / FAKE / XXXX
    (case-insensitive — obviously-fake teaching placeholders), and 40-char
    hex SHAs in `actions/<name>@<sha>` GitHub Actions pinning context.
    """
    out: list[str] = []
    for path in _content_files(root):
        for lineno, line in enumerate(path.read_text("utf-8").splitlines(), start=1):
            for label, pat in _CRED_PATTERNS:
                for m in pat.finditer(line):
                    if _CRED_WHITELIST.search(m.group()):
                        continue
                    out.append(
                        f"{path.relative_to(root)}:{lineno}: "
                        f"credential-shape {label} {m.group()[:30]!r} (N047)"
                    )
            for m in _SHA40.finditer(line):
                if _CRED_WHITELIST.search(m.group()):
                    continue
                if _SHA40_ACTIONS_PREFIX.search(line[: m.start()]):
                    continue
                out.append(
                    f"{path.relative_to(root)}:{lineno}: "
                    f"40-hex-shape {m.group()[:30]!r} (N047)"
                )
    return out
