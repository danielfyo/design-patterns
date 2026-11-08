#!/usr/bin/env python3
"""Keep generated parts of the lessons identical to the real, tested files.

Every pattern README contains a block like this:

    <!-- output: expected_output.txt -->
    ```text
    ...
    ```
    <!-- /output -->

Everything between the markers is regenerated from the listed file (relative to the README).
That file is the same one ``scripts/verify.sh`` compares every implementation against, so what
the reader sees is exactly what the four programs print.

Usage:
    python3 scripts/sync_readme.py          # rewrite the READMEs in place
    python3 scripts/sync_readme.py --check  # exit 1 if any README is out of date (CI)
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

BLOCK = re.compile(
    r"(?P<open><!-- output: (?P<path>[^>]+?) -->)\n.*?(?P<close><!-- /output -->)",
    re.DOTALL,
)


def sync(readme: Path) -> str:
    text = readme.read_text(encoding="utf-8")

    def replace(match: re.Match[str]) -> str:
        source = (readme.parent / match["path"].strip()).read_text(encoding="utf-8")
        return f"{match['open']}\n```text\n{source.rstrip()}\n```\n{match['close']}"

    return BLOCK.sub(replace, text)


def main() -> int:
    check = "--check" in sys.argv
    readmes = sorted(ROOT.glob("patterns/*/*/README.md"))
    stale: list[Path] = []
    missing: list[Path] = []
    for readme in readmes:
        current = readme.read_text(encoding="utf-8")
        if not BLOCK.search(current):
            missing.append(readme)
            continue
        updated = sync(readme)
        if updated != current:
            stale.append(readme)
            if not check:
                readme.write_text(updated, encoding="utf-8")

    for readme in missing:
        print(f"MISSING  {readme.relative_to(ROOT)}: no <!-- output: ... --> block")
    for readme in stale:
        verb = "STALE   " if check else "UPDATED "
        print(f"{verb} {readme.relative_to(ROOT)}")
    if missing or (check and stale):
        if stale:
            print("\nRun: python3 scripts/sync_readme.py")
        return 1
    print(f"{len(readmes)} READMEs are in sync with their expected output.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
