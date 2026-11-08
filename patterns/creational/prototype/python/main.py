"""Prototype pattern: document templates that are cloned (deeply) instead of
being built from scratch.

Run with:  python3 main.py
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, field


@dataclass
class Style:
    """Nested, mutable part of a document; a shallow copy would share it."""

    font: str
    size_pt: int


@dataclass
class Document:
    """Prototype: a document that knows how to copy itself.

    clone() performs a DEEP copy, so the clone and the original never share
    mutable state.
    """

    title: str
    sections: list[str] = field(default_factory=list)
    metadata: dict[str, str] = field(default_factory=dict)
    style: Style = field(default_factory=lambda: Style("Helvetica", 10))

    def clone(self) -> Document:
        """Deep copy: copy.deepcopy recursively copies the list, dict and Style.

        A class can customise this by defining __deepcopy__(self, memo).
        """
        return copy.deepcopy(self)

    def shallow_copy(self) -> Document:
        """Shallow copy, for comparison only: copy.copy (customisable via __copy__)
        creates a new Document whose attributes point at the SAME list, dict and Style."""
        return copy.copy(self)

    def __str__(self) -> str:
        meta = ", ".join(f"{k}={v}" for k, v in sorted(self.metadata.items()))
        return (
            f"{self.title} | {self.style.font} {self.style.size_pt}pt | "
            f"sections=[{', '.join(self.sections)}] | metadata={{{meta}}}"
        )


class TemplateRegistry:
    """Prototype registry: stores named prototypes and hands out clones."""

    def __init__(self) -> None:
        self._prototypes: dict[str, Document] = {}

    @property
    def names(self) -> list[str]:
        return sorted(self._prototypes)

    def register(self, name: str, prototype: Document) -> None:
        """Stores a private clone, so later changes to the caller's object do not leak in."""
        self._prototypes[name] = prototype.clone()

    def create(self, name: str) -> Document:
        try:
            return self._prototypes[name].clone()
        except KeyError:
            raise KeyError(f'no template named "{name}"') from None


def b(value: bool) -> str:
    """Python prints True/False; the other languages print true/false."""
    return str(value).lower()


def main() -> None:
    print("=== Prototype Pattern: Document templates ===")

    registry = TemplateRegistry()
    registry.register(
        "invoice",
        Document(
            "Invoice",
            ["Header", "Line items", "Totals"],
            {"owner": "billing", "status": "template"},
            Style("Helvetica", 10),
        ),
    )
    registry.register(
        "report",
        Document(
            "Quarterly Report",
            ["Summary", "Findings", "Next steps"],
            {"owner": "analytics", "status": "template"},
            Style("Times", 12),
        ),
    )
    print(f"Registered templates: {', '.join(registry.names)}")

    print('Clone "invoice" and fill it in:')
    invoice = registry.create("invoice")
    invoice.title = "Invoice #2026-001"
    invoice.sections.append("Notes")
    invoice.metadata["client"] = "ACME Corp"
    invoice.metadata["status"] = "draft"
    invoice.style.font = "Georgia"
    invoice.style.size_pt = 11
    print(f"  {invoice}")

    print('The "invoice" prototype is untouched:')
    print(f"  {registry.create('invoice')}")

    report = registry.create("report")
    deep = report.clone()
    print("Deep clone shares nothing with its source:")
    print(
        f"  same sections: {b(deep.sections is report.sections)}, "
        f"same metadata: {b(deep.metadata is report.metadata)}, "
        f"same style: {b(deep.style is report.style)}"
    )

    print("Shallow copy (what NOT to do):")
    shallow = report.shallow_copy()
    print(
        f"  same sections: {b(shallow.sections is report.sections)}, "
        f"same metadata: {b(shallow.metadata is report.metadata)}, "
        f"same style: {b(shallow.style is report.style)}"
    )
    shallow.title = "Draft"
    shallow.sections[0] = "Cover page"
    shallow.metadata["status"] = "edited"
    shallow.style.font = "Comic Sans"
    print(f"  copy:     {shallow}")
    print(f"  original: {report}")
    print("  -> only the title stayed independent; every shared reference leaked")

    print("Unknown template:")
    try:
        registry.create("memo")
    except KeyError as err:
        print(f"  error: {err.args[0]}")


if __name__ == "__main__":
    main()
