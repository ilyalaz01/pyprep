"""CLI shim: `python scripts/check_file_size.py` → enforce 150-LOC ceiling."""

from __future__ import annotations

import sys

from pyprep.tools.check_file_size import main

if __name__ == "__main__":
    sys.exit(main())
