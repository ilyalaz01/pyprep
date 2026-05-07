"""CLI shim: `python scripts/validate_content.py` → validate content/ tree."""

from __future__ import annotations

import sys

from pyprep.tools.validate_content import main

if __name__ == "__main__":
    sys.exit(main())
