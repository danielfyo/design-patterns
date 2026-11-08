"""Tests for the Strategy example: each algorithm in isolation, then the context."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from types import ModuleType

import pytest

LIGHT = (Decimal("80"), Decimal("4"))
BIG = (Decimal("150"), Decimal("4"))


@pytest.mark.parametrize(
    ("strategy_name", "expected"),
    [("StandardShipping", "11.00"), ("ExpressShipping", "27.00"), ("StorePickup", "0")],
)
def test_each_strategy_prices_the_same_order_differently(
    example: ModuleType, strategy_name: str, expected: str
) -> None:
    strategy = getattr(example, strategy_name)()

    assert strategy.calculate(example.Order(*LIGHT)) == Decimal(expected)


def test_free_over_threshold_falls_back_below_the_threshold(example: ModuleType) -> None:
    strategy = example.FreeOverThresholdShipping(Decimal("100"), example.StandardShipping())

    assert strategy.calculate(example.Order(*LIGHT)) == Decimal("11.00")
    assert strategy.calculate(example.Order(*BIG)) == 0
    assert strategy.name == "Free over $100"


def test_context_delegates_to_the_strategy_swapped_at_runtime(example: ModuleType) -> None:
    calculator = example.ShippingCalculator(example.StandardShipping())
    order = example.Order(*LIGHT)
    assert calculator.quote(order) == Decimal("11.00")

    calculator.strategy = example.ExpressShipping()

    assert calculator.quote(order) == Decimal("27.00")


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
