"""CLI entry point — writes the package version to stdout and exits 0."""

from __future__ import annotations

import sys

from pyprep import __version__


def main() -> int:
    sys.stdout.write(f"pyprep {__version__}\n")
    return 0
