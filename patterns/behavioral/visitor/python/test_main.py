"""Tests for the Visitor example: double dispatch and each concrete visitor's rules."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest


def cart(example: ModuleType) -> list[Any]:
    return [
        example.Book("Clean Code", Decimal("32.50"), Decimal("0.80")),
        example.Electronics("Headphones", Decimal("59.90"), Decimal("0.40")),
        example.Food("Coffee beans", Decimal("12.00"), Decimal("1.50")),
        example.Electronics("Monitor", Decimal("199.00"), Decimal("5.50")),
        example.Food("Chocolate", Decimal("3.50"), Decimal("0.20")),
    ]


class KindRecorder:
    """A visitor that only records which visit method each element called."""

    def __init__(self) -> None:
        self.visits: list[str] = []

    def visit_book(self, book: Any) -> None:
        self.visits.append(f"book:{book.name}")

    def visit_electronics(self, electronics: Any) -> None:
        self.visits.append(f"electronics:{electronics.name}")

    def visit_food(self, food: Any) -> None:
        self.visits.append(f"food:{food.name}")


def visit_all(visitor: Any, items: list[Any]) -> None:
    for item in items:
        item.accept(visitor)


def test_each_element_dispatches_to_the_visit_method_of_its_own_type(
    example: ModuleType,
) -> None:
    recorder = KindRecorder()

    visit_all(recorder, cart(example))

    assert recorder.visits == [
        "book:Clean Code",
        "electronics:Headphones",
        "food:Coffee beans",
        "electronics:Monitor",
        "food:Chocolate",
    ]


@pytest.mark.parametrize(
    ("kind", "expected"), [("Book", "1.00"), ("Electronics", "5.25"), ("Food", "2.50")]
)
def test_tax_rate_depends_on_the_element_type(
    example: ModuleType, kind: str, expected: str
) -> None:
    item = getattr(example, kind)("Item", Decimal("25"), Decimal("1"))
    tax = example.TaxCalculator()

    item.accept(tax)

    assert tax.total == Decimal(expected)


def test_tax_is_rounded_half_up_per_item(example: ModuleType) -> None:
    tax = example.TaxCalculator()

    visit_all(
        tax,
        [
            example.Electronics("Headphones", Decimal("59.90"), Decimal("0.40")),
            example.Food("Chocolate", Decimal("0.05"), Decimal("0.1")),
        ],
    )

    assert tax.total == Decimal("12.58") + Decimal("0.01")


@pytest.mark.parametrize(("weight", "expected"), [("0.20", "3.00"), ("1.50", "3.75")])
def test_food_shipping_is_per_kg_with_a_minimum(
    example: ModuleType, weight: str, expected: str
) -> None:
    shipping = example.ShippingCostCalculator()

    example.Food("Food", Decimal("1"), Decimal(weight)).accept(shipping)

    assert shipping.total == Decimal(expected)


def test_shipping_uses_a_different_rule_for_each_element_type(example: ModuleType) -> None:
    shipping = example.ShippingCostCalculator()

    example.Book("B", Decimal("100"), Decimal("9")).accept(shipping)
    assert shipping.total == Decimal("1.50")
    example.Electronics("E", Decimal("100"), Decimal("5.50")).accept(shipping)

    assert shipping.total == Decimal("1.50") + Decimal("10.60")


def test_each_visitor_is_a_separate_operation_over_the_same_cart(example: ModuleType) -> None:
    items = cart(example)
    receipt = example.ReceiptPrinter()
    tax = example.TaxCalculator()
    shipping = example.ShippingCostCalculator()

    for visitor in (receipt, tax, shipping):
        visit_all(visitor, items)

    assert receipt.total == Decimal("306.90")
    assert tax.total == Decimal("57.22")
    assert shipping.total == Decimal("23.33")


def test_receipt_printer_labels_each_line_with_the_element_type(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    visit_all(
        example.ReceiptPrinter(),
        [
            example.Book("Clean Code", Decimal("32.50"), Decimal("0.80")),
            example.Food("Chocolate", Decimal("3.50"), Decimal("0.20")),
        ],
    )

    assert capsys.readouterr().out == (
        "  [Book]        Clean Code       $32.50  0.80kg\n"
        "  [Food]        Chocolate         $3.50  0.20kg\n"
    )


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
