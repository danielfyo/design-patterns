"""Tests for the State example: valid transitions, rejected actions and final states."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

SETUP: dict[str, list[str]] = {
    "Pending": [],
    "Paid": ["pay"],
    "Shipped": ["pay", "ship"],
    "Delivered": ["pay", "ship", "deliver"],
    "Cancelled": ["cancel"],
}


def order_in(example: ModuleType, state: str) -> Any:
    order = example.Order(1)
    for action in SETUP[state]:
        getattr(order, action)()
    return order


def test_new_order_starts_pending(example: ModuleType) -> None:
    order = example.Order(42)

    assert order.id == 42
    assert isinstance(order.state, example.PendingState)
    assert order.state.name == "Pending"


def test_happy_path_walks_through_every_state_until_delivered(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    order = example.Order(1)

    order.pay()
    assert isinstance(order.state, example.PaidState)
    order.ship()
    assert isinstance(order.state, example.ShippedState)
    order.deliver()

    assert isinstance(order.state, example.DeliveredState)
    assert capsys.readouterr().out == (
        "> pay()\n  Payment accepted: Pending -> Paid\n"
        "> ship()\n  Order handed to the carrier: Paid -> Shipped\n"
        "> deliver()\n  Order delivered to the customer: Shipped -> Delivered\n"
    )


@pytest.mark.parametrize(
    ("start", "note"),
    [
        ("Pending", "Order cancelled, nothing to refund"),
        ("Paid", "Order cancelled, payment refunded"),
    ],
)
def test_cancelling_before_shipping_moves_to_cancelled(
    example: ModuleType, capsys: pytest.CaptureFixture[str], start: str, note: str
) -> None:
    order = order_in(example, start)
    capsys.readouterr()

    order.cancel()

    assert isinstance(order.state, example.CancelledState)
    assert capsys.readouterr().out == f"> cancel()\n  {note}: {start} -> Cancelled\n"


@pytest.mark.parametrize(
    ("start", "action", "error"),
    [
        ("Pending", "ship", "Cannot ship an order that has not been paid"),
        ("Pending", "deliver", "Cannot deliver an order that has not been shipped"),
        ("Paid", "pay", "Order has already been paid"),
        ("Paid", "deliver", "Cannot deliver an order that has not been shipped"),
        ("Shipped", "ship", "Order has already been shipped"),
        ("Shipped", "cancel", "Cannot cancel an order that has already been shipped"),
        ("Delivered", "deliver", "Order has already been delivered"),
        ("Delivered", "cancel", "Cannot cancel a delivered order"),
        ("Cancelled", "pay", "Cannot pay for a cancelled order"),
        ("Cancelled", "cancel", "Order is already cancelled"),
    ],
)
def test_invalid_transition_is_rejected_and_the_state_is_kept(
    example: ModuleType,
    capsys: pytest.CaptureFixture[str],
    start: str,
    action: str,
    error: str,
) -> None:
    order = order_in(example, start)
    before = order.state
    capsys.readouterr()

    getattr(order, action)()

    assert order.state is before
    assert capsys.readouterr().out == f"> {action}()\n  ERROR: {error}\n"


@pytest.mark.parametrize("final", ["Delivered", "Cancelled"])
def test_final_states_reject_every_action(
    example: ModuleType, capsys: pytest.CaptureFixture[str], final: str
) -> None:
    order = order_in(example, final)
    before = order.state
    capsys.readouterr()

    for action in ("pay", "ship", "deliver", "cancel"):
        getattr(order, action)()

    assert order.state is before
    errors = [line for line in capsys.readouterr().out.splitlines() if "ERROR:" in line]
    assert len(errors) == 4


def test_same_action_behaves_differently_depending_on_the_state(example: ModuleType) -> None:
    pending = order_in(example, "Pending")
    paid = order_in(example, "Paid")

    pending.ship()
    paid.ship()

    assert isinstance(pending.state, example.PendingState)
    assert isinstance(paid.state, example.ShippedState)


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
