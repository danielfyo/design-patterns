"""Tests for the Observer example: subscribe, notify, unsubscribe and concrete observers."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest


class Recorder:
    """An observer that records every notification it gets."""

    def __init__(self) -> None:
        self.updates: list[tuple[str, Decimal]] = []

    def update(self, symbol: str, price: Decimal) -> None:
        self.updates.append((symbol, price))


class OneShot:
    """An observer that unsubscribes itself on its first notification."""

    def __init__(self, ticker: Any) -> None:
        self.ticker = ticker
        self.calls = 0

    def update(self, symbol: str, price: Decimal) -> None:
        self.calls += 1
        self.ticker.unsubscribe(self)


def test_every_subscriber_is_notified_of_a_price_change(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    ticker = example.StockTicker()
    first, second = Recorder(), Recorder()
    ticker.subscribe(first)
    ticker.subscribe(second)

    ticker.set_price("AAPL", Decimal("195.50"))

    assert first.updates == [("AAPL", Decimal("195.50"))]
    assert second.updates == [("AAPL", Decimal("195.50"))]
    assert capsys.readouterr().out == "[ticker] AAPL = $195.50 (notifying 2 observers)\n"


def test_unsubscribe_stops_notifications(example: ModuleType) -> None:
    ticker = example.StockTicker()
    observer = Recorder()
    ticker.subscribe(observer)
    ticker.set_price("AAPL", Decimal("1"))

    ticker.unsubscribe(observer)
    ticker.set_price("AAPL", Decimal("2"))

    assert observer.updates == [("AAPL", Decimal("1"))]


def test_subscribe_returns_a_function_that_unsubscribes(example: ModuleType) -> None:
    ticker = example.StockTicker()
    observer = Recorder()
    unsubscribe = ticker.subscribe(observer)

    unsubscribe()
    unsubscribe()  # calling it twice is harmless
    ticker.set_price("AAPL", Decimal("1"))

    assert observer.updates == []


def test_observer_may_unsubscribe_while_being_notified_without_skipping_others(
    example: ModuleType,
) -> None:
    ticker = example.StockTicker()
    one_shot, recorder = OneShot(ticker), Recorder()
    ticker.subscribe(one_shot)
    ticker.subscribe(recorder)

    ticker.set_price("AAPL", Decimal("1"))
    ticker.set_price("AAPL", Decimal("2"))

    assert one_shot.calls == 1
    assert len(recorder.updates) == 2


def test_ticker_remembers_the_latest_price_of_each_symbol(example: ModuleType) -> None:
    ticker = example.StockTicker()

    ticker.set_price("AAPL", Decimal("1"))
    ticker.set_price("AAPL", Decimal("2"))

    assert ticker.get_price("AAPL") == Decimal("2")
    assert ticker.get_price("GOOG") is None


@pytest.mark.parametrize(
    ("symbol", "price", "fires"),
    [
        ("AAPL", "201.25", True),
        ("AAPL", "200.00", False),
        ("AAPL", "150", False),
        ("MSFT", "999", False),
    ],
)
def test_price_alert_fires_only_above_the_threshold_of_its_symbol(
    example: ModuleType,
    capsys: pytest.CaptureFixture[str],
    symbol: str,
    price: str,
    fires: bool,
) -> None:
    alert = example.PriceAlert("AAPL", Decimal("200"))

    alert.update(symbol, Decimal(price))

    assert ("[alert]" in capsys.readouterr().out) is fires


def test_portfolio_tracker_values_its_holdings_and_ignores_other_symbols(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    ticker = example.StockTicker()
    portfolio = example.PortfolioTracker({"AAPL": 10, "MSFT": 5})
    ticker.subscribe(portfolio)
    assert portfolio.value == 0

    ticker.set_price("AAPL", Decimal("195.50"))
    ticker.set_price("MSFT", Decimal("410.20"))
    ticker.set_price("GOOG", Decimal("172.40"))

    assert portfolio.value == Decimal("4006.00")
    assert capsys.readouterr().out.endswith("[ticker] GOOG = $172.40 (notifying 1 observers)\n")


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
