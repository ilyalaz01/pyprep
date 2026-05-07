"""Module-execution shim so `python -m pyprep` invokes the CLI entry point."""

from __future__ import annotations

import sys

from pyprep.main import main

if __name__ == "__main__":
    sys.exit(main())
