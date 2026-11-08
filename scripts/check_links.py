#!/usr/bin/env python3
"""Check that every relative link and anchor in the repository's Markdown files resolves.

External (http/https/mailto) links are not fetched; this keeps the check fast and offline.

Usage:
    python3 scripts/check_links.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {"node_modules", ".git", "bin", "obj", "dist", "coverage"}

LINK = re.compile(r"(?<!!)\[[^\]]*\]\((?P<target>[^)\s]+)(?:\s+\"[^\"]*\")?\)")
HEADING = re.compile(r"^#{1,6}\s+(?P<title>.+?)\s*#*\s*$", re.MULTILINE)
HTML_ANCHOR = re.compile(r"<a\s+(?:id|name)=\"(?P<id>[^\"]+)\"")
FENCE = re.compile(r"^(?P<fence>`{3,}).*?^(?P=fence)\s*$", re.MULTILINE | re.DOTALL)


def slugify(title: str) -> str:
    """Reproduce GitHub's heading anchors: lowercase, drop punctuation, spaces to hyphens."""
    title = re.sub(r"<[^>]+>", "", title)
    title = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", title)
    title = title.replace("`", "").strip().lower()
    title = re.sub(r"[^\w\- ]", "", title)
    return title.replace(" ", "-")


def anchors(markdown: str) -> set[str]:
    text = FENCE.sub("", markdown)
    found: set[str] = set()
    seen: dict[str, int] = {}
    for match in HEADING.finditer(text):
        slug = slugify(match["title"])
        count = seen.get(slug, 0)
        seen[slug] = count + 1
        found.add(slug if count == 0 else f"{slug}-{count}")
    found.update(m["id"] for m in HTML_ANCHOR.finditer(text))
    return found


def markdown_files() -> list[Path]:
    return sorted(
        p for p in ROOT.rglob("*.md") if not SKIP_DIRS.intersection(p.relative_to(ROOT).parts)
    )


def main() -> int:
    cache: dict[Path, set[str]] = {}
    errors: list[str] = []
    files = markdown_files()
    for md in files:
        text = FENCE.sub("", md.read_text(encoding="utf-8"))
        for match in LINK.finditer(text):
            target = match["target"]
            if re.match(r"^[a-z]+:", target):
                continue
            path_part, _, fragment = target.partition("#")
            destination = (md.parent / path_part).resolve() if path_part else md
            where = f"{md.relative_to(ROOT)}: {target}"
            if not destination.exists():
                errors.append(f"missing file    {where}")
                continue
            if fragment and destination.suffix == ".md":
                if destination not in cache:
                    cache[destination] = anchors(destination.read_text(encoding="utf-8"))
                if fragment not in cache[destination]:
                    errors.append(f"missing anchor  {where}")

    for error in errors:
        print(error)
    if errors:
        print(f"\n{len(errors)} broken link(s).")
        return 1
    print(f"All relative links in {len(files)} Markdown files resolve.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
