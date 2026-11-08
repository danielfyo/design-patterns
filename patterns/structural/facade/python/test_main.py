"""Tests for the Facade example: one call orchestrates, rolls back and reports."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

CARD = "4242 4242 4242 4242"


def create_shop(example: ModuleType) -> tuple[Any, Any]:
    inventory = example.InventoryService()
    shop = example.OrderFacade(
        inventory,
        example.PaymentService(),
        example.ShippingService(),
        example.NotificationService(),
    )
    return shop, inventory


def alice(example: ModuleType) -> Any:
    return example.Customer("Alice", "alice@example.com")


def test_successful_order_returns_total_and_tracking_and_reserves_stock(
    example: ModuleType,
) -> None:
    shop, inventory = create_shop(example)
    items = [example.OrderItem("keyboard", 2), example.OrderItem("mouse", 1)]

    result = shop.place_order(alice(example), items, CARD)

    assert result == example.OrderResult(success=True, total=Decimal("189.97"), tracking="SHP-5001")
    assert inventory.stock_of("keyboard") == 8
    assert inventory.stock_of("mouse") == 4


def test_facade_calls_the_subsystems_in_order(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    shop, _ = create_shop(example)

    shop.place_order(alice(example), [example.OrderItem("monitor", 1)], CARD)

    tags = [line.split()[0] for line in capsys.readouterr().out.splitlines()]
    assert tags == ["[inventory]", "[inventory]", "[payment]", "[shipping]", "[email]"]


def test_out_of_stock_item_rolls_back_earlier_reservations(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    shop, inventory = create_shop(example)
    items = [example.OrderItem("monitor", 1), example.OrderItem("webcam", 5)]

    result = shop.place_order(alice(example), items, CARD)

    assert not result.success
    assert result.tracking is None
    assert result.error == "webcam is out of stock (requested 5, available 3)"
    assert inventory.stock_of("monitor") == 5
    assert inventory.stock_of("webcam") == 3
    assert "released monitor x1 (rollback)" in capsys.readouterr().out


def test_failed_order_never_charges_or_ships_but_notifies_the_customer(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    shop, _ = create_shop(example)

    shop.place_order(alice(example), [example.OrderItem("webcam", 4)], CARD)

    out = capsys.readouterr().out
    assert "[payment]" not in out
    assert "[shipping]" not in out
    assert "released" not in out
    assert "[email] to alice@example.com: Order failed: webcam is out of stock" in out


def test_failed_order_does_not_consume_a_tracking_number(example: ModuleType) -> None:
    shop, _ = create_shop(example)

    shop.place_order(alice(example), [example.OrderItem("webcam", 9)], CARD)
    result = shop.place_order(alice(example), [example.OrderItem("webcam", 1)], CARD)

    assert result.tracking == "SHP-5001"


def test_consecutive_orders_share_the_subsystems_state(example: ModuleType) -> None:
    shop, inventory = create_shop(example)

    first = shop.place_order(alice(example), [example.OrderItem("webcam", 2)], CARD)
    second = shop.place_order(alice(example), [example.OrderItem("webcam", 2)], CARD)

    assert first.tracking == "SHP-5001"
    assert not second.success
    assert second.error == "webcam is out of stock (requested 2, available 1)"
    assert inventory.stock_of("webcam") == 1


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
