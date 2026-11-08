"""Tests for the Bridge example: reports and renderers vary independently."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from types import ModuleType

import pytest

SALES = [
    ("North", Decimal("12500.00")),
    ("South", Decimal("8300.50")),
    ("West", Decimal("10199.50")),
]
STOCK = [("Keyboards", 42), ("Monitors", 7)]


class PlainTextRenderer:
    """A new Concrete Implementor written without touching any report."""

    name = "Plain text"

    def render_title(self, title: str) -> str:
        return title.upper()

    def render_row(self, label: str, value: str) -> str:
        return f"{label} = {value}"

    def render_footer(self, label: str, value: str) -> str:
        return f"== {label} = {value}"


def test_sales_report_renders_rows_and_grand_total_through_markdown(example: ModuleType) -> None:
    report = example.SalesReport(example.MarkdownRenderer(), SALES)

    assert report.render() == [
        "# Sales by region",
        "- **North**: 12500.00",
        "- **South**: 8300.50",
        "- **West**: 10199.50",
        "**Total: 31000.00**",
    ]


def test_inventory_report_renders_units_and_total_through_html(example: ModuleType) -> None:
    report = example.InventoryReport(example.HtmlRenderer(), STOCK)

    assert report.render() == [
        "<h1>Inventory status</h1>",
        "<p><strong>Keyboards:</strong> 42 units</p>",
        "<p><strong>Monitors:</strong> 7 units</p>",
        "<footer>Total units: 49</footer>",
    ]


def test_swapping_the_renderer_at_runtime_changes_only_the_format(example: ModuleType) -> None:
    report = example.InventoryReport(example.MarkdownRenderer(), STOCK)
    markdown = report.render()

    report.renderer = example.CsvRenderer()

    assert report.render() == [
        "report,Inventory status",
        "Keyboards,42 units",
        "Monitors,7 units",
        "Total units,49",
    ]
    assert len(report.render()) == len(markdown)


@pytest.mark.parametrize(
    ("renderer_name", "expected_title"),
    [
        ("MarkdownRenderer", "# Sales by region"),
        ("HtmlRenderer", "<h1>Sales by region</h1>"),
        ("CsvRenderer", "report,Sales by region"),
    ],
)
def test_every_renderer_works_with_the_same_report(
    example: ModuleType, renderer_name: str, expected_title: str
) -> None:
    lines = example.SalesReport(getattr(example, renderer_name)(), SALES).render()

    assert lines[0] == expected_title
    assert len(lines) == 5


def test_a_new_renderer_works_with_existing_reports_unchanged(example: ModuleType) -> None:
    renderer = PlainTextRenderer()

    assert example.SalesReport(renderer, SALES).render() == [
        "SALES BY REGION",
        "North = 12500.00",
        "South = 8300.50",
        "West = 10199.50",
        "== Total = 31000.00",
    ]
    assert example.InventoryReport(renderer, STOCK).render()[-1] == "== Total units = 49"


def test_a_new_report_works_with_existing_renderers_unchanged(example: ModuleType) -> None:
    class HeadcountReport(example.Report):  # type: ignore[misc, name-defined]
        """A new Refined Abstraction written without touching any renderer."""

        name = "Headcount report"
        title = "Headcount"

        def rows(self) -> list[tuple[str, str]]:
            return [("Engineering", "12"), ("Sales", "5")]

        def footer(self) -> tuple[str, str]:
            return ("Total", "17")

    report = HeadcountReport(example.CsvRenderer())

    assert report.render() == ["report,Headcount", "Engineering,12", "Sales,5", "Total,17"]


def test_empty_reports_still_render_a_title_and_a_zero_total(example: ModuleType) -> None:
    csv = example.CsvRenderer()

    assert example.SalesReport(csv, []).render() == ["report,Sales by region", "Total,0.00"]
    assert example.InventoryReport(csv, []).render() == ["report,Inventory status", "Total units,0"]


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
