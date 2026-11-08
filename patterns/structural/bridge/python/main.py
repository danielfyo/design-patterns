"""Bridge pattern: reports (abstraction) x renderers (implementation), varying independently.

Run with:  python3 main.py
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Protocol

Row = tuple[str, str]


class Renderer(Protocol):
    """Implementor: the low-level operations every output format must provide."""

    @property
    def name(self) -> str: ...

    def render_title(self, title: str) -> str: ...

    def render_row(self, label: str, value: str) -> str: ...

    def render_footer(self, label: str, value: str) -> str: ...


class MarkdownRenderer:
    """Concrete Implementor: Markdown output."""

    name = "Markdown"

    def render_title(self, title: str) -> str:
        return f"# {title}"

    def render_row(self, label: str, value: str) -> str:
        return f"- **{label}**: {value}"

    def render_footer(self, label: str, value: str) -> str:
        return f"**{label}: {value}**"


class HtmlRenderer:
    """Concrete Implementor: HTML output."""

    name = "HTML"

    def render_title(self, title: str) -> str:
        return f"<h1>{title}</h1>"

    def render_row(self, label: str, value: str) -> str:
        return f"<p><strong>{label}:</strong> {value}</p>"

    def render_footer(self, label: str, value: str) -> str:
        return f"<footer>{label}: {value}</footer>"


class CsvRenderer:
    """Concrete Implementor: CSV output (one label,value pair per line)."""

    name = "CSV"

    def render_title(self, title: str) -> str:
        return f"report,{title}"

    def render_row(self, label: str, value: str) -> str:
        return f"{label},{value}"

    def render_footer(self, label: str, value: str) -> str:
        return f"{label},{value}"


class Report(ABC):
    """Abstraction: knows WHAT to show and delegates HOW to draw it to its renderer.

    The ``renderer`` reference is the bridge between the two hierarchies.
    """

    name: str
    title: str

    def __init__(self, renderer: Renderer) -> None:
        self.renderer = renderer

    @abstractmethod
    def rows(self) -> list[Row]: ...

    @abstractmethod
    def footer(self) -> Row: ...

    def render(self) -> list[str]:
        """High-level operation built only from the implementor's primitives."""
        footer_label, footer_value = self.footer()
        return [
            self.renderer.render_title(self.title),
            *(self.renderer.render_row(label, value) for label, value in self.rows()),
            self.renderer.render_footer(footer_label, footer_value),
        ]


class SalesReport(Report):
    """Refined Abstraction: revenue per region with a grand total."""

    name = "Sales report"
    title = "Sales by region"

    def __init__(self, renderer: Renderer, sales: list[tuple[str, Decimal]]) -> None:
        super().__init__(renderer)
        self._sales = sales

    def rows(self) -> list[Row]:
        return [(region, f"{amount:.2f}") for region, amount in self._sales]

    def footer(self) -> Row:
        return ("Total", f"{sum(amount for _, amount in self._sales):.2f}")


class InventoryReport(Report):
    """Refined Abstraction: stock levels per product."""

    name = "Inventory report"
    title = "Inventory status"

    def __init__(self, renderer: Renderer, stock: list[tuple[str, int]]) -> None:
        super().__init__(renderer)
        self._stock = stock

    def rows(self) -> list[Row]:
        return [(product, f"{units} units") for product, units in self._stock]

    def footer(self) -> Row:
        return ("Total units", str(sum(units for _, units in self._stock)))


def main() -> None:
    print("=== Bridge Pattern: Reports x renderers ===")

    renderers: list[Renderer] = [MarkdownRenderer(), HtmlRenderer(), CsvRenderer()]
    reports: list[Report] = [
        SalesReport(
            renderers[0],
            [("North", Decimal("12500.00")), ("South", Decimal("8300.50")), ("West", Decimal("10199.50"))],
        ),
        InventoryReport(renderers[0], [("Keyboards", 42), ("Monitors", 7)]),
    ]

    # Every report works with every renderer: the two hierarchies vary independently.
    for report in reports:
        for renderer in renderers:
            report.renderer = renderer
            print(f"--- {report.name} as {renderer.name} ---")
            for line in report.render():
                print(line)

    combos = len(reports) * len(renderers)
    print(
        f"{len(reports)} reports x {len(renderers)} renderers = {combos} combinations "
        f"from {len(reports) + len(renderers)} classes (inheritance alone would need {combos})"
    )


if __name__ == "__main__":
    main()
